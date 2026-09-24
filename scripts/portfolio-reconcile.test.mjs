import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { stableJson } from "./portfolio-sync-lib.mjs";
import {
  buildSyncOutputs,
  deriveCanonicalLifecycle,
  discoverManifests,
  gitBlobSha,
  manifestSourcesFromFixture,
  reconcileFields,
} from "./portfolio-reconcile.mjs";

const registryFile = path.resolve("data/projects.json");
const loadRegistry = () => JSON.parse(fs.readFileSync(registryFile, "utf8"));
const v2Fixture = (name) => fs.readFileSync(path.resolve("tests/fixtures/portfolio-sync/v2", name), "utf8");
const commit = (seed) => seed.repeat(40).slice(0, 40);

// Every public repository the canonical registry maps, as GitHub discovery would report it.
function discoveredFrom(registry, extra = []) {
  const byUrl = new Map();
  for (const project of registry) {
    for (const repository of project.repositories || []) {
      if (repository.visibility !== "public") continue;
      byUrl.set(repository.url, { name: repository.url.split("/").pop(), url: repository.url, visibility: "public", archived: false, defaultBranch: "main", homepage: null });
    }
  }
  for (const repository of extra) byUrl.set(repository.url, { visibility: "public", archived: false, defaultBranch: "main", homepage: null, ...repository });
  return [...byUrl.values()];
}

function run({ manifests = {}, registry = loadRegistry(), extraRepositories = [] } = {}) {
  const repositories = discoveredFrom(registry, extraRepositories);
  const entries = Object.entries(manifests).map(([repository, content], index) => ({
    repository,
    commitSha: commit(String(index + 1)),
    path: ".pcgsoft/project.yml",
    blobSha: gitBlobSha(content),
    content,
  }));
  const { sources, errors } = manifestSourcesFromFixture({ manifests: entries }, repositories);
  assert.deepEqual(errors, []);
  const discovery = { complete: true, repositories, privateSeen: 0, errors: [] };
  return { registry, ...buildSyncOutputs({ registry, discovery, manifestSources: sources, source: "test" }) };
}

const outcome = (report, projectId, field) => report.fieldOutcomes.find((item) => item.projectId === projectId && item.field === field);
const provenance = (report, repository) => report.manifestProvenance.find((item) => item.repository === repository);

test("1. a manifest from the canonically mapped repository resolves to its project", () => {
  const { report } = run({ manifests: { "Moirae-Protocol": v2Fixture("moirae-protocol.yml") } });
  const source = provenance(report, "Moirae-Protocol");
  assert.equal(source.classification, "SOURCE_IDENTITY_MATCH");
  assert.equal(source.projectId, "moirae-protocol");
  assert.equal(source.integrity, "VERIFIED");
  assert.match(source.commitSha, /^[0-9a-f]{40}$/);
  assert.equal(source.outcome, "NO_CANONICAL_CHANGE_PROPOSED");
});

test("2. a repository cannot propose for another project by naming its slug", () => {
  // Reticle-systems publishes a manifest claiming to be Moirae Protocol.
  const { report, registry } = run({ manifests: { "Reticle-systems": v2Fixture("moirae-protocol.yml") } });
  const source = provenance(report, "Reticle-systems");
  assert.equal(source.classification, "MANIFEST_PROJECT_MISMATCH");
  assert.equal(source.outcome, "REJECTED");
  assert.equal(report.provenanceWarnings[0].issue, "MANIFEST_PROJECT_MISMATCH");
  assert.equal(report.provenanceWarnings[0].severity, "HIGH");
  assert.deepEqual(report.provenanceWarnings[0].sourceProjects, ["reticle"]);
  assert.equal(report.fieldOutcomes.length, 0);
  assert.equal(report.canonicalConflicts.length, 0);
  assert.equal(registry.find((project) => project.slug === "moirae-protocol").summary, loadRegistry().find((project) => project.slug === "moirae-protocol").summary);
});

test("3. a manifest in an unmapped repository is pending review, not reconciled", () => {
  const { report } = run({
    manifests: { "Unmapped-Repository": v2Fixture("moirae-protocol.yml") },
    extraRepositories: [{ name: "Unmapped-Repository", url: "https://github.com/hourwise/Unmapped-Repository" }],
  });
  assert.equal(provenance(report, "Unmapped-Repository").classification, "SOURCE_NOT_CANONICALLY_MAPPED");
  const pending = report.newProjectsPendingReview.filter((item) => item.repository === "Unmapped-Repository");
  assert.deepEqual(pending.map((item) => item.reason).sort(), ["SOURCE_NOT_CANONICALLY_MAPPED", "public repository is not represented in approved project/source mappings"]);
  assert.equal(report.fieldOutcomes.length, 0);
});

test("4. a repository without a manifest is a normal NO_MANIFEST state", () => {
  const { report } = run();
  assert.ok(report.autoDerivedSafeFacts.repositories.every((item) => item.manifest === "NO_MANIFEST"));
  assert.deepEqual(report.manifestProvenance, []);
  assert.deepEqual(report.manifestErrors, []);
  assert.equal(report.result, "NO_CHANGE");
});

test("5. an invalid manifest is rejected with an explicit error", () => {
  const { report } = run({ manifests: { "Moirae-Protocol": "schemaVersion: 2\nproject:\n  slug: moirae-protocol\n  status: shipped\n" } });
  assert.equal(provenance(report, "Moirae-Protocol").classification, "MANIFEST_INVALID");
  assert.match(report.manifestErrors[0].error, /status must be one of/);
  assert.equal(report.manifestErrors[0].commitSha.length, 40);
  assert.equal(report.fieldOutcomes.length, 0);
});

test("6. malformed or unknown schema versions are rejected", () => {
  for (const version of ["3", "two", "\"2\""]) {
    const { report } = run({ manifests: { "Moirae-Protocol": `schemaVersion: ${version}\nproject:\n  slug: moirae-protocol\n` } });
    assert.equal(provenance(report, "Moirae-Protocol").classification, "MANIFEST_INVALID", `schemaVersion ${version}`);
    assert.match(report.manifestErrors[0].error, /schemaVersion must be one of 1, 2/);
  }
});

test("7. status agreement is detected through the canonical lifecycle mapping", () => {
  const { report } = run({ manifests: { "PlainSpeak-Next": v2Fixture("plainspeak-next.yml") } });
  const status = outcome(report, "plain-speak", "project.status");
  assert.equal(status.outcome, "AGREEMENT");
  assert.equal(status.canonicalValue, "active-development");
});

test("8. status conflicts and unmappable canonical labels are explicit, never silent agreement", () => {
  const conflicting = v2Fixture("reticle-systems.yml").replace("status: active-development", "status: prototype");
  const { report } = run({ manifests: { "Reticle-systems": conflicting, "Moirae-Protocol": `${v2Fixture("moirae-protocol.yml")}`.replace("  category: open-source\n", "  category: open-source\n  status: prototype\n") } });
  assert.equal(outcome(report, "reticle", "project.status").outcome, "CONFLICT");
  assert.equal(outcome(report, "moirae-protocol", "project.status").outcome, "UNCOMPARABLE");
  assert.ok(report.humanApprovalRequired.some((item) => item.projectId === "moirae-protocol" && item.reason === "UNCOMPARABLE"));
  assert.equal(deriveCanonicalLifecycle("Early development"), null);
  assert.equal(deriveCanonicalLifecycle("Active V1 development — public launch pending"), "active-development");
});

test("9. web-state agreement", () => {
  const { report } = run({ manifests: { "Moirae-Protocol": v2Fixture("moirae-protocol.yml") } });
  assert.equal(outcome(report, "moirae-protocol", "web.state").outcome, "AGREEMENT");
});

test("10. web-state conflict keeps a proposed preview as a proposal", () => {
  const { report } = run({ manifests: { "Reticle-systems": v2Fixture("reticle-systems.yml") } });
  const state = outcome(report, "reticle", "web.state");
  assert.deepEqual([state.outcome, state.canonicalValue, state.proposedValue], ["CONFLICT", "none", "preview"]);
});

test("11. URL-list agreement is structural against canonical liveUrls", () => {
  const manifest = "schemaVersion: 2\nproject:\n  slug: the-trace-manifest\nweb:\n  state: live\n  urls:\n    - https://www.thetracemanifest.com/\n";
  const { report } = run({ manifests: { "The-Trace-Manifest": manifest } });
  assert.equal(outcome(report, "the-trace-manifest", "web.urls").outcome, "AGREEMENT");
  assert.equal(outcome(report, "the-trace-manifest", "web.state").outcome, "AGREEMENT");
});

test("12. URL-list conflict reports additions without publishing them", () => {
  const { report, registry } = run({ manifests: { "Reticle-systems": v2Fixture("reticle-systems.yml") } });
  const urls = outcome(report, "reticle", "web.urls");
  assert.equal(urls.outcome, "CONFLICT");
  assert.deepEqual(urls.detail.additions, ["https://reticle-systems.vercel.app"]);
  assert.deepEqual(registry.find((project) => project.slug === "reticle").liveUrls, []);
});

test("13. alternate names are reconciled as aliases and never create a project", () => {
  const { report } = run({ manifests: { "PlainSpeak-Next": v2Fixture("plainspeak-next.yml") } });
  assert.equal(outcome(report, "plain-speak", "project.alternateNames").outcome, "AGREEMENT");
  const renamed = v2Fixture("plainspeak-next.yml").replace("    - PlainSpeak Next", "    - PlainSpeak Next\n    - PlainSpeak Classic");
  const second = run({ manifests: { "PlainSpeak-Next": renamed } }).report;
  const names = outcome(second, "plain-speak", "project.alternateNames");
  assert.equal(names.outcome, "CONFLICT");
  assert.deepEqual(names.detail.additions, ["PlainSpeak Classic"]);
  assert.equal(second.newProjectsPendingReview.some((item) => /plain/i.test(`${item.repository} ${item.declaredProject}`)), false);
});

test("14. related-project agreement", () => {
  const { report } = run({ manifests: { "Moirae-Protocol": v2Fixture("moirae-protocol.yml") } });
  const related = outcome(report, "moirae-protocol", "project.relatedProjects");
  assert.equal(related.outcome, "AGREEMENT");
  assert.deepEqual(related.detail.agreements, ["ananke", "fates", "horae", "moirae-code", "moirae-console"]);
});

test("15. related-project additions and removals are reported, not applied", () => {
  const changed = v2Fixture("moirae-protocol.yml").replace("    - horae\n    - moirae-console\n    - moirae-code\n", "    - mnemosyne\n");
  const { report, registry } = run({ manifests: { "Moirae-Protocol": changed } });
  const related = outcome(report, "moirae-protocol", "project.relatedProjects");
  assert.equal(related.outcome, "CONFLICT");
  assert.deepEqual(related.detail.additions, ["mnemosyne"]);
  assert.deepEqual(related.detail.removals, ["horae", "moirae-code", "moirae-console"]);
  assert.deepEqual(registry.find((project) => project.slug === "moirae-protocol").relatedProjects, ["fates", "ananke", "horae", "moirae-console", "moirae-code"]);
});

test("16. current/original repository roles reconcile against canonical lineage", () => {
  const { report } = run({ manifests: { "PlainSpeak-Next": v2Fixture("plainspeak-next.yml") } });
  assert.equal(outcome(report, "plain-speak", "repository.role").outcome, "AGREEMENT");
  const wrongRole = run({ manifests: { "PlainSpeak-Next": v2Fixture("plainspeak-next.yml").replace("role: current", "role: original") } }).report;
  const role = outcome(wrongRole, "plain-speak", "repository.role");
  assert.deepEqual([role.outcome, role.canonicalValue, role.proposedValue], ["CONFLICT", ["current"], "original"]);
  const lineage = report.relationshipFindings.lineage.find((item) => item.projectId === "plain-speak");
  assert.deepEqual(lineage.repositories.map((item) => [item.repository, item.canonicalRole]), [["PlainSpeak-Next", "current"], ["Project-PlainSpeak", "original"]]);
});

test("17. two repositories resolve to one project", () => {
  const original = v2Fixture("plainspeak-next.yml").replace("role: current", "role: original");
  const { report } = run({ manifests: { "PlainSpeak-Next": v2Fixture("plainspeak-next.yml"), "Project-PlainSpeak": original } });
  const resolved = report.manifestProvenance.map((item) => [item.repository, item.classification, item.projectId]);
  assert.deepEqual(resolved, [["PlainSpeak-Next", "SOURCE_IDENTITY_MATCH", "plain-speak"], ["Project-PlainSpeak", "SOURCE_IDENTITY_MATCH", "plain-speak"]]);
  assert.equal(outcome(report, "plain-speak", "repository.role").outcome, "AGREEMENT");
});

test("18. lineage and aliases never create a duplicate project", () => {
  const before = loadRegistry();
  const { report, registry } = run({ manifests: { "PlainSpeak-Next": v2Fixture("plainspeak-next.yml"), "Project-PlainSpeak": v2Fixture("plainspeak-next.yml").replace("role: current", "role: original") } });
  assert.equal(registry.length, before.length);
  assert.equal(registry.filter((project) => /plain/i.test(project.slug)).length, 1);
  assert.equal(new Set(report.manifestProvenance.map((item) => item.projectId)).size, 1);
  assert.equal(report.newProjectsPendingReview.length, 0);
});

test("19. unsupported fields are surfaced explicitly instead of disappearing", () => {
  const canonical = loadRegistry().find((project) => project.slug === "moirae-protocol");
  const outcomes = reconcileFields({ model: { "project.slug": { value: "moirae-protocol", sourceField: "project.slug" }, "project.mascot": { value: "owl", sourceField: "project.mascot" } }, schemaVersion: 2, canonical, context: { canonicalRoles: ["primary"], knownSlugs: new Set() } });
  assert.equal(outcomes.find((item) => item.field === "project.mascot").outcome, "UNSUPPORTED_FIELD");
  const { report } = run({ manifests: { "Moirae-Protocol": "schemaVersion: 2\nproject:\n  slug: moirae-protocol\n  mascot: owl\n" } });
  assert.match(report.manifestErrors[0].error, /manifest\.project\.mascot is not an allowed field/);
});

test("20. GitHub metadata is evidence and never becomes canonical", () => {
  const registry = loadRegistry();
  const repositories = discoveredFrom(registry).map((repository) => repository.name === "Reticle-systems" ? { ...repository, homepage: "https://reticle-systems.vercel.app" } : repository);
  const without = buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: [] } }).report;
  assert.deepEqual(without.githubMetadataEvidence.map((item) => [item.projectId, item.relation, item.authority]), [["reticle", "NOT_IN_CANONICAL_LIVE_URLS", "GITHUB_METADATA"]]);
  assert.equal(without.canonicalConflicts.length, 0);
  assert.deepEqual(registry.find((project) => project.slug === "reticle").liveUrls, []);
  const { sources } = manifestSourcesFromFixture({ manifests: [{ repository: "Reticle-systems", commitSha: commit("9"), path: ".pcgsoft/project.yml", blobSha: gitBlobSha(v2Fixture("reticle-systems.yml")), content: v2Fixture("reticle-systems.yml") }] }, repositories);
  const withManifest = buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: [] }, manifestSources: sources }).report;
  const conflict = withManifest.canonicalConflicts.find((item) => item.field === "web.urls");
  assert.deepEqual(conflict.evidence.map((item) => item.authority), ["GITHUB_METADATA"]);
  assert.equal(conflict.action, "HUMAN_REVIEW_REQUIRED");
});

test("21. manifest proposals never mutate canonical records or the registry file", () => {
  const fileBefore = fs.readFileSync(registryFile);
  const before = loadRegistry();
  const { registry, report } = run({ manifests: {
    "Moirae-Protocol": v2Fixture("moirae-protocol.yml"),
    "Reticle-systems": v2Fixture("reticle-systems.yml"),
    "PlainSpeak-Next": v2Fixture("plainspeak-next.yml"),
  } });
  assert.ok(report.canonicalConflicts.length > 0);
  assert.deepEqual(registry, before);
  assert.ok(fs.readFileSync(registryFile).equals(fileBefore));
});

test("22. reconciliation output is deterministic for the same pinned inputs", () => {
  const manifests = { "Moirae-Protocol": v2Fixture("moirae-protocol.yml"), "Reticle-systems": v2Fixture("reticle-systems.yml"), "PlainSpeak-Next": v2Fixture("plainspeak-next.yml") };
  const first = run({ manifests });
  const second = run({ manifests });
  assert.equal(stableJson(first.report), stableJson(second.report));
  assert.equal(stableJson(first.snapshot), stableJson(second.snapshot));
  assert.equal(first.markdown, second.markdown);
  const registry = loadRegistry();
  const repositories = discoveredFrom(registry);
  const entries = Object.entries(manifests).map(([repository, content], index) => ({ repository, commitSha: commit(String(index + 1)), path: ".pcgsoft/project.yml", blobSha: gitBlobSha(content), content }));
  const shuffled = manifestSourcesFromFixture({ manifests: [...entries].reverse() }, [...repositories].reverse()).sources.reverse();
  const reordered = buildSyncOutputs({ registry, discovery: { complete: true, repositories: [...repositories].reverse(), privateSeen: 0, errors: [] }, manifestSources: shuffled, source: "test" });
  assert.equal(stableJson(reordered.report), stableJson(first.report));
  assert.doesNotMatch(stableJson(first.report), /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

test("manifest content that does not match its blob SHA is rejected", () => {
  const registry = loadRegistry();
  const repositories = discoveredFrom(registry);
  const { sources } = manifestSourcesFromFixture({ manifests: [{ repository: "Moirae-Protocol", commitSha: commit("7"), path: ".pcgsoft/project.yml", blobSha: gitBlobSha("something else"), content: v2Fixture("moirae-protocol.yml") }] }, repositories);
  const { report } = buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: [] }, manifestSources: sources });
  assert.equal(report.provenanceWarnings[0].issue, "SOURCE_INTEGRITY_FAILURE");
  assert.equal(report.fieldOutcomes.length, 0);
});

test("GitHub manifest adapter reads the manifest at a pinned commit SHA and verifies the blob", async () => {
  const content = v2Fixture("moirae-protocol.yml");
  const headSha = commit("b");
  const pinnedSha = commit("c");
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    const respond = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
    if (url.endsWith(`/commits/${pinnedSha}`)) return respond(200, { sha: pinnedSha });
    if (url.includes("/Moirae-Protocol/contents/.pcgsoft/project.yml")) return respond(200, { type: "file", encoding: "base64", size: content.length, sha: gitBlobSha(content), content: Buffer.from(content).toString("base64") });
    return respond(404, null);
  };
  const repositories = [
    { name: "Moirae-Protocol", url: "https://github.com/hourwise/Moirae-Protocol", id: 1, latestDefaultBranchCommit: { sha: headSha } },
    { name: "No-Manifest", url: "https://github.com/hourwise/No-Manifest", id: 2, latestDefaultBranchCommit: { sha: headSha } },
    { name: "Unpinned", url: "https://github.com/hourwise/Unpinned", id: 3 },
  ];
  const result = await discoverManifests({ repositories, refOverrides: { "Moirae-Protocol": pinnedSha }, fetchImpl, token: null });
  const byName = Object.fromEntries(result.sources.map((source) => [source.repository, source]));
  assert.deepEqual([byName["Moirae-Protocol"].state, byName["Moirae-Protocol"].integrity, byName["Moirae-Protocol"].commitSha, byName["Moirae-Protocol"].ref], ["MANIFEST_FOUND", "VERIFIED", pinnedSha, "pinned-override"]);
  assert.ok(requested.some((url) => url.endsWith(`contents/.pcgsoft/project.yml?ref=${pinnedSha}`)));
  assert.equal(byName["No-Manifest"].state, "NO_MANIFEST");
  assert.ok(requested.some((url) => url.includes(`No-Manifest/contents/.pcgsoft/project.yml?ref=${headSha}`)));
  assert.equal(byName.Unpinned.state, "MANIFEST_SOURCE_ERROR");
  assert.match(result.errors[0].error, /floating branch/);
  const rejected = await discoverManifests({ repositories, refOverrides: { "Moirae-Protocol": "main" }, fetchImpl, token: null });
  assert.match(rejected.errors[0].error, /40-character commit SHA/);
});
