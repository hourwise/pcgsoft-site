// AUTO-04E: a comparison view, never canonical data or a replacement for raw evidence.
import { createHash } from "node:crypto";

const SHA = /^[0-9a-f]{40}$/;
const OPAQUE = new Set(["fields", "value", "canonicalValue", "proposedValue"]);
const COLLECTIONS = new Set([
  "repositories", "manifestSources", "manifestProvenance", "manifestProposals",
  "canonicalAgreements", "canonicalConflicts", "fieldOutcomes", "projectRelationships",
  "lineage", "warnings", "relationshipWarnings", "githubMetadataEvidence", "projects",
  "governanceFindings", "privacyVisibilityWarnings", "newProjectsPendingReview",
  "humanApprovalRequired", "liveSurfaceAnomalies", "statusAnomalies", "manifestErrors",
  "discoveryErrors", "noChangeItems", "archivedRepositories", "emptyRepositories",
  "eligibleRepositories", "canonicalMapping", "canonicalRoles", "sourceProjects",
  "repositoriesWithManifests",
]);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function canonicalize(value, key = "", opaque = false) {
  opaque ||= OPAQUE.has(key);
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalize(item, "", opaque));
    return !opaque && COLLECTIONS.has(key)
      ? items.sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b))) : items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort(compare).map((name) => [name, canonicalize(value[name], name, opaque)]));
  }
  return value;
}

export function stableReviewEvidence({ snapshot, report }) {
  if (snapshot?.schemaVersion !== 2 || report?.schemaVersion !== 2 ||
      !Array.isArray(snapshot.repositories) || !Array.isArray(snapshot.manifestSources) ||
      !Array.isArray(report.autoDerivedSafeFacts?.repositories) || !Array.isArray(report.manifestProvenance)) {
    throw new Error("unsupported or incomplete review evidence; refusing to suppress delivery");
  }
  const stable = structuredClone({ snapshot, report });
  // Narrow, explicit exceptions. Unknown fields remain material by default.
  const observationalCommits = new Map();
  for (const source of stable.snapshot.manifestSources) {
    const provenance = report.manifestProvenance.find((item) => item.repository === source.repository);
    const noManifest = source.state === "NO_MANIFEST" && source.blobSha === null && source.integrity === null;
    const verifiedEligible = source.state === "MANIFEST_FOUND" && source.integrity === "VERIFIED" && SHA.test(source.blobSha) &&
      provenance?.classification === "SOURCE_IDENTITY_MATCH" && provenance.integrity === "VERIFIED" &&
      provenance.blobSha === source.blobSha && provenance.commitSha === source.commitSha;
    if (source.ref === "default-branch-head" && SHA.test(source.commitSha) && (noManifest || verifiedEligible)) {
      observationalCommits.set(source.repository, source.commitSha);
      delete source.commitSha;
    }
  }
  for (const repository of stable.snapshot.repositories) {
    if (SHA.test(repository.latestDefaultBranchCommit?.sha)) {
      delete repository.latestDefaultBranchCommit.sha;
      delete repository.latestDefaultBranchCommit.date;
    }
  }
  for (const fact of stable.report.autoDerivedSafeFacts.repositories) {
    if (SHA.test(fact.defaultBranchSha)) delete fact.defaultBranchSha;
    if (fact.manifestCommitSha === observationalCommits.get(fact.repository)) delete fact.manifestCommitSha;
  }
  // Only source identity fields in known report collections; never manifest payload values.
  for (const key of ["manifestProvenance", "manifestProposals", "fieldOutcomes", "canonicalConflicts",
    "provenanceWarnings", "governanceFindings", "manifestErrors", "newProjectsPendingReview"]) {
    for (const item of stable.report[key] || []) {
      if (item.commitSha && item.commitSha === observationalCommits.get(item.repository)) delete item.commitSha;
    }
  }
  return `${JSON.stringify(canonicalize({ comparisonVersion: 1, ...stable }), null, 2)}\n`;
}

export const reviewHash = (evidence) => createHash("sha256").update(evidence).digest("hex");

export function reviewDecision(current, previous = null) {
  const evidence = stableReviewEvidence(current);
  const previousEvidence = previous ? stableReviewEvidence(previous) : null;
  return {
    changed: previousEvidence !== evidence,
    reason: previousEvidence === null ? "no-open-review-baseline" : previousEvidence === evidence ? "material-evidence-unchanged" : "material-evidence-changed",
    hash: reviewHash(evidence),
    previousHash: previousEvidence === null ? null : reviewHash(previousEvidence),
    evidence,
  };
}
