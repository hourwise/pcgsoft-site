import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  classifyRepositories,
  discoverPublicGithubRepos,
  extractBoundedReadmeSections,
  loadManifest,
  parseSafeYaml,
  validateManifest,
} from "./portfolio-sync-lib.mjs";
import { buildPublic } from "./build-public.mjs";
import { buildSyncOutputs, gitBlobSha, manifestSourcesFromFixture } from "./portfolio-reconcile.mjs";

const fixtureRoot = path.resolve("tests/fixtures/portfolio-sync");
const fixture = (name) => path.join(fixtureRoot, name);

test("valid manifest parses and validates controlled enums", () => {
  const record = loadManifest(fixture("valid-project.yml"));
  assert.deepEqual(record.errors, []);
  assert.equal(record.manifest.project.status, "active-development");
  assert.equal(record.manifest.project.websiteState, "planned");
});

test("malformed and unknown-key manifests fail closed", () => {
  assert.ok(loadManifest(fixture("malformed-project.yml")).errors.length > 0);
  assert.match(loadManifest(fixture("unknown-field.yml")).errors[0], /not an allowed field/);
  assert.match(loadManifest(fixture("unsafe-project.yml")).errors[0], /unsafe script-like/);
  assert.throws(() => parseSafeYaml(`schemaVersion: 1\n${"x".repeat(24_001)}`), /24KB/);
  assert.throws(() => validateManifest({ schemaVersion: 1, project: { status: "not-a-status" } }), /status must be one of/);
});

test("README extraction is bounded, marked and non-executable", () => {
  const readme = fs.readFileSync(fixture("readme-markers.md"), "utf8");
  const extracted = extractBoundedReadmeSections(readme);
  assert.deepEqual(Object.keys(extracted.sections).sort(), ["overview", "status-notes"]);
  assert.equal(extracted.errors.length, 0);
  assert.doesNotMatch(extracted.sections.overview, /<|>/);
  const malformed = extractBoundedReadmeSections(fs.readFileSync(fixture("readme-malformed.md"), "utf8"));
  assert.match(malformed.errors[0], /incomplete/);
  assert.equal(extractBoundedReadmeSections("ordinary README").missingMarkers, true);
});

test("GitHub adapter keeps only safe public metadata and withholds private repositories", async () => {
  const result = await discoverPublicGithubRepos({ fixture: JSON.parse(fs.readFileSync(fixture("github-known.json"), "utf8")) });
  assert.deepEqual(result.repositories.map((repo) => repo.name), ["Archived-Public-Project", "Moirae-Protocol", "Unknown-Public-Project"]);
  assert.equal(result.privateSeen, 1);
  assert.equal(result.repositories.find((repo) => repo.name === "Moirae-Protocol").latestDefaultBranchCommit.sha.length, 40);
  assert.equal(result.repositories.find((repo) => repo.name === "Archived-Public-Project").archived, true);
});

test("unknown public repositories are quarantined", () => {
  const registry = [{ slug: "known", name: "Known", repositories: [{ url: "https://github.com/hourwise/Known", visibility: "public", role: "primary" }] }];
  const discovery = { complete: true, repositories: [
    { name: "Known", url: "https://github.com/hourwise/Known", visibility: "public", defaultBranch: "main", archived: false },
    { name: "Unknown", url: "https://github.com/hourwise/Unknown", visibility: "public", defaultBranch: "main", archived: false },
  ], privateSeen: 0, errors: [] };
  const result = classifyRepositories(discovery.repositories, registry, discovery.complete);
  assert.equal(result.pendingReview[0].classification, "PENDING_REVIEW");
  assert.equal(result.pendingReview[0].repository, "Unknown");
  assert.equal(result.visibilityWarnings.length, 0);
});

test("missing expected public source raises a high privacy warning without leaking its URL", () => {
  const privateUrl = "https://github.com/hourwise/Former-Public-Source";
  const registry = [{ slug: "private-project", name: "Private Project", repositories: [{ url: privateUrl, visibility: "public", role: "primary" }] }];
  const result = buildSyncOutputs({ registry, discovery: { complete: true, repositories: [], privateSeen: 1, errors: [] } });
  assert.equal(result.report.privacyVisibilityWarnings[0].severity, "HIGH");
  assert.doesNotMatch(JSON.stringify(result.report), /Former-Public-Source/);
  assert.doesNotMatch(JSON.stringify(result.snapshot), /Former-Public-Source/);
});

const knownRepository = { name: "Known", url: "https://github.com/hourwise/Known", visibility: "public", archived: false };
const pinnedManifest = (content) => manifestSourcesFromFixture({ manifests: [{ repository: "Known", commitSha: "a".repeat(40), path: ".pcgsoft/project.yml", blobSha: gitBlobSha(content), content }] }, [knownRepository]).sources;

test("manifest proposals conflict with canonical state instead of overriding it", () => {
  const registry = [{ slug: "known", name: "Known", category: "products", summary: "Canonical", featured: false, repositories: [{ url: knownRepository.url, visibility: "public", role: "primary" }], relatedProjects: [] }];
  const before = structuredClone(registry);
  const content = "schemaVersion: 1\nproject:\n  slug: known\n  name: Known\n  summary: Proposed\n  featured: true\n";
  const result = buildSyncOutputs({ registry, discovery: { complete: true, repositories: [knownRepository], privateSeen: 0, errors: [] }, manifestSources: pinnedManifest(content) });
  assert.deepEqual(result.report.canonicalConflicts.map((item) => item.field), ["project.featured", "project.summary"]);
  assert.deepEqual(registry, before);
  assert.equal(result.report.hasMaterialDrift, true);
  assert.equal(result.report.result, "PROPOSED_CHANGES");
});

test("manifest relationship targets are reviewable when absent from the registry", () => {
  const registry = [{ slug: "known", name: "Known", repositories: [{ url: knownRepository.url, visibility: "public", role: "primary" }], relatedProjects: [] }];
  const content = "schemaVersion: 1\nproject:\n  slug: known\n  relatedProjects:\n    - missing-project\n";
  const result = buildSyncOutputs({ registry, discovery: { complete: true, repositories: [knownRepository], privateSeen: 0, errors: [] }, manifestSources: pinnedManifest(content) });
  assert.deepEqual(result.report.relationshipFindings.projectRelationships[0].unknownTargets, ["missing-project"]);
  assert.equal(result.report.canonicalConflicts.find((item) => item.field === "project.relatedProjects").action, "HUMAN_REVIEW_REQUIRED");
});

test("relationship graph supports component and lineage relationships", () => {
  const registry = [
    { slug: "fates", name: "The Fates", repositories: [] },
    { slug: "ananke", name: "Ananke", parentProject: "fates", repositories: [{ url: "https://github.com/hourwise/Ananke", visibility: "public", role: "component" }] },
    { slug: "plain-speak", name: "PlainSpeak", repositories: [
      { url: "https://github.com/hourwise/PlainSpeak", visibility: "public", role: "original" },
      { url: "https://github.com/hourwise/PlainSpeak-Next", visibility: "public", role: "current" },
    ] },
  ];
  const result = buildSyncOutputs({ registry, discovery: { complete: true, repositories: [], privateSeen: 0, errors: [] } });
  assert.equal(result.report.relationshipWarnings.length, 0);
});

test("live URL evidence raises review anomalies without changing status", () => {
  const registry = [{ slug: "planned", name: "Planned", websiteState: "planned", liveUrls: ["https://planned.example/"], repositories: [], relatedProjects: [] }];
  const result = buildSyncOutputs({ registry, discovery: { complete: true, repositories: [], privateSeen: 0, errors: [] }, probes: { "https://planned.example/": { status: 200 } } });
  assert.equal(result.report.liveSurfaceAnomalies[0].issue, "LIVE_SURFACE_DETECTED_STATUS_REVIEW_REQUIRED");
  assert.equal(registry[0].websiteState, "planned");
});

test("source evidence can raise a status review without changing canonical status", () => {
  const registry = [{ slug: "live-project", name: "Live Project", status: "Live", repositories: [{ url: "https://github.com/hourwise/Live-Project", visibility: "public", role: "primary" }] }];
  const discovery = { complete: true, repositories: [{ name: "Live-Project", url: "https://github.com/hourwise/Live-Project", visibility: "public", archived: false, description: "An early development prototype" }], privateSeen: 0, errors: [] };
  const result = buildSyncOutputs({ registry, discovery });
  assert.equal(result.report.statusAnomalies[0].issue, "LIVE_STATUS_SOURCE_SOUNDS_EARLY_STAGE");
  assert.equal(registry[0].status, "Live");
});

test("same inputs produce byte-stable output and stable ordering", () => {
  const registry = [{ slug: "known", name: "Known", repositories: [] }];
  const discovery = { complete: true, repositories: [
    { name: "Zulu", url: "https://github.com/hourwise/Zulu", visibility: "public", archived: false },
    { name: "Alpha", url: "https://github.com/hourwise/Alpha", visibility: "public", archived: false },
  ], privateSeen: 0, errors: [] };
  const first = buildSyncOutputs({ registry, discovery });
  const second = buildSyncOutputs({ registry, discovery });
  assert.deepEqual(first.snapshot, second.snapshot);
  assert.deepEqual(first.report, second.report);
  assert.equal(first.snapshot.repositories[0].name, "Alpha");
  assert.equal(first.report.result, "PROPOSED_CHANGES");
});

test("PENDING_REVIEW repositories never become registry records, routes, sitemap entries or llms.txt entries", async () => {
  const registry = JSON.parse(fs.readFileSync("data/projects.json", "utf8"));
  const before = structuredClone(registry);
  const discovery = await discoverPublicGithubRepos({ fixture: JSON.parse(fs.readFileSync(fixture("github-known.json"), "utf8")) });
  const result = buildSyncOutputs({ registry, discovery });
  const pending = result.report.newProjectsPendingReview.find((item) => item.repository === "Unknown-Public-Project");
  assert.equal(pending?.classification, "PENDING_REVIEW");
  assert.deepEqual(registry, before);
  assert.equal(registry.some((project) => /unknown-public-project/i.test(`${project.slug} ${project.name} ${JSON.stringify(project.repositories)}`)), false);
  const outDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pcgsoft-pending-")), "public");
  buildPublic({ outDir });
  const publicFiles = (function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
  })(outDir);
  assert.equal(publicFiles.some((file) => /unknown-public-project/i.test(file)), false);
  for (const file of ["sitemap.xml", "llms.txt", "data/projects.json"]) assert.doesNotMatch(fs.readFileSync(path.join(outDir, file), "utf8"), /Unknown-Public-Project/i);
  assert.equal(publicFiles.filter((file) => file.endsWith(".html")).some((file) => /Unknown-Public-Project/i.test(fs.readFileSync(file, "utf8"))), false);
});

test("private source with a public link raises a HIGH warning without exposing the source or deleting the identity", () => {
  const registry = JSON.parse(fs.readFileSync(fixture("registry-private-source.json"), "utf8"));
  const before = structuredClone(registry);
  const discovery = { complete: true, repositories: [
    { name: "Public-Project", url: "https://github.com/hourwise/Public-Project", visibility: "public", defaultBranch: "main", archived: false },
  ], privateSeen: 1, errors: [] };
  const result = buildSyncOutputs({ registry, discovery });
  const warning = result.report.privacyVisibilityWarnings.find((item) => item.issue === "PRIVATE_SOURCE_HAS_PUBLIC_LINK");
  assert.equal(warning?.severity, "HIGH");
  assert.equal(warning?.projectId, "private-identity");
  for (const output of [JSON.stringify(result.report), JSON.stringify(result.snapshot), result.markdown]) assert.doesNotMatch(output, /Private-Implementation/);
  assert.deepEqual(registry, before);
  assert.ok(registry.some((project) => project.slug === "private-identity"));
  assert.equal(result.report.result, "PROPOSED_CHANGES");
});

test("lineage relationship roles classify as project lineage", () => {
  const registry = [{ slug: "plain-speak", name: "PlainSpeak", repositories: [
    { url: "https://github.com/hourwise/PlainSpeak", visibility: "public", role: "lineage/original" },
    { url: "https://github.com/hourwise/PlainSpeak-Next", visibility: "public", role: "current" },
  ] }];
  const repositories = registry[0].repositories.map((item) => ({ name: item.url.split("/").pop(), url: item.url, visibility: "public", archived: false }));
  const result = classifyRepositories(repositories, registry);
  assert.deepEqual(result.known.map((item) => item.classification), ["PROJECT_LINEAGE", "PROJECT_LINEAGE"]);
});
