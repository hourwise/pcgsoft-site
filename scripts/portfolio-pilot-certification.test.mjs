// AUTO-03F: certify schema v2 against the real pilot manifests and prove V1
// backward compatibility. Inputs are pinned fixtures captured read-only from
// GitHub (plus one clearly synthetic Moirae V2 equivalent).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { stableJson } from "./portfolio-sync-lib.mjs";
import { buildSyncOutputs, gitBlobSha, manifestSourcesFromFixture } from "./portfolio-reconcile.mjs";

const registryFile = path.resolve("data/projects.json");
const loadRegistry = () => JSON.parse(fs.readFileSync(registryFile, "utf8"));
const pilots = (name) => JSON.parse(fs.readFileSync(path.resolve("tests/fixtures/portfolio-sync/pilots", name), "utf8")).manifests;
const V1 = pilots("v1-pilot-manifests.json");
const V2 = pilots("v2-pilot-manifests.json");
const MOIRAE_V2_SYNTHETIC = pilots("moirae-v2-synthetic.json");
const entry = (set, repository) => set.find((item) => item.repository === repository);

// Schema-level differences a V1 -> V2 migration is expected to produce: V2 drops
// id/public/featured and can state repository.role directly. Anything else is drift.
const INTENDED_V2_DIFFERENCES = {
  "project.featured": ["NOT_PROPOSED", "(absent)"],
  "project.id": ["AGREEMENT", "(absent)"],
  "project.public": ["AGREEMENT", "(absent)"],
  "repository.role": ["(absent)", "AGREEMENT"],
};

function discovered(registry, overrides = {}) {
  const byUrl = new Map();
  for (const project of registry) {
    for (const repository of project.repositories || []) {
      if (repository.visibility !== "public") continue;
      const name = repository.url.split("/").pop();
      byUrl.set(repository.url, { name, url: repository.url, visibility: "public", archived: false, defaultBranch: "main", homepage: null, ...overrides[name] });
    }
  }
  return [...byUrl.values()];
}

function reconcile(entries, { registry = loadRegistry(), overrides = { "Reticle-systems": { homepage: "https://reticle-systems.vercel.app" } } } = {}) {
  const repositories = discovered(registry, overrides);
  const { sources, errors } = manifestSourcesFromFixture({ manifests: entries }, repositories);
  assert.deepEqual(errors, []);
  return { registry, ...buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: [] }, manifestSources: sources, source: "auto-03f-certification" }) };
}

const outcomesFor = (report, repository) => Object.fromEntries(report.fieldOutcomes.filter((item) => item.repository === repository).map((item) => [item.field, item]));
const substance = (item) => item && JSON.stringify({ outcome: item.outcome, canonicalValue: item.canonicalValue, proposedValue: item.proposedValue, detail: item.detail ?? null });

// Field-level V1/V2 comparison. sourceField is ignored: it records the schema
// spelling (project.liveUrl vs web.urls), not the claim.
export function equivalenceMatrix(v1Report, v2Report, repository) {
  const a = outcomesFor(v1Report, repository);
  const b = outcomesFor(v2Report, repository);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().map((field) => {
    const same = substance(a[field]) === substance(b[field]);
    const change = [a[field]?.outcome ?? "(absent)", b[field]?.outcome ?? "(absent)"];
    const intended = INTENDED_V2_DIFFERENCES[field];
    return { field, v1: change[0], v2: change[1], semanticDifference: !same, expected: same || Boolean(intended && intended[0] === change[0] && intended[1] === change[1]) };
  });
}

const v1Report = reconcile(V1).report;
const v2Report = reconcile([...V2, entry(V1, "Moirae-Protocol")]).report;

test("1. real V2 Reticle manifest reconciles with its genuine conflicts intact", () => {
  const fields = outcomesFor(v2Report, "Reticle-systems");
  assert.equal(entry(v2Report.manifestProvenance, "Reticle-systems").schemaVersion, 2);
  assert.equal(fields["project.status"].outcome, "AGREEMENT");
  for (const field of ["project.statusLabel", "project.summary", "web.state", "web.urls"]) assert.equal(fields[field].outcome, "CONFLICT", field);
  assert.equal(entry(v2Report.manifestProvenance, "Reticle-systems").outcome, "HUMAN_REVIEW_REQUIRED");
});

test("2. real V2 PlainSpeak manifest reconciles with aliases, status and conflicts intact", () => {
  const fields = outcomesFor(v2Report, "PlainSpeak-Next");
  assert.equal(entry(v2Report.manifestProvenance, "PlainSpeak-Next").schemaVersion, 2);
  assert.equal(fields["project.alternateNames"].outcome, "AGREEMENT");
  assert.equal(fields["project.status"].outcome, "AGREEMENT");
  assert.equal(fields["project.summary"].outcome, "CONFLICT");
  assert.equal(fields["project.statusLabel"].outcome, "CONFLICT");
  assert.equal(fields["project.relatedProjects"].outcome, "NOT_PROPOSED");
  assert.deepEqual(fields["project.relatedProjects"].canonicalValue, ["reticle"]);
});

for (const [number, repository] of [[3, "Reticle-systems"], [4, "PlainSpeak-Next"]]) {
  test(`${number}. ${repository} V1 -> V2 migration is semantically equivalent`, () => {
    const matrix = equivalenceMatrix(v1Report, v2Report, repository);
    assert.deepEqual(matrix.filter((row) => !row.expected), [], "unexpected semantic drift");
    assert.deepEqual(matrix.filter((row) => row.semanticDifference).map((row) => row.field), ["project.featured", "project.id", "project.public", "repository.role"]);
    const conflicts = (report) => report.canonicalConflicts.filter((item) => item.repository === repository).map((item) => [item.field, JSON.stringify(item.proposedValue)]);
    assert.deepEqual(conflicts(v2Report), conflicts(v1Report), "migration must neither remove nor add a conflict");
  });
}

test("5. the real Moirae V1 manifest (0c96ec5) remains supported", () => {
  const moirae = entry(V1, "Moirae-Protocol");
  assert.equal(moirae.commitSha, "0c96ec56a035594162d506a46754e2570845209a");
  assert.equal(gitBlobSha(moirae.content), "3ec548b63687994fff7e4f74b12bc4223a61415b");
  const source = entry(v2Report.manifestProvenance, "Moirae-Protocol");
  assert.deepEqual([source.schemaVersion, source.classification, source.projectId], [1, "SOURCE_IDENTITY_MATCH", "moirae-protocol"]);
  const fields = outcomesFor(v2Report, "Moirae-Protocol");
  for (const field of ["project.name", "project.category", "project.summary", "project.parentProject", "web.state"]) assert.equal(fields[field].outcome, "AGREEMENT", field);
  assert.deepEqual(fields["project.relatedProjects"].detail.agreements, ["ananke", "fates", "horae", "moirae-code", "moirae-console"]);
  assert.equal(fields["project.status"].outcome, "UNCOMPARABLE");
  assert.equal(fields["project.statusLabel"].outcome, "CONFLICT");
});

test("6. a synthetic Moirae V2 equivalent yields the same substantive findings", () => {
  const synthetic = reconcile(MOIRAE_V2_SYNTHETIC).report;
  const real = reconcile([entry(V1, "Moirae-Protocol")]).report;
  const matrix = equivalenceMatrix(real, synthetic, "Moirae-Protocol");
  assert.deepEqual(matrix.filter((row) => !row.expected), []);
  assert.equal(entry(synthetic.manifestProvenance, "Moirae-Protocol").projectId, "moirae-protocol");
  assert.deepEqual(synthetic.relationshipFindings.projectRelationships, real.relationshipFindings.projectRelationships);
  const review = (report) => report.humanApprovalRequired.map((item) => `${item.field}:${item.reason}`);
  assert.deepEqual(review(synthetic), review(real));
});

test("7. repository.role current resolves PlainSpeak lineage to one project", () => {
  const fields = outcomesFor(v2Report, "PlainSpeak-Next");
  assert.deepEqual([fields["repository.role"].outcome, fields["repository.role"].proposedValue, fields["repository.role"].canonicalValue], ["AGREEMENT", "current", ["current"]]);
  const lineage = v2Report.relationshipFindings.lineage.find((item) => item.projectId === "plain-speak");
  assert.deepEqual(lineage.repositories.map((item) => [item.repository, item.canonicalRole, item.manifest]), [["PlainSpeak-Next", "current", "SOURCE_IDENTITY_MATCH"], ["Project-PlainSpeak", "original", "NO_MANIFEST"]]);
  assert.equal(loadRegistry().filter((project) => /plain/i.test(project.slug)).length, 1);
});

test("8. repository.role primary agrees for Reticle and a wrong role would conflict", () => {
  assert.equal(outcomesFor(v2Report, "Reticle-systems")["repository.role"].outcome, "AGREEMENT");
  const reticle = entry(V2, "Reticle-systems");
  const wrong = reticle.content.replace("role: primary", "role: current");
  const report = reconcile([{ ...reticle, blobSha: gitBlobSha(wrong), content: wrong }]).report;
  assert.equal(outcomesFor(report, "Reticle-systems")["repository.role"].outcome, "CONFLICT");
});

test("9. V2 web.urls proposes the Vercel URL as an addition against canonical liveUrls", () => {
  const urls = outcomesFor(v2Report, "Reticle-systems")["web.urls"];
  assert.deepEqual([urls.canonicalValue, urls.detail.additions, urls.detail.removals], [[], ["https://reticle-systems.vercel.app"], []]);
  const conflict = v2Report.canonicalConflicts.find((item) => item.repository === "Reticle-systems" && item.field === "web.urls");
  assert.deepEqual(conflict.evidence.map((item) => [item.authority, item.value]), [["GITHUB_METADATA", "https://reticle-systems.vercel.app"]]);
});

test("10. V2 web.state preview stays a proposal with no publication authority", () => {
  const fileBefore = fs.readFileSync(registryFile);
  const { registry, report } = reconcile([...V2, entry(V1, "Moirae-Protocol")]);
  const state = outcomesFor(report, "Reticle-systems")["web.state"];
  assert.deepEqual([state.outcome, state.canonicalValue, state.proposedValue], ["CONFLICT", "none", "preview"]);
  assert.ok(report.humanApprovalRequired.some((item) => item.field === "web.state" && item.decision === "HUMAN_REVIEW_REQUIRED"));
  const reticle = registry.find((project) => project.slug === "reticle");
  assert.deepEqual([reticle.liveUrls, reticle.websiteState ?? null], [[], null]);
  assert.deepEqual(registry, loadRegistry());
  assert.ok(fs.readFileSync(registryFile).equals(fileBefore));
});

test("11. no V2 field bypasses provenance", () => {
  const reticle = entry(V2, "Reticle-systems");
  const hosted = reconcile([{ ...reticle, repository: "PlainSpeak-Next" }]).report;
  assert.equal(entry(hosted.manifestProvenance, "PlainSpeak-Next").classification, "MANIFEST_PROJECT_MISMATCH");
  assert.deepEqual(hosted.fieldOutcomes, []);
  const tampered = reconcile([{ ...reticle, content: reticle.content.replace("state: preview", "state: live") }]).report;
  assert.equal(tampered.provenanceWarnings[0].issue, "SOURCE_INTEGRITY_FAILURE");
  assert.deepEqual(tampered.fieldOutcomes, []);
});

test("12. pilot reconciliation reports are deterministic, including shuffled input order", () => {
  const inputs = [...V2, entry(V1, "Moirae-Protocol")];
  const first = reconcile(inputs);
  const second = reconcile(inputs);
  assert.equal(stableJson(first.report), stableJson(second.report));
  assert.equal(first.markdown, second.markdown);
  const registry = loadRegistry();
  const repositories = discovered(registry, { "Reticle-systems": { homepage: "https://reticle-systems.vercel.app" } }).reverse();
  const shuffled = manifestSourcesFromFixture({ manifests: [...inputs].reverse() }, repositories).sources.reverse();
  const reordered = buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: [] }, manifestSources: shuffled, source: "auto-03f-certification" });
  assert.equal(stableJson(reordered.report), stableJson(first.report));
});
