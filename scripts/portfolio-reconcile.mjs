// AUTO-03 provenance-bound manifest reconciliation.
//
// A manifest is untrusted proposal data. It is only reconciled when the
// repository that actually supplied it (derived from GitHub, never from the
// manifest) canonically maps to the project the manifest names. Every
// supported field produces an explicit outcome; nothing is applied to the
// canonical registry.
import crypto from "node:crypto";
import {
  LIFECYCLE_STATES,
  MAX_MANIFEST_BYTES,
  buildApprovedSourceIndex,
  checkKeys,
  checkString,
  checkStringArray,
  classifyRepositories,
  detectLiveSurfaceAnomalies,
  detectStatusAnomalies,
  parseSafeYaml,
  sortBy,
  validateManifest as validateManifestV1,
  validateRelationships,
} from "./portfolio-sync-lib.mjs";

export const MANIFEST_PATH = ".pcgsoft/project.yml";
export const REPORT_SCHEMA_VERSION = 2;
export const MANIFEST_SCHEMA_VERSIONS = [1, 2];
export const WEB_STATES_V2 = new Set(["none", "preview", "live"]);
// Manifest repository roles and the canonical roles each one agrees with.
export const REPOSITORY_ROLES = new Map([
  ["primary", ["primary"]],
  ["current", ["current", "lineage/current"]],
  ["original", ["original", "lineage/original"]],
  ["component", ["component", "integration", "web-app"]],
  ["supporting", ["companion", "evidence", "documentation"]],
]);
export const AUTHORITY = {
  CANONICAL: "CANONICAL",
  MANIFEST: "MANIFEST_PROPOSAL",
  REPOSITORY: "REPOSITORY_EVIDENCE",
  GITHUB: "GITHUB_METADATA",
  DERIVED: "DERIVED_FACT",
};
export const OUTCOMES = ["AGREEMENT", "CONFLICT", "NOT_PROPOSED", "UNCOMPARABLE", "INFORMATIONAL", "UNSUPPORTED_FIELD"];

const V2_KEYS = {
  root: new Set(["schemaVersion", "project", "repository", "web", "publication", "activity"]),
  project: new Set(["slug", "name", "alternateNames", "category", "status", "statusLabel", "summary", "parentProject", "relatedProjects", "lastReviewed"]),
  repository: new Set(["role"]),
  web: new Set(["state", "urls"]),
  publication: new Set(["eligible", "notes"]),
  activity: new Set(["enabled"]),
};
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_WEB_URLS = 10;

// Canonical status is a free-text label. Only unambiguous leading phrases map
// to a lifecycle state; anything else is UNCOMPARABLE rather than guessed.
const LIFECYCLE_LABEL_RULES = [
  [/^(?:active(?: v1)?|v1|in) development\b/i, "active-development"],
  [/^live\b/i, "live"],
  [/^public preview\b/i, "public-preview"],
  [/^prototype\b/i, "prototype"],
  [/^completed?\b/i, "complete"],
  [/^maintenance\b/i, "maintenance"],
  [/^paused\b/i, "paused"],
  [/^archived\b/i, "archived"],
  [/^concept\b/i, "concept"],
];

export function deriveCanonicalLifecycle(statusLabel) {
  if (typeof statusLabel !== "string") return null;
  return LIFECYCLE_LABEL_RULES.find(([pattern]) => pattern.test(statusLabel.trim()))?.[1] ?? null;
}

export function canonicalWebState(project) {
  return project.websiteState || (project.liveUrls?.length ? "live" : "none");
}

export function gitBlobSha(content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

function checkSlug(value, label) {
  checkString(value, label, { optional: false });
  if (!SLUG_PATTERN.test(value)) throw new Error(`${label} must be a lowercase slug`);
}

export function validateManifestV2(manifest) {
  checkKeys(manifest, V2_KEYS.root, "manifest");
  if (manifest.schemaVersion !== 2) throw new Error("manifest.schemaVersion must be 2");
  checkKeys(manifest.project, V2_KEYS.project, "manifest.project");
  const project = manifest.project;
  checkSlug(project.slug, "manifest.project.slug");
  for (const field of ["name", "category", "statusLabel", "summary"]) checkString(project[field], `manifest.project.${field}`);
  if (project.status !== undefined && !LIFECYCLE_STATES.has(project.status)) throw new Error(`manifest.project.status must be one of ${[...LIFECYCLE_STATES].join(", ")}`);
  checkStringArray(project.alternateNames, "manifest.project.alternateNames");
  checkStringArray(project.relatedProjects, "manifest.project.relatedProjects");
  for (const [index, slug] of (project.relatedProjects || []).entries()) checkSlug(slug, `manifest.project.relatedProjects[${index}]`);
  if (project.parentProject !== undefined && project.parentProject !== null) checkSlug(project.parentProject, "manifest.project.parentProject");
  if (project.lastReviewed !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(project.lastReviewed)) throw new Error("manifest.project.lastReviewed must be YYYY-MM-DD");
  if (manifest.repository !== undefined) {
    checkKeys(manifest.repository, V2_KEYS.repository, "manifest.repository");
    if (manifest.repository.role !== undefined && !REPOSITORY_ROLES.has(manifest.repository.role)) throw new Error(`manifest.repository.role must be one of ${[...REPOSITORY_ROLES.keys()].join(", ")}`);
  }
  if (manifest.web !== undefined) {
    checkKeys(manifest.web, V2_KEYS.web, "manifest.web");
    if (manifest.web.state !== undefined && !WEB_STATES_V2.has(manifest.web.state)) throw new Error(`manifest.web.state must be one of ${[...WEB_STATES_V2].join(", ")}`);
    if (manifest.web.urls !== undefined) {
      if (!Array.isArray(manifest.web.urls) || manifest.web.urls.length > MAX_WEB_URLS) throw new Error(`manifest.web.urls must be an array of at most ${MAX_WEB_URLS} URLs`);
      manifest.web.urls.forEach((url, index) => {
        checkString(url, `manifest.web.urls[${index}]`, { optional: false });
        if (!url.startsWith("https://")) throw new Error(`manifest.web.urls[${index}] must use HTTPS`);
      });
      if (new Set(manifest.web.urls.map(normalizeUrl)).size !== manifest.web.urls.length) throw new Error("manifest.web.urls must not contain duplicates");
    }
  }
  if (manifest.publication !== undefined) {
    checkKeys(manifest.publication, V2_KEYS.publication, "manifest.publication");
    if (manifest.publication.eligible !== undefined && typeof manifest.publication.eligible !== "boolean") throw new Error("manifest.publication.eligible must be boolean");
    checkString(manifest.publication.notes, "manifest.publication.notes");
  }
  if (manifest.activity !== undefined) {
    checkKeys(manifest.activity, V2_KEYS.activity, "manifest.activity");
    if (manifest.activity.enabled !== undefined && typeof manifest.activity.enabled !== "boolean") throw new Error("manifest.activity.enabled must be boolean");
  }
  return manifest;
}

// Flatten a validated v1 or v2 manifest into { field: { value, sourceField } }.
// v1 `liveUrl`/`websiteState` map onto the multi-URL `web.*` model so they
// compare structurally with canonical `liveUrls`.
export function normalizeManifest(manifest) {
  const model = {};
  const put = (field, value, sourceField = field) => { if (value !== undefined) model[field] = { value, sourceField }; };
  const project = manifest.project || {};
  for (const [key, value] of Object.entries(project)) {
    if (manifest.schemaVersion === 1 && key === "liveUrl") put("web.urls", value === null ? [] : [value], "project.liveUrl");
    else if (manifest.schemaVersion === 1 && key === "websiteState") put("web.state", value, "project.websiteState");
    else put(`project.${key}`, value);
  }
  for (const block of ["repository", "web", "publication", "activity"]) {
    for (const [key, value] of Object.entries(manifest[block] || {})) put(`${block}.${key}`, value);
  }
  return model;
}

export function parseManifestContent(content) {
  try {
    const raw = parseSafeYaml(content);
    if (!MANIFEST_SCHEMA_VERSIONS.includes(raw.schemaVersion)) throw new Error(`manifest.schemaVersion must be one of ${MANIFEST_SCHEMA_VERSIONS.join(", ")}`);
    const manifest = raw.schemaVersion === 1 ? validateManifestV1(raw) : validateManifestV2(raw);
    const model = normalizeManifest(manifest);
    const declaredProject = model["project.slug"]?.value ?? model["project.id"]?.value ?? null;
    if (!declaredProject) throw new Error("manifest must declare project.slug");
    return { schemaVersion: raw.schemaVersion, model, declaredProject, errors: [] };
  } catch (error) {
    return { schemaVersion: null, model: null, declaredProject: null, errors: [error.message] };
  }
}

export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

const sortedUnique = (values) => [...new Set(values)].sort();

function setComparison(canonical, proposed, normalise = (value) => value) {
  const canonicalSet = new Map(canonical.map((value) => [normalise(value), value]));
  const proposedSet = new Map(proposed.map((value) => [normalise(value), value]));
  const agreements = [...proposedSet.keys()].filter((key) => canonicalSet.has(key)).map((key) => canonicalSet.get(key)).sort();
  const additions = [...proposedSet.keys()].filter((key) => !canonicalSet.has(key)).map((key) => proposedSet.get(key)).sort();
  const removals = [...canonicalSet.keys()].filter((key) => !proposedSet.has(key)).map((key) => canonicalSet.get(key)).sort();
  return { agreements, additions, removals };
}

const equal = (canonicalValue, proposedValue) => ({
  outcome: JSON.stringify(canonicalValue) === JSON.stringify(proposedValue) ? "AGREEMENT" : "CONFLICT",
  canonicalValue,
  proposedValue,
});
const equalRule = (read) => (canonical, proposed) => equal(read(canonical) ?? null, proposed);
const informational = (canonical, proposed) => ({ outcome: "INFORMATIONAL", canonicalValue: null, proposedValue: proposed, detail: "proposal-only metadata; never compared or applied" });

const FIELD_RULES = {
  "project.id": (canonical, proposed) => equal(canonical.slug, proposed),
  "project.slug": (canonical, proposed) => equal(canonical.slug, proposed),
  "project.name": equalRule((canonical) => canonical.name),
  "project.alternateNames": (canonical, proposed) => {
    const known = sortedUnique([canonical.name, canonical.shortName, ...(canonical.alternateNames || [])].filter(Boolean));
    const lower = new Set(known.map((name) => name.toLowerCase()));
    const additions = proposed.filter((name) => !lower.has(name.toLowerCase())).sort();
    return {
      outcome: additions.length ? "CONFLICT" : "AGREEMENT",
      canonicalValue: known,
      proposedValue: proposed,
      detail: { additions, note: "alternate names are aliases only; they never create or resolve a project" },
    };
  },
  "project.public": equalRule(() => true),
  "project.category": equalRule((canonical) => canonical.category),
  "project.status": (canonical, proposed) => {
    const lifecycle = deriveCanonicalLifecycle(canonical.status);
    if (!lifecycle) return { outcome: "UNCOMPARABLE", canonicalValue: canonical.status ?? null, proposedValue: proposed, detail: "canonical status label has no unambiguous lifecycle mapping" };
    return { ...equal(lifecycle, proposed), detail: { canonicalLabel: canonical.status } };
  },
  "project.statusLabel": equalRule((canonical) => canonical.status),
  "project.summary": equalRule((canonical) => canonical.summary),
  "project.featured": equalRule((canonical) => Boolean(canonical.featured)),
  "project.parentProject": equalRule((canonical) => canonical.parentProject),
  "project.relatedProjects": (canonical, proposed, context) => {
    const comparison = setComparison(canonical.relatedProjects || [], proposed);
    const unknownTargets = comparison.additions.filter((slug) => !context.knownSlugs.has(slug));
    return {
      outcome: comparison.additions.length || comparison.removals.length ? "CONFLICT" : "AGREEMENT",
      canonicalValue: [...(canonical.relatedProjects || [])].sort(),
      proposedValue: [...proposed].sort(),
      detail: { ...comparison, unknownTargets },
    };
  },
  "project.lastReviewed": informational,
  "repository.role": (canonical, proposed, context) => {
    const accepted = REPOSITORY_ROLES.get(proposed) || [];
    return {
      outcome: context.canonicalRoles.some((role) => accepted.includes(role)) ? "AGREEMENT" : "CONFLICT",
      canonicalValue: [...context.canonicalRoles].sort(),
      proposedValue: proposed,
    };
  },
  "web.state": equalRule((canonical) => canonicalWebState(canonical)),
  "web.urls": (canonical, proposed) => {
    const comparison = setComparison(canonical.liveUrls || [], proposed, normalizeUrl);
    return {
      outcome: comparison.additions.length || comparison.removals.length ? "CONFLICT" : "AGREEMENT",
      canonicalValue: [...(canonical.liveUrls || [])].sort(),
      proposedValue: [...proposed].sort(),
      detail: comparison,
    };
  },
  "publication.eligible": informational,
  "publication.notes": informational,
  "activity.enabled": informational,
};

// Fields a manifest of each version can propose and the engine compares.
// Absent ones are reported as NOT_PROPOSED rather than omitted.
const COMPARABLE_FIELDS = {
  1: ["project.name", "project.alternateNames", "project.public", "project.category", "project.status", "project.statusLabel", "project.summary", "project.featured", "project.parentProject", "project.relatedProjects", "web.state", "web.urls"],
  2: ["project.name", "project.alternateNames", "project.category", "project.status", "project.statusLabel", "project.summary", "project.parentProject", "project.relatedProjects", "repository.role", "web.state", "web.urls"],
};
const CANONICAL_READERS = {
  "project.name": (canonical) => canonical.name,
  "project.alternateNames": (canonical) => canonical.alternateNames || [],
  "project.public": () => true,
  "project.category": (canonical) => canonical.category,
  "project.status": (canonical) => canonical.status,
  "project.statusLabel": (canonical) => canonical.status,
  "project.summary": (canonical) => canonical.summary,
  "project.featured": (canonical) => Boolean(canonical.featured),
  "project.parentProject": (canonical) => canonical.parentProject ?? null,
  "project.relatedProjects": (canonical) => [...(canonical.relatedProjects || [])].sort(),
  "repository.role": (canonical, context) => [...context.canonicalRoles].sort(),
  "web.state": (canonical) => canonicalWebState(canonical),
  "web.urls": (canonical) => [...(canonical.liveUrls || [])].sort(),
};

// Reconcile one normalised manifest model against one canonical project. The
// canonical record is never modified.
export function reconcileFields({ model, schemaVersion, canonical, context }) {
  const outcomes = [];
  for (const field of Object.keys(model).sort()) {
    const rule = FIELD_RULES[field];
    const { value, sourceField } = model[field];
    if (!rule) {
      outcomes.push({ field, sourceField, outcome: "UNSUPPORTED_FIELD", canonicalValue: null, proposedValue: value, detail: "no reconciliation rule exists for this field" });
      continue;
    }
    outcomes.push({ field, sourceField, ...rule(canonical, value, context) });
  }
  for (const field of COMPARABLE_FIELDS[schemaVersion] || []) {
    if (!model[field]) outcomes.push({ field, sourceField: null, outcome: "NOT_PROPOSED", canonicalValue: CANONICAL_READERS[field](canonical, context) ?? null, proposedValue: null });
  }
  return outcomes.sort((a, b) => a.field.localeCompare(b.field));
}

// Bind a manifest to the repository that actually supplied it, then check the
// manifest's declared project against the canonical repository mapping.
export function resolveManifestSource(source, parsed, index, registryBySlug) {
  if (source.state === "NO_MANIFEST") return { classification: "NO_MANIFEST" };
  if (source.state !== "MANIFEST_FOUND") return { classification: "MANIFEST_SOURCE_ERROR" };
  if (source.integrity !== "VERIFIED") return { classification: "SOURCE_INTEGRITY_FAILURE" };
  if (parsed.errors.length) return { classification: "MANIFEST_INVALID" };
  const mappings = index.byUrl.get(source.repositoryUrl) || [];
  if (!mappings.length) return { classification: "SOURCE_NOT_CANONICALLY_MAPPED" };
  const mapped = mappings.filter((mapping) => mapping.projectId === parsed.declaredProject);
  if (mapped.length) return { classification: "SOURCE_IDENTITY_MATCH", projectId: parsed.declaredProject, canonicalRoles: sortedUnique(mapped.map((mapping) => mapping.role)) };
  if (registryBySlug.has(parsed.declaredProject)) return { classification: "MANIFEST_PROJECT_MISMATCH", sourceProjects: sortedUnique(mappings.map((mapping) => mapping.projectId)) };
  return { classification: "MANIFEST_PROJECT_UNKNOWN", sourceProjects: sortedUnique(mappings.map((mapping) => mapping.projectId)) };
}

async function githubJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (response.status === 404) return { status: 404, body: null };
  if (!response.ok) throw new Error(`GitHub request failed with HTTP ${response.status}`);
  return { status: response.status, body: await response.json() };
}

// Live adapter: fetch .pcgsoft/project.yml for each public repository at an
// exact commit SHA (the default-branch head recorded by discovery, or an
// explicit pinned override) and verify the returned bytes against the blob SHA.
export async function discoverManifests({ repositories, owner = "hourwise", refOverrides = {}, token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable for manifest discovery");
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const known = new Set(repositories.map((repository) => repository.name));
  const errors = [];
  for (const [name, sha] of Object.entries(refOverrides)) {
    if (!known.has(name)) errors.push({ repository: name, error: "manifest ref override names a repository that was not discovered as public" });
    if (!SHA_PATTERN.test(sha)) errors.push({ repository: name, error: "manifest ref override must be a full 40-character commit SHA" });
  }
  if (errors.length) return { sources: [], errors };
  const sources = [];
  for (const repository of sortBy(repositories, "name")) {
    const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}`;
    const override = refOverrides[repository.name];
    const record = { repository: repository.name, repositoryUrl: repository.url, repositoryId: repository.id ?? null, path: MANIFEST_PATH, sourceKind: "github-api", ref: override ? "pinned-override" : "default-branch-head", commitSha: override || repository.latestDefaultBranchCommit?.sha || null, blobSha: null, integrity: null, content: null };
    try {
      if (!record.commitSha) throw new Error("repository has no resolvable commit SHA; refusing to read a floating branch");
      if (override) {
        const commit = await githubJson(fetchImpl, `${base}/commits/${override}`, headers);
        if (commit.status === 404 || commit.body?.sha !== override) throw new Error("pinned commit does not exist in this repository");
      }
      const file = await githubJson(fetchImpl, `${base}/contents/${MANIFEST_PATH}?ref=${record.commitSha}`, headers);
      if (file.status === 404) {
        sources.push({ ...record, state: "NO_MANIFEST" });
        continue;
      }
      if (file.body?.type !== "file" || file.body.encoding !== "base64") throw new Error(`${MANIFEST_PATH} is not a regular file`);
      if (file.body.size > MAX_MANIFEST_BYTES) throw new Error(`${MANIFEST_PATH} exceeds ${MAX_MANIFEST_BYTES} bytes`);
      const bytes = Buffer.from(file.body.content, "base64");
      record.blobSha = file.body.sha;
      record.integrity = gitBlobSha(bytes) === file.body.sha ? "VERIFIED" : "MISMATCH";
      record.content = bytes.toString("utf8");
      sources.push({ ...record, state: "MANIFEST_FOUND" });
    } catch (error) {
      sources.push({ ...record, state: "MANIFEST_SOURCE_ERROR", error: error.message });
      errors.push({ repository: repository.name, error: error.message });
    }
  }
  return { sources, errors };
}

// Offline adapter for tests and reproducible reruns: each fixture entry pins a
// repository, commit, blob SHA and content. Content must hash to the blob SHA.
export function manifestSourcesFromFixture(fixture, repositories) {
  const entries = Array.isArray(fixture) ? fixture : fixture?.manifests;
  if (!Array.isArray(entries)) throw new Error("manifest fixture must contain a manifests array");
  const byName = new Map(repositories.map((repository) => [repository.name, repository]));
  const errors = [];
  const pinned = new Map();
  for (const entry of entries) {
    const repository = byName.get(entry.repository);
    if (!repository) errors.push({ repository: entry.repository, error: "manifest fixture names a repository that was not discovered as public" });
    else if (!SHA_PATTERN.test(entry.commitSha || "")) errors.push({ repository: entry.repository, error: "manifest fixture commitSha must be a full 40-character SHA" });
    else if (entry.path !== MANIFEST_PATH) errors.push({ repository: entry.repository, error: `manifest fixture path must be ${MANIFEST_PATH}` });
    else pinned.set(entry.repository, entry);
  }
  const sources = sortBy(repositories, "name").map((repository) => {
    const entry = pinned.get(repository.name);
    const record = { repository: repository.name, repositoryUrl: repository.url, repositoryId: repository.id ?? null, path: MANIFEST_PATH, sourceKind: "offline-fixture", ref: "fixture", commitSha: entry?.commitSha || repository.latestDefaultBranchCommit?.sha || null, blobSha: null, integrity: null, content: null };
    if (!entry) return { ...record, state: "NO_MANIFEST" };
    const content = String(entry.content ?? "");
    return { ...record, state: "MANIFEST_FOUND", blobSha: entry.blobSha, integrity: gitBlobSha(content) === entry.blobSha ? "VERIFIED" : "MISMATCH", content };
  });
  return { sources, errors };
}

function sourceIdentity(source) {
  return { repository: source.repository, repositoryUrl: source.repositoryUrl, repositoryId: source.repositoryId, commitSha: source.commitSha, path: source.path, blobSha: source.blobSha, ref: source.ref, sourceKind: source.sourceKind };
}

export function buildSyncOutputs({ registry, discovery, manifestSources = [], manifestErrors: sourceErrors = [], probes = {}, source = "github" }) {
  const index = buildApprovedSourceIndex(registry);
  const registryBySlug = new Map(registry.map((project) => [project.slug, project]));
  const knownSlugs = new Set(registryBySlug.keys());
  const classifications = classifyRepositories(discovery.repositories, registry, discovery.complete);
  const knownByRepository = new Map(classifications.known.map((item) => [item.repository, item]));
  const manifestResults = [];
  const manifestProposals = [];
  const fieldOutcomes = [];
  const provenanceWarnings = [];
  const manifestPending = [];
  const manifestErrors = [...sourceErrors];

  for (const manifestSource of sortBy(manifestSources, "repository")) {
    const parsed = manifestSource.state === "MANIFEST_FOUND" && manifestSource.integrity === "VERIFIED" ? parseManifestContent(manifestSource.content) : { errors: [], model: null, declaredProject: null };
    const resolution = resolveManifestSource(manifestSource, parsed, index, registryBySlug);
    const identity = sourceIdentity(manifestSource);
    const result = { ...identity, state: manifestSource.state, integrity: manifestSource.integrity, schemaVersion: parsed.schemaVersion ?? null, declaredProject: parsed.declaredProject, classification: resolution.classification, projectId: resolution.projectId ?? null };
    if (resolution.classification === "NO_MANIFEST") {
      manifestResults.push({ ...result, outcome: "NO_MANIFEST" });
      continue;
    }
    if (resolution.classification === "MANIFEST_SOURCE_ERROR") {
      manifestResults.push({ ...result, outcome: "SOURCE_ERROR", error: manifestSource.error });
      continue;
    }
    if (resolution.classification === "SOURCE_INTEGRITY_FAILURE") {
      provenanceWarnings.push({ severity: "HIGH", issue: "SOURCE_INTEGRITY_FAILURE", ...identity, action: "manifest content does not match its blob SHA; ignored" });
      manifestResults.push({ ...result, outcome: "REJECTED" });
      continue;
    }
    if (resolution.classification === "MANIFEST_INVALID") {
      manifestErrors.push(...parsed.errors.map((error) => ({ repository: manifestSource.repository, commitSha: manifestSource.commitSha, error })));
      manifestResults.push({ ...result, outcome: "REJECTED" });
      continue;
    }
    manifestProposals.push({ ...identity, schemaVersion: parsed.schemaVersion, declaredProject: parsed.declaredProject, authority: AUTHORITY.MANIFEST, fields: Object.fromEntries(Object.entries(parsed.model).map(([field, { value }]) => [field, value])) });
    if (resolution.classification === "MANIFEST_PROJECT_MISMATCH") {
      provenanceWarnings.push({ severity: "HIGH", issue: "MANIFEST_PROJECT_MISMATCH", ...identity, declaredProject: parsed.declaredProject, sourceProjects: resolution.sourceProjects, action: "manifest names a project its source repository does not canonically belong to; not reconciled" });
      manifestResults.push({ ...result, outcome: "REJECTED" });
      continue;
    }
    if (resolution.classification !== "SOURCE_IDENTITY_MATCH") {
      manifestPending.push({ repository: manifestSource.repository, url: manifestSource.repositoryUrl, commitSha: manifestSource.commitSha, declaredProject: parsed.declaredProject, reason: resolution.classification, classification: "PENDING_REVIEW" });
      manifestResults.push({ ...result, outcome: "PENDING_REVIEW" });
      continue;
    }
    const canonical = registryBySlug.get(resolution.projectId);
    const outcomes = reconcileFields({ model: parsed.model, schemaVersion: parsed.schemaVersion, canonical, context: { canonicalRoles: resolution.canonicalRoles, knownSlugs } });
    for (const outcome of outcomes) fieldOutcomes.push({ projectId: canonical.slug, repository: manifestSource.repository, commitSha: manifestSource.commitSha, ...outcome });
    const needsReview = outcomes.some((outcome) => ["CONFLICT", "UNCOMPARABLE", "UNSUPPORTED_FIELD"].includes(outcome.outcome));
    manifestResults.push({ ...result, canonicalRoles: resolution.canonicalRoles, outcome: needsReview ? "HUMAN_REVIEW_REQUIRED" : "NO_CANONICAL_CHANGE_PROPOSED" });
  }

  // GitHub metadata is evidence only. A homepage outside canonical liveUrls is
  // reported, and attached to any matching web.* conflict as corroboration.
  const githubMetadataEvidence = [];
  for (const repository of sortBy(discovery.repositories, "name")) {
    if (!repository.homepage) continue;
    for (const mapping of index.byUrl.get(repository.url) || []) {
      const canonical = registryBySlug.get(mapping.projectId);
      const listed = (canonical.liveUrls || []).map(normalizeUrl).includes(normalizeUrl(repository.homepage));
      githubMetadataEvidence.push({ projectId: mapping.projectId, repository: repository.name, field: "homepage", value: repository.homepage, authority: AUTHORITY.GITHUB, relation: listed ? "MATCHES_CANONICAL_LIVE_URL" : "NOT_IN_CANONICAL_LIVE_URLS" });
    }
  }
  const evidenceFor = (outcome) => outcome.field.startsWith("web.")
    ? githubMetadataEvidence.filter((item) => item.projectId === outcome.projectId && item.relation === "NOT_IN_CANONICAL_LIVE_URLS").map(({ repository, field, value, authority }) => ({ repository, field, value, authority }))
    : [];

  const canonicalConflicts = fieldOutcomes.filter((item) => item.outcome === "CONFLICT").map((item) => ({ ...item, authority: { canonical: AUTHORITY.CANONICAL, proposed: AUTHORITY.MANIFEST }, evidence: evidenceFor(item), action: "HUMAN_REVIEW_REQUIRED" }));
  const canonicalAgreements = fieldOutcomes.filter((item) => item.outcome === "AGREEMENT").map(({ projectId, repository, field, canonicalValue }) => ({ projectId, repository, field, value: canonicalValue, authority: AUTHORITY.CANONICAL }));
  const humanApprovalRequired = fieldOutcomes
    .filter((item) => ["CONFLICT", "UNCOMPARABLE", "UNSUPPORTED_FIELD"].includes(item.outcome))
    .map(({ projectId, repository, field, outcome, canonicalValue, proposedValue }) => ({ projectId, repository, field, reason: outcome, canonicalValue, proposedValue, decision: "HUMAN_REVIEW_REQUIRED" }));

  // Repository lineage: every repository that canonically maps to a project,
  // grouped by project. Repositories never create projects.
  const lineage = [];
  for (const project of sortBy(registry, "slug")) {
    const repositories = (project.repositories || []).filter((repository) => repository.visibility === "public");
    if (repositories.length < 2 && !repositories.some((repository) => ["original", "current", "lineage/original", "lineage/current"].includes(repository.role))) continue;
    lineage.push({
      projectId: project.slug,
      repositories: repositories.map((repository) => {
        const name = repository.url.split("/").pop();
        return { repository: name, canonicalRole: repository.role, discovered: knownByRepository.has(name), classification: knownByRepository.get(name)?.classification ?? null, manifest: manifestResults.find((item) => item.repository === name)?.classification ?? "NOT_CHECKED" };
      }).sort((a, b) => a.repository.localeCompare(b.repository)),
    });
  }
  const projectRelationships = fieldOutcomes.filter((item) => item.field === "project.relatedProjects" && item.outcome !== "NOT_PROPOSED").map(({ projectId, repository, outcome, detail }) => ({ projectId, repository, outcome, agreements: detail.agreements, additions: detail.additions, removals: detail.removals, unknownTargets: detail.unknownTargets }));

  const canonicalPrivacyWarnings = registry
    .filter((project) => project.sourceVisibility === "private" && ((project.repositories || []).length || project.githubUrl || (project.evidenceLinks || []).length))
    .map((project) => ({ severity: "HIGH", projectId: project.slug, issue: "PRIVATE_SOURCE_HAS_PUBLIC_LINK", action: "remove public source evidence after human review" }));
  const manifestByRepository = new Map(manifestResults.map((item) => [item.repository, item]));
  const repositoryFacts = sortBy(discovery.repositories, "name").map((repository) => ({
    repository: repository.name,
    id: repository.id ?? null,
    visibility: repository.visibility,
    archived: repository.archived,
    defaultBranch: repository.defaultBranch,
    defaultBranchSha: repository.latestDefaultBranchCommit?.sha ?? null,
    manifest: manifestByRepository.get(repository.name)?.classification ?? "NOT_CHECKED",
    manifestCommitSha: manifestByRepository.get(repository.name)?.commitSha ?? null,
    canonicalMapping: (index.byUrl.get(repository.url) || []).map(({ projectId, role }) => ({ projectId, role })).sort((a, b) => a.projectId.localeCompare(b.projectId)),
    authority: AUTHORITY.DERIVED,
  }));
  const reviewRepositories = new Set([...humanApprovalRequired, ...provenanceWarnings].map((item) => item.repository));
  const newProjectsPendingReview = [...classifications.pendingReview, ...manifestPending].sort((a, b) => String(a.repository).localeCompare(String(b.repository)) || String(a.reason).localeCompare(String(b.reason)));

  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    source,
    autoDerivedSafeFacts: {
      publicRepositoryCount: discovery.repositories.length,
      knownMappedRepositoryCount: classifications.known.length,
      archivedRepositories: discovery.repositories.filter((repository) => repository.archived).map((repository) => repository.name).sort(),
      privateRepositoriesWithheld: discovery.privateSeen || 0,
      manifestsFound: manifestResults.filter((item) => item.state === "MANIFEST_FOUND").length,
      repositories: repositoryFacts,
    },
    manifestProvenance: manifestResults.filter((item) => item.state !== "NO_MANIFEST"),
    manifestProposals,
    canonicalAgreements,
    canonicalConflicts,
    fieldOutcomes,
    relationshipFindings: { projectRelationships, lineage, warnings: validateRelationships(registry) },
    relationshipWarnings: validateRelationships(registry),
    githubMetadataEvidence,
    provenanceWarnings,
    privacyVisibilityWarnings: [...classifications.visibilityWarnings, ...canonicalPrivacyWarnings],
    newProjectsPendingReview,
    humanApprovalRequired,
    liveSurfaceAnomalies: detectLiveSurfaceAnomalies(registry, probes),
    statusAnomalies: detectStatusAnomalies(registry, discovery.repositories),
    manifestErrors,
    discoveryErrors: discovery.errors || [],
    noChangeItems: classifications.known.map((item) => item.repository).filter((name) => !reviewRepositories.has(name)).sort(),
  };
  report.hasMaterialDrift = Boolean(
    report.newProjectsPendingReview.length || report.humanApprovalRequired.length || report.provenanceWarnings.length ||
    report.privacyVisibilityWarnings.length || report.relationshipWarnings.length || report.liveSurfaceAnomalies.length ||
    report.statusAnomalies.length || report.manifestErrors.length || report.discoveryErrors.length,
  );
  report.result = report.hasMaterialDrift ? "PROPOSED_CHANGES" : "NO_CHANGE";
  report.summary = report.hasMaterialDrift
    ? "Discovery found reviewable portfolio evidence; no canonical publication state was changed."
    : "No material governed portfolio drift was found.";
  const snapshot = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    owner: "hourwise",
    source,
    repositories: sortBy(discovery.repositories, "name"),
    manifestSources: sortBy(manifestSources, "repository").map((item) => ({ ...sourceIdentity(item), state: item.state, integrity: item.integrity })),
  };
  return { snapshot, report, markdown: renderReportMarkdown(report) };
}

export function renderReportMarkdown(report) {
  const list = (items, format = (item) => JSON.stringify(item)) => items.length ? items.map((item) => `- ${typeof item === "string" ? item : format(item)}`).join("\n") : "- None";
  const value = (item) => JSON.stringify(item ?? null);
  const facts = report.autoDerivedSafeFacts;
  return `# Portfolio Sync Reconciliation Report

Result: **${report.result}**

${report.summary}

## Automatically derived safe facts

- Public repositories: ${facts.publicRepositoryCount}
- Mapped repositories: ${facts.knownMappedRepositoryCount}
- Archived repositories: ${facts.archivedRepositories.length}
- Private repositories withheld: ${facts.privateRepositoriesWithheld}
- Manifests found: ${facts.manifestsFound}

## Manifest provenance

${list(report.manifestProvenance, (item) => `${item.repository}@${item.commitSha} ${item.path} blob ${item.blobSha} (${item.ref}, ${item.integrity}) → ${item.classification}${item.projectId ? ` → ${item.projectId}` : ""}: ${item.outcome}`)}

## Manifest proposals

${list(report.manifestProposals, (item) => `${item.repository}@${item.commitSha} proposes for ${item.declaredProject}: ${Object.keys(item.fields).sort().join(", ")}`)}

## Canonical agreements

${list(report.canonicalAgreements, (item) => `${item.projectId} ${item.field} (${item.repository})`)}

## Canonical conflicts

${list(report.canonicalConflicts, (item) => `${item.projectId} ${item.field} (${item.repository}): canonical ${value(item.canonicalValue)} vs proposed ${value(item.proposedValue)}${item.evidence.length ? `; GitHub evidence ${value(item.evidence.map((evidence) => evidence.value))}` : ""}`)}

## Relationship and lineage findings

${list(report.relationshipFindings.projectRelationships, (item) => `${item.projectId} related projects (${item.repository}): ${item.outcome}; additions ${value(item.additions)}, removals ${value(item.removals)}`)}
${list(report.relationshipFindings.lineage, (item) => `${item.projectId} lineage: ${item.repositories.map((repository) => `${repository.repository} (${repository.canonicalRole})`).join(", ")}`)}

## GitHub metadata evidence

${list(report.githubMetadataEvidence, (item) => `${item.projectId} ${item.repository} ${item.field} ${item.value}: ${item.relation}`)}

## Provenance warnings

${list(report.provenanceWarnings, (item) => `${item.severity} ${item.issue} ${item.repository}@${item.commitSha}${item.declaredProject ? ` declares ${item.declaredProject}` : ""}`)}

## Privacy / visibility warnings

${list(report.privacyVisibilityWarnings)}

## Pending review

${list(report.newProjectsPendingReview, (item) => `${item.repository}: ${item.reason}`)}

## Human approval required

${list(report.humanApprovalRequired, (item) => `${item.projectId} ${item.field} (${item.reason}) from ${item.repository}`)}

## Live-surface and status anomalies

${list([...report.liveSurfaceAnomalies, ...report.statusAnomalies])}

## Manifest or discovery errors

${list([...report.manifestErrors, ...report.discoveryErrors])}

## No change

${list(report.noChangeItems)}
`;
}
