import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSyncOutputs, gitBlobSha } from "./portfolio-reconcile.mjs";
import { discoverPublicGithubRepos } from "./portfolio-sync-lib.mjs";
import { reviewDecision, stableReviewEvidence } from "./portfolio-review-evidence.mjs";
import { compareReview, readReviewBaseline, REVIEW_BRANCH } from "./compare-portfolio-review.mjs";

const OLD = "85ccb3834d4562728472237c2b92f4be2a300420";
const NEW = "5a75678a3b447c882aa31d6baa5ea3eb0f19772a";
const PREFIX_OLD = "b35796d2f3e35266afd011ee4114fbe60ddfe2bb";
const PREFIX_NEW = "3d15ef8cbde0b11955ee4310621ad53b5044ec4d";
const registry = [{ slug: "plain-speak", name: "Plain Speak", summary: "Canonical summary", repositories: [
  { url: "https://github.com/hourwise/PlainSpeak-Next", visibility: "public", role: "current" },
], relatedProjects: [], liveUrls: [] }];
const repo = (name, sha) => ({ name, url: `https://github.com/hourwise/${name}`, visibility: "public", archived: false,
  defaultBranch: "main", defaultBranchState: "RESOLVED", homepage: null, latestDefaultBranchCommit: { sha, date: "2026-09-26T08:32:24Z" } });
const manifest = "schemaVersion: 1\nproject:\n  slug: plain-speak\n  name: Plain Speak\n  summary: A proposed summary\n";

function inputs({ sha = OLD, prefixSha = PREFIX_OLD, content, pinned = false } = {}) {
  const repositories = [repo("PlainSpeak-Next", sha), repo("Prefixity", prefixSha)];
  const sources = repositories.map((repository) => ({ repository: repository.name, repositoryUrl: repository.url, repositoryId: null,
    commitSha: repository.latestDefaultBranchCommit.sha, path: ".pcgsoft/project.yml", blobSha: null,
    ref: "default-branch-head", sourceKind: "github-api", state: "NO_MANIFEST", integrity: null, content: null }));
  if (content) Object.assign(sources[0], { content, blobSha: gitBlobSha(content), state: "MANIFEST_FOUND", integrity: "VERIFIED", ref: pinned ? "pinned-override" : "default-branch-head" });
  return { registry: structuredClone(registry), discovery: { complete: true, repositories, privateSeen: 0, errors: [] }, manifestSources: sources, source: "github-public-api" };
}
const run = (options) => buildSyncOutputs(inputs(options));
const differs = (a, b) => assert.notEqual(stableReviewEvidence(a), stableReviewEvidence(b));

test("HEAD-only PlainSpeak and pending Prefixity churn leaves stable bytes identical", () => {
  const before = run();
  const after = run({ sha: NEW, prefixSha: PREFIX_NEW });
  assert.equal(stableReviewEvidence(before), stableReviewEvidence(after));
  assert.equal(reviewDecision(after, before).changed, false);
});

test("commit date alone is observational; release dates remain material", () => {
  const before = run(); const after = structuredClone(before);
  after.snapshot.repositories[0].latestDefaultBranchCommit.date = "2099-01-01T00:00:00Z";
  assert.equal(stableReviewEvidence(before), stableReviewEvidence(after));
  after.snapshot.repositories[0].latestRelease = { tag: "v1", date: "2099-01-01T00:00:00Z" };
  differs(before, after);
});

test("new Prefixity discovery and its pending-review entry remain material", () => {
  const old = inputs(); old.discovery.repositories.pop(); old.manifestSources.pop();
  const before = buildSyncOutputs(old); const after = run();
  assert.equal(before.report.newProjectsPendingReview.length, 0);
  assert.equal(after.report.newProjectsPendingReview[0].repository, "Prefixity");
  assert.equal(reviewDecision(after, before).changed, true);
});

test("a pending-review finding changing on its own remains material", () => {
  const before = run(); const after = structuredClone(before);
  after.report.newProjectsPendingReview[0].reason = "human review required for changed evidence";
  differs(before, after);
});

test("public source disappearance is material without disclosing private names", async () => {
  const fixture = { repositories: [{ name: "PlainSpeak-Next", html_url: registry[0].repositories[0].url, private: true }] };
  const discovery = await discoverPublicGithubRepos({ fixture });
  const after = buildSyncOutputs({ registry, discovery });
  differs(run(), after);
  assert.doesNotMatch(stableReviewEvidence(after), /PlainSpeak-Next/);
  assert.ok(after.report.privacyVisibilityWarnings.length);
});

test("visibility field changes are never normalized away", () => {
  const before = run(); const after = structuredClone(before);
  after.snapshot.repositories[0].visibility = "private";
  differs(before, after);
});

test("archive-state changes remain material", () => {
  const changed = inputs(); changed.discovery.repositories[0].archived = true;
  differs(run(), buildSyncOutputs(changed));
});

test("homepage evidence changes remain material", () => {
  const changed = inputs(); changed.discovery.repositories[0].homepage = "https://plain.example/";
  const after = buildSyncOutputs(changed);
  assert.equal(after.report.githubMetadataEvidence[0].relation, "NOT_IN_CANONICAL_LIVE_URLS");
  differs(run(), after);
});

test("manifest appearance and disappearance remain material", () => differs(run(), run({ content: manifest })));
test("manifest blob/content/proposal changes remain material", () => differs(run({ content: manifest }), run({ content: manifest + "  featured: true\n" })));

test("eligible verified same-blob manifest HEAD churn leaves stable evidence identical", () => {
  const before = run({ content: manifest }); const after = run({ sha: NEW, content: manifest });
  assert.equal(before.report.manifestProvenance[0].classification, "SOURCE_IDENTITY_MATCH");
  assert.equal(stableReviewEvidence(before), stableReviewEvidence(after));
  assert.equal(after.report.manifestProvenance[0].commitSha, NEW);
  assert.equal(after.report.manifestProvenance[0].blobSha, gitBlobSha(manifest));
});

test("explicit pinned commit changes remain material even with the same blob", () => {
  differs(run({ content: manifest, pinned: true }), run({ sha: NEW, content: manifest, pinned: true }));
});

test("integrity failure and unverified source commits cannot be suppressed", () => {
  const bad = inputs({ content: manifest }); bad.manifestSources[0].integrity = "MISMATCH";
  const before = buildSyncOutputs(bad);
  assert.equal(before.report.manifestProvenance[0].classification, "SOURCE_INTEGRITY_FAILURE");
  differs(run({ content: manifest }), before);
  bad.manifestSources[0].commitSha = NEW;
  differs(before, buildSyncOutputs(bad));
});

test("manifest source repository identity is material", () => {
  const before = run({ content: manifest }); const after = structuredClone(before);
  after.snapshot.manifestSources[0].repositoryId = 12345;
  differs(before, after);
});

test("canonical mapping and source eligibility changes remain material", () => {
  const changed = inputs({ content: manifest }); changed.registry[0].repositories[0].role = "component";
  const after = buildSyncOutputs(changed);
  assert.equal(after.report.governanceFindings[0].issue, "MANIFEST_SOURCE_INELIGIBLE");
  differs(run({ content: manifest }), after);
});

test("governance finding changes remain material", () => {
  const before = run(); const after = structuredClone(before);
  after.report.governanceFindings.push({ issue: "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", projectId: "plain-speak" });
  differs(before, after);
});

test("canonical conflict/agreement changes remain material", () => {
  const changed = inputs({ content: manifest }); changed.registry[0].summary = "A proposed summary";
  differs(run({ content: manifest }), buildSyncOutputs(changed));
});

for (const key of ["relationshipWarnings", "provenanceWarnings", "privacyVisibilityWarnings", "discoveryErrors", "manifestErrors"]) {
  test(`${key} appearance and disappearance remain material`, () => {
    const before = run(); const after = structuredClone(before); after.report[key].push({ issue: "CHANGED" }); differs(before, after);
  });
}

test("empty repository state remains material", () => {
  const changed = inputs(); changed.discovery.repositories[0].defaultBranchState = "EMPTY_REPOSITORY";
  changed.discovery.repositories[0].latestDefaultBranchCommit = null;
  Object.assign(changed.manifestSources[0], { state: "EMPTY_REPOSITORY", commitSha: null });
  differs(run(), buildSyncOutputs(changed));
});

test("shuffled discovery, manifest, report, and object-key ordering gives identical stable bytes", () => {
  const before = run({ content: manifest }); const shuffled = inputs({ content: manifest });
  shuffled.discovery.repositories.reverse(); shuffled.manifestSources.reverse(); shuffled.registry.reverse();
  const after = buildSyncOutputs(shuffled);
  after.report.autoDerivedSafeFacts.repositories.reverse(); after.snapshot.repositories.reverse();
  after.report = Object.fromEntries(Object.entries(after.report).reverse());
  assert.equal(stableReviewEvidence(before), stableReviewEvidence(after));
});

test("normalization never rewrites raw evidence or erases SHA-shaped manifest payload values", () => {
  const before = run({ sha: NEW, content: manifest }); const copy = structuredClone(before);
  stableReviewEvidence(before); assert.deepEqual(before, copy);
  const after = structuredClone(before);
  after.report.manifestProposals[0].fields["project.summary"] = NEW;
  const next = structuredClone(after); next.report.manifestProposals[0].fields["project.summary"] = OLD;
  differs(after, next);
  assert.equal(before.snapshot.repositories.find((r) => r.name === "PlainSpeak-Next").latestDefaultBranchCommit.sha, NEW);
});

test("unknown evidence fields and ordered payload arrays remain material", () => {
  const before = run(); const after = structuredClone(before); after.report.futureGovernanceRule = "new"; differs(before, after);
  const a = run({ content: manifest }); const b = structuredClone(a);
  a.report.manifestProposals[0].fields.ordered = ["a", "b"]; b.report.manifestProposals[0].fields.ordered = ["b", "a"]; differs(a, b);
});

const pull = { number: 7, head: { ref: REVIEW_BRANCH, sha: "c".repeat(40), repo: { full_name: "hourwise/pcgsoft-site" } }, base: { ref: "main" } };
function api(previous, pulls = [pull], requests = []) {
  return async (url, options) => {
    assert.equal(options.method, undefined, "every API call is a GET"); requests.push(url);
    const value = url.includes("/pulls?") ? pulls : url.includes("github-portfolio-snapshot") ? previous.snapshot : previous.report;
    return { ok: true, json: async () => structuredClone(value) };
  };
}

test("no open PR bootstraps delivery; it cannot silently suppress a missing review", async () => {
  const baseline = await readReviewBaseline({ repository: "hourwise/pcgsoft-site", token: "test", fetchImpl: api(null, []) });
  assert.equal(reviewDecision(run(), baseline.previous).changed, true);
});

test("comparison integration preserves PR #7 identity and emits false for HEAD-only churn", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pcgsoft-review-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "data/generated"), { recursive: true });
  const current = run({ sha: NEW, prefixSha: PREFIX_NEW });
  fs.writeFileSync(path.join(directory, "data/generated/github-portfolio-snapshot.json"), JSON.stringify(current.snapshot));
  fs.writeFileSync(path.join(directory, "data/generated/portfolio-sync-report.json"), JSON.stringify(current.report));
  const requests = [];
  const env = { GITHUB_REPOSITORY: "hourwise/pcgsoft-site", GITHUB_TOKEN: "test", GITHUB_OUTPUT: path.join(directory, "output"), GITHUB_STEP_SUMMARY: path.join(directory, "summary") };
  const result = await compareReview({ directory, env, fetchImpl: api(run(), [pull], requests) });
  assert.equal(result.changed, false); assert.equal(result.number, 7); assert.equal(result.head, pull.head.sha);
  assert.match(fs.readFileSync(env.GITHUB_OUTPUT, "utf8"), /^changed=false\nnumber=7\n/);
  assert.ok(requests.slice(1).every((url) => url.endsWith(`?ref=${pull.head.sha}`)));
  assert.equal(fs.readFileSync(path.join(directory, "data/generated/portfolio-review-evidence.json"), "utf8"), stableReviewEvidence(current));
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "data/generated/github-portfolio-snapshot.json"))).repositories.find((r) => r.name === "PlainSpeak-Next").latestDefaultBranchCommit.sha, NEW);
});

test("API failures, duplicate PRs, invalid identities and unsupported schemas fail closed", async () => {
  const options = { repository: "hourwise/pcgsoft-site", token: "test" };
  await assert.rejects(readReviewBaseline({ ...options, fetchImpl: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
  await assert.rejects(readReviewBaseline({ ...options, fetchImpl: api(run(), [pull, pull]) }), /ambiguous/);
  await assert.rejects(readReviewBaseline({ ...options, fetchImpl: api(run(), [{ ...pull, head: { ...pull.head, ref: "other" } }]) }), /invalid/);
  assert.throws(() => stableReviewEvidence({ snapshot: {}, report: {} }), /refusing/);
});
