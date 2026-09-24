#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverPublicGithubRepos,
  probeLiveUrls,
  readJson,
  stableJson,
} from "./portfolio-sync-lib.mjs";
import { buildSyncOutputs, discoverManifests, manifestSourcesFromFixture } from "./portfolio-reconcile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage: node scripts/sync-portfolio.mjs [--dry-run|--check|--write] [options]

Options:
  --github-json <path>       Use an offline GitHub repository fixture.
  --manifest-fixture <path>  Use offline pinned manifests (requires --github-json).
  --manifest-ref <repo>=<sha>
                             Read .pcgsoft/project.yml from this exact commit
                             instead of the default-branch head (repeatable).
  --report-json <path>       Write the deterministic JSON report to this path.
  --check-live-urls          Probe approved live URLs; HTTP 200 never changes status.
  --help                     Show this help.
`);
}

function parseArgs(argv) {
  const options = { mode: "dry-run", githubJson: null, manifestFixture: null, manifestRefs: {}, reportJson: null, checkLiveUrls: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") return { help: true };
    if (["--dry-run", "--check", "--write"].includes(argument)) {
      const mode = argument.slice(2);
      if (options.mode !== "dry-run" && options.mode !== mode) throw new Error("choose only one of --dry-run, --check or --write");
      options.mode = mode;
      continue;
    }
    if (argument === "--manifest-ref") {
      const value = argv[index + 1] || "";
      const match = value.match(/^([A-Za-z0-9._-]+)=([0-9a-f]{40})$/);
      if (!match) throw new Error("--manifest-ref requires <repository>=<40-character commit SHA>");
      if (options.manifestRefs[match[1]]) throw new Error(`--manifest-ref given twice for ${match[1]}`);
      options.manifestRefs[match[1]] = match[2];
      index += 1;
      continue;
    }
    if (["--github-json", "--manifest-fixture", "--report-json"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      const key = { "--github-json": "githubJson", "--manifest-fixture": "manifestFixture", "--report-json": "reportJson" }[argument];
      options[key] = value;
      index += 1;
      continue;
    }
    if (argument === "--check-live-urls") {
      options.checkLiveUrls = true;
      continue;
    }
    throw new Error(`unknown option ${argument}`);
  }
  return options;
}

function resolveInsideRoot(input, label) {
  const resolved = path.resolve(root, input);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`${label} must remain inside the pcgsoft-site checkout`);
  return resolved;
}

function writeFile(relativeOrAbsolute, contents) {
  const destination = path.isAbsolute(relativeOrAbsolute) ? resolveInsideRoot(relativeOrAbsolute, "output path") : resolveInsideRoot(relativeOrAbsolute, "output path");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const registry = readJson(path.join(root, "data", "projects.json"));
  const fixture = options.githubJson ? readJson(resolveInsideRoot(options.githubJson, "GitHub fixture path")) : undefined;
  if (options.manifestFixture && !fixture) throw new Error("--manifest-fixture requires --github-json");
  if (fixture && Object.keys(options.manifestRefs).length) throw new Error("--manifest-ref reads live GitHub and cannot be combined with --github-json");
  const discovery = await discoverPublicGithubRepos({ fixture });
  const manifestDiscovery = fixture
    ? (options.manifestFixture ? manifestSourcesFromFixture(readJson(resolveInsideRoot(options.manifestFixture, "manifest fixture path")), discovery.repositories) : { sources: [], errors: [] })
    : await discoverManifests({ repositories: discovery.repositories, refOverrides: options.manifestRefs });
  const probes = options.checkLiveUrls ? await probeLiveUrls(registry) : {};
  const outputs = buildSyncOutputs({
    registry,
    discovery: { ...discovery, errors: [...(discovery.errors || []), ...manifestDiscovery.errors] },
    manifestSources: manifestDiscovery.sources,
    probes,
    source: fixture ? "offline-fixture" : "github-public-api",
  });
  const reportJson = stableJson(outputs.report);
  if (options.reportJson) writeFile(options.reportJson, reportJson);
  if (options.mode === "write") {
    // An invalid manifest in one repository is a per-manifest finding and must
    // not suppress review of every other repository; discovery failures still block.
    if (outputs.report.discoveryErrors.length) throw new Error("refusing --write because discovery failed");
    writeFile("data/generated/github-portfolio-snapshot.json", stableJson(outputs.snapshot));
    writeFile("data/generated/portfolio-sync-report.json", reportJson);
    writeFile("docs/portfolio-sync/portfolio-sync-report.md", outputs.markdown);
  }
  console.log(outputs.markdown);
  if (options.mode === "check" && outputs.report.hasMaterialDrift) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`portfolio sync failed: ${error.message}`);
  process.exitCode = 1;
});
