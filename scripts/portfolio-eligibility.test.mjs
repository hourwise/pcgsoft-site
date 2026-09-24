// AUTO-04B: manifest source eligibility (canonical primary/current only) and
// empty-repository robustness.
import assert from "node:assert/strict";
import test from "node:test";
import { discoverPublicGithubRepos, stableJson } from "./portfolio-sync-lib.mjs";
import { buildSyncOutputs, discoverManifests, gitBlobSha, manifestSourcesFromFixture, writeRefusalReason } from "./portfolio-reconcile.mjs";

const url = (name) => `https://github.com/hourwise/${name}`;
const repo = (name, role) => ({ name, url: url(name), visibility: "public", role });
const project = (slug, repositories, extra = {}) => ({ slug, name: slug, category: "open-source", status: "Active development", summary: `${slug} summary`, liveUrls: [], relatedProjects: [], parentProject: null, repositories, ...extra });
const manifest = (slug, extra = "") => `schemaVersion: 2\nproject:\n  slug: ${slug}\n  summary: "Proposed ${slug} summary"\n${extra}`;
const sha = (seed) => String(seed).repeat(40).slice(0, 40);

function discovered(registry, { empty = [], extra = [] } = {}) {
  const byUrl = new Map();
  for (const item of registry) for (const repository of item.repositories) byUrl.set(repository.url, { name: repository.name, url: repository.url, visibility: "public", archived: false, defaultBranch: "main", homepage: null, defaultBranchState: empty.includes(repository.name) ? "EMPTY_REPOSITORY" : "RESOLVED" });
  for (const name of extra) byUrl.set(url(name), { name, url: url(name), visibility: "public", archived: false, defaultBranch: "main", homepage: null, defaultBranchState: empty.includes(name) ? "EMPTY_REPOSITORY" : "RESOLVED" });
  return [...byUrl.values()];
}

function run(registry, manifests = {}, options = {}) {
  const repositories = options.repositories || discovered(registry, options);
  const entries = Object.entries(manifests).map(([repository, content], index) => ({ repository, commitSha: sha(index + 1), path: ".pcgsoft/project.yml", blobSha: gitBlobSha(content), content }));
  const { sources, errors } = manifestSourcesFromFixture({ manifests: entries }, repositories);
  assert.deepEqual(errors, []);
  return buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: options.discoveryErrors || [] }, manifestSources: sources, source: "auto-04b-test" }).report;
}

const classification = (report, repository) => report.manifestProvenance.find((item) => item.repository === repository)?.classification;
const eligibilityOf = (report, projectId) => report.manifestSourceEligibility.projects.find((item) => item.projectId === projectId);
const finding = (report, issue, projectId) => report.governanceFindings.find((item) => item.issue === issue && item.projectId === projectId);

test("1. a canonical primary repository's manifest is reconciled", () => {
  const report = run([project("alpha", [repo("Alpha", "primary")])], { Alpha: manifest("alpha") });
  assert.equal(classification(report, "Alpha"), "SOURCE_IDENTITY_MATCH");
  assert.ok(report.fieldOutcomes.some((item) => item.repository === "Alpha" && item.field === "project.summary" && item.outcome === "CONFLICT"));
});

test("2. a canonical current repository's manifest is reconciled", () => {
  const report = run([project("alpha", [repo("Alpha-Next", "current"), repo("Alpha-Old", "original")])], { "Alpha-Next": manifest("alpha") });
  assert.equal(classification(report, "Alpha-Next"), "SOURCE_IDENTITY_MATCH");
  assert.equal(eligibilityOf(report, "alpha").state, "SINGLE_ELIGIBLE_SOURCE");
});

for (const [number, role, label] of [[3, "original", "original"], [4, "component", "component"], [5, "companion", "supporting (companion)"]]) {
  test(`${number}. a canonical ${label} repository's manifest is reported ineligible and not reconciled`, () => {
    const report = run([project("alpha", [repo("Alpha", "primary"), repo("Alpha-Extra", role)])], { "Alpha-Extra": manifest("alpha") });
    assert.equal(classification(report, "Alpha-Extra"), "MANIFEST_SOURCE_INELIGIBLE");
    assert.deepEqual(finding(report, "MANIFEST_SOURCE_INELIGIBLE", "alpha").canonicalRoles, [role]);
    assert.equal(report.fieldOutcomes.length, 0);
    assert.equal(report.canonicalConflicts.length, 0);
    assert.ok(report.humanApprovalRequired.some((item) => item.reason === "MANIFEST_SOURCE_INELIGIBLE" && item.repository === "Alpha-Extra"));
    assert.equal(report.manifestProvenance.find((item) => item.repository === "Alpha-Extra").blobSha.length, 40);
  });
}

test("6. a manifest claiming repository.role primary cannot override an ineligible canonical role", () => {
  const report = run([project("alpha", [repo("Alpha", "primary"), repo("Alpha-Docs", "companion")])], { "Alpha-Docs": manifest("alpha", "repository:\n  role: primary\n") });
  assert.equal(classification(report, "Alpha-Docs"), "MANIFEST_SOURCE_INELIGIBLE");
  const item = finding(report, "MANIFEST_SOURCE_INELIGIBLE", "alpha");
  assert.deepEqual([item.canonicalRoles, item.proposedRole], [["companion"], "primary"]);
  assert.equal(report.fieldOutcomes.length, 0);
});

test("7. a project with zero eligible repositories is valid and non-blocking", () => {
  const report = run([project("fates-like", [repo("Integration", "integration")]), project("no-repo", [])]);
  assert.equal(eligibilityOf(report, "fates-like").state, "NO_ELIGIBLE_SOURCE");
  assert.equal(eligibilityOf(report, "no-repo").state, "NO_ELIGIBLE_SOURCE");
  assert.deepEqual(report.governanceFindings, []);
  assert.deepEqual(report.humanApprovalRequired, []);
  assert.equal(writeRefusalReason(report), null);
  assert.equal(report.result, "NO_CHANGE");
});

test("8. two canonical primary repositories are flagged as a duplicate eligible source", () => {
  const report = run([project("alpha", [repo("Alpha-A", "primary"), repo("Alpha-B", "primary")])]);
  const item = finding(report, "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "alpha");
  assert.deepEqual(item.eligibleRepositories, [{ repository: "Alpha-A", role: "primary" }, { repository: "Alpha-B", role: "primary" }]);
  assert.equal(eligibilityOf(report, "alpha").state, "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE");
});

test("9. primary plus current in one project is flagged", () => {
  const report = run([project("alpha", [repo("Alpha", "primary"), repo("Alpha-Next", "current")])]);
  assert.ok(finding(report, "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "alpha"));
  assert.ok(report.humanApprovalRequired.some((item) => item.reason === "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE" && item.projectId === "alpha"));
});

test("10. duplicate eligibility is detected with no manifests at all", () => {
  const report = run([project("alpha", [repo("Alpha", "primary"), repo("Alpha-Next", "current")])]);
  assert.deepEqual(report.manifestProvenance, []);
  assert.deepEqual(finding(report, "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "alpha").repositoriesWithManifests, []);
  assert.equal(report.result, "PROPOSED_CHANGES");
});

test("11. duplicate eligible repositories get no arbitrary precedence", () => {
  const registry = [project("alpha", [repo("Alpha", "primary"), repo("Alpha-Next", "current")])];
  const manifests = { Alpha: manifest("alpha"), "Alpha-Next": manifest("alpha", "repository:\n  role: current\n") };
  const report = run(registry, manifests);
  assert.deepEqual(report.manifestProvenance.map((item) => [item.repository, item.classification, item.outcome]), [["Alpha", "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "NOT_RECONCILED"], ["Alpha-Next", "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "NOT_RECONCILED"]]);
  assert.deepEqual(report.fieldOutcomes, []);
  assert.deepEqual(finding(report, "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "alpha").repositoriesWithManifests, ["Alpha", "Alpha-Next"]);
  const reversed = run([project("alpha", [...registry[0].repositories].reverse())], manifests, { repositories: discovered(registry).reverse() });
  assert.equal(stableJson(reversed.governanceFindings), stableJson(report.governanceFindings));
  assert.equal(stableJson(reversed.fieldOutcomes), "[]\n");
});

test("12. eligible current plus ineligible original lineage resolves to one project", () => {
  const report = run([project("plain", [repo("Plain-Old", "original"), repo("Plain-Next", "current")])], { "Plain-Next": manifest("plain") });
  assert.equal(classification(report, "Plain-Next"), "SOURCE_IDENTITY_MATCH");
  const lineage = report.relationshipFindings.lineage.find((item) => item.projectId === "plain");
  assert.deepEqual(lineage.repositories.map((item) => [item.repository, item.canonicalRole, item.eligibleManifestSource]), [["Plain-Next", "current", true], ["Plain-Old", "original", false]]);
});

test("13. an ineligible lineage manifest creates no duplicate project", () => {
  const registry = [project("plain", [repo("Plain-Old", "original"), repo("Plain-Next", "current")])];
  const before = structuredClone(registry);
  const report = run(registry, { "Plain-Old": manifest("plain"), "Plain-Next": manifest("plain") });
  assert.equal(classification(report, "Plain-Old"), "MANIFEST_SOURCE_INELIGIBLE");
  assert.equal(classification(report, "Plain-Next"), "SOURCE_IDENTITY_MATCH");
  assert.deepEqual(report.newProjectsPendingReview, []);
  assert.deepEqual(registry, before);
  assert.deepEqual([...new Set(report.manifestProvenance.map((item) => item.projectId))], ["plain"]);
});

test("14. an empty public repository is a normal per-repository state", () => {
  const registry = [project("alpha", [repo("Alpha", "primary")])];
  const report = run(registry, {}, { empty: ["Alpha"] });
  assert.deepEqual(report.autoDerivedSafeFacts.emptyRepositories, ["Alpha"]);
  const facts = report.autoDerivedSafeFacts.repositories.find((item) => item.repository === "Alpha");
  assert.deepEqual([facts.manifest, facts.defaultBranchState, facts.defaultBranchSha, facts.manifestCommitSha], ["EMPTY_REPOSITORY", "EMPTY_REPOSITORY", null, null]);
  assert.deepEqual([report.discoveryErrors, report.manifestErrors, report.humanApprovalRequired], [[], [], []]);
  assert.equal(report.result, "NO_CHANGE");
});

function fakeGithub({ commits = {}, contents = {} }) {
  const requested = [];
  const respond = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
  const fetchImpl = async (target) => {
    requested.push(target);
    if (target.includes("/users/hourwise/repos")) return respond(200, Object.keys(commits).map((name, index) => ({ id: index + 1, name, html_url: url(name), visibility: "public", private: false, default_branch: "main" })));
    const commitMatch = target.match(/repos\/hourwise\/([^/]+)\/commits\?/);
    if (commitMatch) return commits[commitMatch[1]]();
    const contentMatch = target.match(/repos\/hourwise\/([^/]+)\/contents\//);
    if (contentMatch) return (contents[contentMatch[1]] || (() => respond(404, null)))();
    return respond(404, null);
  };
  return { fetchImpl, requested, respond };
}

test("15. an empty repository triggers no manifest retrieval", async () => {
  const respond = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
  const github = fakeGithub({ commits: { Empty: () => respond(409, { message: "Git Repository is empty." }), Full: () => respond(200, [{ sha: sha("f") }]) } });
  const discovery = await discoverPublicGithubRepos({ fetchImpl: github.fetchImpl, token: null });
  assert.deepEqual(discovery.errors, []);
  assert.deepEqual(discovery.repositories.map((item) => [item.name, item.defaultBranchState]), [["Empty", "EMPTY_REPOSITORY"], ["Full", "RESOLVED"]]);
  const manifests = await discoverManifests({ repositories: discovery.repositories, fetchImpl: github.fetchImpl, token: null });
  assert.deepEqual(manifests.errors, []);
  assert.equal(manifests.sources.find((item) => item.repository === "Empty").state, "EMPTY_REPOSITORY");
  assert.equal(github.requested.some((target) => target.includes("/Empty/contents/")), false);
  assert.ok(github.requested.some((target) => target.includes(`/Full/contents/.pcgsoft/project.yml?ref=${sha("f")}`)));
});

test("16. an empty repository does not block --write", () => {
  const report = run([project("alpha", [repo("Alpha", "primary")])], {}, { empty: ["Alpha"] });
  assert.equal(writeRefusalReason(report), null);
  // Without any manifest input (for example --github-json alone) it is still reported as empty.
  const registry = [project("alpha", [repo("Alpha", "primary")])];
  const bare = buildSyncOutputs({ registry, discovery: { complete: true, repositories: discovered(registry, { empty: ["Alpha"] }), privateSeen: 0, errors: [] } }).report;
  assert.deepEqual([bare.autoDerivedSafeFacts.emptyRepositories, bare.autoDerivedSafeFacts.repositories[0].manifest], [["Alpha"], "EMPTY_REPOSITORY"]);
  assert.equal(writeRefusalReason(bare), null);
});

test("17. an empty repository does not block unrelated reconciliation", () => {
  const registry = [project("alpha", [repo("Alpha", "primary")]), project("beta", [repo("Beta", "primary")])];
  const report = run(registry, { Beta: manifest("beta") }, { empty: ["Alpha"] });
  assert.equal(classification(report, "Alpha"), "EMPTY_REPOSITORY");
  assert.equal(classification(report, "Beta"), "SOURCE_IDENTITY_MATCH");
  assert.ok(report.fieldOutcomes.some((item) => item.repository === "Beta"));
});

test("18. genuine GitHub failures remain discovery errors that block --write", async () => {
  const respond = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
  for (const [label, failing] of [["HTTP 500", () => respond(500, null)], ["HTTP 403", () => respond(403, null)], ["malformed", () => respond(200, { unexpected: true })]]) {
    const github = fakeGithub({ commits: { Broken: failing, Full: () => respond(200, [{ sha: sha("f") }]) } });
    const discovery = await discoverPublicGithubRepos({ fetchImpl: github.fetchImpl, token: null });
    assert.equal(discovery.errors.length, 1, label);
    assert.equal(discovery.repositories.find((item) => item.name === "Broken").defaultBranchState, "NOT_RESOLVED", label);
    const manifests = await discoverManifests({ repositories: discovery.repositories, fetchImpl: github.fetchImpl, token: null });
    assert.equal(manifests.sources.find((item) => item.repository === "Broken").state, "MANIFEST_SOURCE_ERROR", label);
    const report = buildSyncOutputs({ registry: [], discovery: { ...discovery, errors: [...discovery.errors, ...manifests.errors] }, manifestSources: manifests.sources }).report;
    assert.match(writeRefusalReason(report), /discovery failed/, label);
  }
  const github = fakeGithub({ commits: { Full: () => ({ status: 200, ok: true, json: async () => [{ sha: sha("f") }] }) }, contents: { Full: () => ({ status: 502, ok: false, json: async () => null }) } });
  const discovery = await discoverPublicGithubRepos({ fetchImpl: github.fetchImpl, token: null });
  const manifests = await discoverManifests({ repositories: discovery.repositories, fetchImpl: github.fetchImpl, token: null });
  assert.match(manifests.errors[0].error, /HTTP 502/);
});

test("19. NO_MANIFEST remains a normal state", () => {
  const report = run([project("alpha", [repo("Alpha", "primary")])]);
  assert.equal(report.autoDerivedSafeFacts.repositories[0].manifest, "NO_MANIFEST");
  assert.deepEqual([report.manifestErrors, report.governanceFindings], [[], []]);
  assert.equal(report.result, "NO_CHANGE");
});

test("20. cross-project impersonation is rejected before eligibility is considered", () => {
  const registry = [project("alpha", [repo("Alpha", "primary")]), project("beta", [repo("Beta", "primary"), repo("Beta-Docs", "companion")])];
  const report = run(registry, { Beta: manifest("alpha"), "Beta-Docs": manifest("alpha") });
  assert.equal(classification(report, "Beta"), "MANIFEST_PROJECT_MISMATCH");
  assert.equal(classification(report, "Beta-Docs"), "MANIFEST_PROJECT_MISMATCH");
  assert.equal(report.provenanceWarnings.length, 2);
  assert.deepEqual(report.fieldOutcomes, []);
});

test("21. blob integrity protection still applies", () => {
  const registry = [project("alpha", [repo("Alpha", "primary")])];
  const repositories = discovered(registry);
  const { sources } = manifestSourcesFromFixture({ manifests: [{ repository: "Alpha", commitSha: sha(3), path: ".pcgsoft/project.yml", blobSha: gitBlobSha("other"), content: manifest("alpha") }] }, repositories);
  const report = buildSyncOutputs({ registry, discovery: { complete: true, repositories, privateSeen: 0, errors: [] }, manifestSources: sources }).report;
  assert.equal(report.provenanceWarnings[0].issue, "SOURCE_INTEGRITY_FAILURE");
  assert.deepEqual(report.fieldOutcomes, []);
});

const mixedRegistry = () => [
  project("alpha", [repo("Alpha", "primary"), repo("Alpha-Docs", "companion")]),
  project("beta", [repo("Beta", "primary"), repo("Beta-Next", "current")]),
  project("gamma", [repo("Gamma", "integration")]),
  project("plain", [repo("Plain-Old", "original"), repo("Plain-Next", "current")]),
];
const mixedManifests = { Alpha: manifest("alpha"), "Alpha-Docs": manifest("alpha"), Beta: manifest("beta"), "Plain-Next": manifest("plain") };

test("22. reports with the new states are deterministic", () => {
  const first = run(mixedRegistry(), mixedManifests, { empty: ["Gamma"] });
  const second = run(mixedRegistry(), mixedManifests, { empty: ["Gamma"] });
  assert.equal(stableJson(first), stableJson(second));
  assert.deepEqual(first.manifestSourceEligibility.summary, { projects: 4, singleEligibleSource: 2, noEligibleSource: 1, duplicateEligibleSource: 1 });
  assert.doesNotMatch(stableJson(first), /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

test("23. shuffled repository and project order does not change the report", () => {
  const baseline = run(mixedRegistry(), mixedManifests, { empty: ["Gamma"] });
  const shuffledRegistry = mixedRegistry().reverse().map((item) => ({ ...item, repositories: [...item.repositories].reverse() }));
  const shuffledRepositories = discovered(mixedRegistry(), { empty: ["Gamma"] }).reverse();
  const shuffledManifests = Object.fromEntries(Object.entries(mixedManifests).reverse());
  const entries = Object.entries(mixedManifests).map(([repository, content], index) => ({ repository, commitSha: sha(index + 1), path: ".pcgsoft/project.yml", blobSha: gitBlobSha(content), content }));
  const reordered = Object.keys(shuffledManifests).map((name) => entries.find((entry) => entry.repository === name));
  const { sources } = manifestSourcesFromFixture({ manifests: reordered }, shuffledRepositories);
  const report = buildSyncOutputs({ registry: shuffledRegistry, discovery: { complete: true, repositories: shuffledRepositories, privateSeen: 0, errors: [] }, manifestSources: sources.reverse(), source: "auto-04b-test" }).report;
  assert.equal(stableJson(report), stableJson(baseline));
});

test("eligibility and lineage reporting never name a repository that was not discovered as public", () => {
  const registry = [project("beta", [repo("Beta", "primary"), repo("Beta-Now-Private", "current")]), project("plain", [repo("Plain-Old", "original"), repo("Plain-Hidden", "current")])];
  const repositories = discovered(registry).filter((item) => !/Private|Hidden/.test(item.name));
  const report = run(registry, {}, { repositories });
  const json = stableJson(report);
  assert.doesNotMatch(json, /Beta-Now-Private|Plain-Hidden/);
  const duplicate = finding(report, "DUPLICATE_ELIGIBLE_MANIFEST_SOURCE", "beta");
  assert.deepEqual([duplicate.eligibleRepositoryCount, duplicate.undiscoveredEligibleRepositoryCount, duplicate.eligibleRepositories.map((item) => item.repository)], [2, 1, ["Beta"]]);
  assert.equal(report.relationshipFindings.lineage.find((item) => item.projectId === "plain").undiscoveredRepositoryCount, 1);
});
