#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSyncOutputs,
  discoverManifestFiles,
  discoverPublicGithubRepos,
  loadManifest,
  probeLiveUrls,
  readJson,
  stableJson,
} from "./portfolio-sync-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage: node scripts/sync-portfolio.mjs [--dry-run|--check|--write] [options]

Options:
  --github-json <path>       Use an offline GitHub repository fixture.
  --manifest-root <path>     Inspect only bounded .pcgsoft/project.yml files below this root.
  --report-json <path>       Write the deterministic JSON report to this path.
  --check-live-urls          Probe approved live URLs; HTTP 200 never changes status.
  --help                     Show this help.
`);
}

function parseArgs(argv) {
  const options = { mode: "dry-run", githubJson: null, manifestRoot: null, reportJson: null, checkLiveUrls: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") return { help: true };
    if (["--dry-run", "--check", "--write"].includes(argument)) {
      const mode = argument.slice(2);
      if (options.mode !== "dry-run" && options.mode !== mode) throw new Error("choose only one of --dry-run, --check or --write");
      options.mode = mode;
      continue;
    }
    if (["--github-json", "--manifest-root", "--report-json"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      const key = { "--github-json": "githubJson", "--manifest-root": "manifestRoot", "--report-json": "reportJson" }[argument];
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
  const discovery = await discoverPublicGithubRepos({ fixture });
  const manifestRoot = options.manifestRoot ? resolveInsideRoot(options.manifestRoot, "manifest root") : null;
  const manifests = discoverManifestFiles(manifestRoot).map(loadManifest);
  const probes = options.checkLiveUrls ? await probeLiveUrls(registry) : {};
  const outputs = buildSyncOutputs({
    registry,
    discovery,
    manifests,
    probes,
    source: fixture ? "offline-fixture" : "github-public-api",
  });
  const reportJson = stableJson(outputs.report);
  if (options.reportJson) writeFile(options.reportJson, reportJson);
  if (options.mode === "write") {
    if (outputs.report.manifestErrors.length || outputs.report.discoveryErrors.length) throw new Error("refusing --write because discovery or manifest validation failed");
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
