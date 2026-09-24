import fs from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = 1;
export const LIFECYCLE_STATES = new Set([
  "concept",
  "prototype",
  "active-development",
  "public-preview",
  "live",
  "maintenance",
  "complete",
  "paused",
  "archived",
]);
export const WEBSITE_STATES = new Set(["none", "planned", "coming-soon", "preview", "live"]);
export const RELATIONSHIP_TYPES = new Set([
  "primary",
  "component",
  "companion",
  "integration",
  "lineage/original",
  "lineage/current",
  "original",
  "current",
  "related",
  "evidence",
  "documentation",
  "web-app",
]);

const MANIFEST_KEYS = {
  root: new Set(["schemaVersion", "project", "publication", "activity"]),
  project: new Set([
    "id", "name", "slug", "alternateNames", "public", "category", "status",
    "statusLabel", "summary", "featured", "liveUrl", "websiteState", "parentProject",
    "relatedProjects", "lastReviewed",
  ]),
  publication: new Set(["eligible", "notes"]),
  activity: new Set(["enabled"]),
};

const MAX_MANIFEST_BYTES = 24_000;
const MAX_TEXT_LENGTH = 2_000;
const MAX_README_SECTION_LENGTH = 4_000;

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function readText(file) {
  return fs.readFileSync(file, "utf8");
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sortBy(value, key) {
  return [...value].sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")));
}

function yamlError(message, lineNumber) {
  return new Error(`manifest YAML error${lineNumber ? ` on line ${lineNumber}` : ""}: ${message}`);
}

function stripYamlComment(value) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote === '"') {
      escaped = true;
      continue;
    }
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? null : character;
      continue;
    }
    if (character === "#" && !quote && (index === 0 || /\s/.test(value[index - 1]))) return value.slice(0, index).trimEnd();
  }
  return value.trimEnd();
}

function splitInlineList(value, lineNumber) {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];
  const parts = [];
  let current = "";
  let quote = null;
  for (const character of inner) {
    if ((character === '"' || character === "'") && (!quote || quote === character)) quote = quote ? null : character;
    if (character === "," && !quote) {
      parts.push(current.trim());
      current = "";
    } else current += character;
  }
  if (quote) throw yamlError("unterminated quoted list value", lineNumber);
  parts.push(current.trim());
  return parts.map((part) => parseYamlScalar(part, lineNumber));
}

function parseYamlScalar(value, lineNumber) {
  const trimmed = stripYamlComment(value).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return splitInlineList(trimmed, lineNumber);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const quote = trimmed[0];
    const body = trimmed.slice(1, -1);
    return quote === '"' ? JSON.parse(trimmed) : body.replaceAll("''", "'");
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  if (/^-?(?:0|[1-9]\d*)$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseYamlBlock(lines, start, indent) {
  const isArray = lines[start]?.indent === indent && lines[start].content.startsWith("-");
  const result = isArray ? [] : {};
  let index = start;
  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent > indent) throw yamlError("unexpected indentation", line.number);
    if (isArray) {
      if (!line.content.startsWith("-")) throw yamlError("mixed mapping and list values", line.number);
      const item = line.content.slice(1).trim();
      if (!item) {
        if (!lines[index + 1] || lines[index + 1].indent <= indent) throw yamlError("empty list item", line.number);
        const child = parseYamlBlock(lines, index + 1, lines[index + 1].indent);
        result.push(child.value);
        index = child.next;
      } else {
        if (item.includes(": ") || item.endsWith(":")) throw yamlError("list mappings are not supported in the safe manifest subset", line.number);
        result.push(parseYamlScalar(item, line.number));
        index += 1;
      }
    } else {
      if (line.content.startsWith("-")) throw yamlError("list value is not valid here", line.number);
      const separator = line.content.indexOf(":");
      if (separator <= 0) throw yamlError("expected a key and colon", line.number);
      const key = line.content.slice(0, separator).trim();
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) throw yamlError(`unsafe key ${key}`, line.number);
      if (Object.hasOwn(result, key)) throw yamlError(`duplicate key ${key}`, line.number);
      const rawValue = line.content.slice(separator + 1).trim();
      if (rawValue) {
        result[key] = parseYamlScalar(rawValue, line.number);
        index += 1;
      } else if (lines[index + 1] && lines[index + 1].indent > indent) {
        const child = parseYamlBlock(lines, index + 1, lines[index + 1].indent);
        result[key] = child.value;
        index = child.next;
      } else {
        result[key] = null;
        index += 1;
      }
    }
  }
  return { value: result, next: index };
}

export function parseSafeYaml(text) {
  if (Buffer.byteLength(text, "utf8") > MAX_MANIFEST_BYTES) throw yamlError("manifest exceeds 24KB limit");
  const lines = text.split(/\r?\n/).flatMap((raw, index) => {
    if (/\t/.test(raw)) throw yamlError("tabs are not allowed for indentation", index + 1);
    const content = stripYamlComment(raw.trimStart());
    if (!content.trim() || content.trim() === "---") return [];
    const indent = raw.length - raw.trimStart().length;
    return [{ indent, content: content.trim(), number: index + 1 }];
  });
  if (!lines.length) throw yamlError("manifest is empty");
  const parsed = parseYamlBlock(lines, 0, lines[0].indent).value;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw yamlError("root must be a mapping");
  return parsed;
}

function rejectUnsafeText(value, label) {
  if (typeof value !== "string") return;
  if (value.length > MAX_TEXT_LENGTH) throw new Error(`${label} exceeds ${MAX_TEXT_LENGTH} characters`);
  if (/<\/?script\b|javascript:|on[a-z]+\s*=|\b(?:child_process|process\.env|eval\s*\()/i.test(value)) {
    throw new Error(`${label} contains unsafe script-like content`);
  }
}

function checkKeys(object, allowed, label) {
  if (!object || typeof object !== "object" || Array.isArray(object)) throw new Error(`${label} must be a mapping`);
  for (const key of Object.keys(object)) if (!allowed.has(key)) throw new Error(`${label}.${key} is not an allowed field`);
}

function checkString(value, label, { optional = true } = {}) {
  if (value === undefined || value === null) {
    if (!optional) throw new Error(`${label} is required`);
    return;
  }
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  rejectUnsafeText(value, label);
}

function checkStringArray(value, label) {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.length > 50) throw new Error(`${label} must be an array of at most 50 strings`);
  value.forEach((item, index) => checkString(item, `${label}[${index}]`, { optional: false }));
}

export function validateManifest(manifest) {
  checkKeys(manifest, MANIFEST_KEYS.root, "manifest");
  if (manifest.schemaVersion !== SCHEMA_VERSION) throw new Error(`manifest.schemaVersion must be ${SCHEMA_VERSION}`);
  checkKeys(manifest.project, MANIFEST_KEYS.project, "manifest.project");
  const project = manifest.project;
  for (const field of ["id", "name", "slug", "summary", "statusLabel"]) checkString(project[field], `manifest.project.${field}`);
  if (project.id && project.slug && project.id !== project.slug) throw new Error("manifest.project.id and slug must match");
  if (project.public !== undefined && typeof project.public !== "boolean") throw new Error("manifest.project.public must be boolean");
  if (project.featured !== undefined && typeof project.featured !== "boolean") throw new Error("manifest.project.featured must be boolean");
  if (project.status !== undefined && !LIFECYCLE_STATES.has(project.status)) throw new Error(`manifest.project.status must be one of ${[...LIFECYCLE_STATES].join(", ")}`);
  if (project.websiteState !== undefined && !WEBSITE_STATES.has(project.websiteState)) throw new Error(`manifest.project.websiteState must be one of ${[...WEBSITE_STATES].join(", ")}`);
  if (project.category !== undefined) checkString(project.category, "manifest.project.category");
  if (project.liveUrl !== undefined && project.liveUrl !== null) {
    checkString(project.liveUrl, "manifest.project.liveUrl");
    if (!project.liveUrl.startsWith("https://")) throw new Error("manifest.project.liveUrl must use HTTPS");
  }
  if (project.lastReviewed !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(project.lastReviewed)) throw new Error("manifest.project.lastReviewed must be YYYY-MM-DD");
  checkStringArray(project.alternateNames, "manifest.project.alternateNames");
  checkStringArray(project.relatedProjects, "manifest.project.relatedProjects");
  checkString(project.parentProject, "manifest.project.parentProject");
  if (manifest.publication !== undefined) {
    checkKeys(manifest.publication, MANIFEST_KEYS.publication, "manifest.publication");
    if (manifest.publication.eligible !== undefined && typeof manifest.publication.eligible !== "boolean") throw new Error("manifest.publication.eligible must be boolean");
    checkString(manifest.publication.notes, "manifest.publication.notes");
  }
  if (manifest.activity !== undefined) {
    checkKeys(manifest.activity, MANIFEST_KEYS.activity, "manifest.activity");
    if (manifest.activity.enabled !== undefined && typeof manifest.activity.enabled !== "boolean") throw new Error("manifest.activity.enabled must be boolean");
  }
  return manifest;
}

export function loadManifest(file) {
  try {
    const manifest = validateManifest(parseSafeYaml(readText(file)));
    return { file, manifest, errors: [] };
  } catch (error) {
    return { file, manifest: null, errors: [error.message] };
  }
}

export function discoverManifestFiles(root, maxFiles = 100) {
  if (!root || !fs.existsSync(root)) return [];
  const found = [];
  function walk(directory) {
    if (found.length >= maxFiles) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "data" || entry.name === "generated") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name === "project.yml" && path.basename(path.dirname(absolute)) === ".pcgsoft") found.push(absolute);
      if (found.length >= maxFiles) return;
    }
  }
  walk(root);
  return found;
}

export function extractBoundedReadmeSections(text) {
  const sections = {};
  const errors = [];
  for (const name of ["overview", "status-notes"]) {
    const expression = new RegExp(`<!--\\s*pcgsoft:${name}:start\\s*-->([\\s\\S]*?)<!--\\s*pcgsoft:${name}:end\\s*-->`, "i");
    const match = text.match(expression);
    const start = new RegExp(`<!--\\s*pcgsoft:${name}:start\\s*-->`, "i").test(text);
    const end = new RegExp(`<!--\\s*pcgsoft:${name}:end\\s*-->`, "i").test(text);
    if (start !== end) {
      errors.push(`${name} markers are incomplete`);
      continue;
    }
    if (!match) continue;
    const raw = match[1].trim();
    if (raw.length > MAX_README_SECTION_LENGTH) {
      errors.push(`${name} section exceeds ${MAX_README_SECTION_LENGTH} characters`);
      continue;
    }
    try {
      rejectUnsafeText(raw, `README ${name}`);
      sections[name] = raw.replace(/<[^>]*>/g, "").replaceAll(/[`*_]/g, "").trim();
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { sections, errors, missingMarkers: Object.keys(sections).length === 0 && errors.length === 0 };
}

function repoNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length === 2 && parsed.hostname === "github.com" ? parts[1] : null;
  } catch {
    return null;
  }
}

export function normalizeRepository(raw) {
  const visibility = raw.visibility || (raw.private ? "private" : "unknown");
  const url = raw.html_url || raw.url;
  if (visibility !== "public" || raw.private === true || !url || !/^https:\/\/github\.com\/hourwise\/[A-Za-z0-9._-]+$/i.test(url)) return null;
  const name = raw.name || repoNameFromUrl(url);
  if (!name) return null;
  return {
    name,
    url,
    visibility: "public",
    defaultBranch: raw.default_branch || raw.defaultBranch || "main",
    archived: Boolean(raw.archived),
    description: typeof raw.description === "string" ? raw.description.slice(0, MAX_TEXT_LENGTH) : null,
    homepage: typeof raw.homepage === "string" && raw.homepage.startsWith("https://") ? raw.homepage : null,
    primaryLanguage: raw.language || raw.primaryLanguage || null,
    licence: raw.license?.spdx_id || raw.licence || null,
    latestDefaultBranchCommit: raw.latestDefaultBranchCommit || raw.latestCommit || null,
    latestRelease: raw.latestRelease || null,
  };
}

export async function discoverPublicGithubRepos({ owner = "hourwise", token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN, fixture, fetchImpl = globalThis.fetch } = {}) {
  if (fixture) {
    const raw = Array.isArray(fixture) ? fixture : fixture.repositories;
    if (!Array.isArray(raw)) throw new Error("GitHub fixture must contain a repositories array");
    return { complete: true, repositories: sortBy(raw.map(normalizeRepository).filter(Boolean), "name"), privateSeen: raw.filter((item) => item?.private === true || item?.visibility === "private").length, errors: [] };
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable for GitHub discovery");
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const rawRepositories = [];
  for (let page = 1; page <= 2; page += 1) {
    const response = await fetchImpl(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&sort=full_name`, { headers });
    if (!response.ok) throw new Error(`GitHub repository discovery failed with HTTP ${response.status}`);
    const pageData = await response.json();
    rawRepositories.push(...pageData);
    if (pageData.length < 100) break;
  }
  const repositories = [];
  let privateSeen = 0;
  for (const raw of rawRepositories) {
    if (raw.private === true || raw.visibility === "private") {
      privateSeen += 1;
      continue;
    }
    const normalized = normalizeRepository(raw);
    if (!normalized) continue;
    const commitResponse = await fetchImpl(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(normalized.name)}/commits?sha=${encodeURIComponent(normalized.defaultBranch)}&per_page=1`, { headers });
    if (commitResponse.ok) {
      const commits = await commitResponse.json();
      const latest = commits[0];
      if (latest) normalized.latestDefaultBranchCommit = { sha: latest.sha, date: latest.commit?.committer?.date || latest.commit?.author?.date || null };
    }
    repositories.push(normalized);
  }
  return { complete: true, repositories: sortBy(repositories, "name"), privateSeen, errors: [] };
}

export function buildApprovedSourceIndex(registry) {
  const byUrl = new Map();
  const byRepoName = new Map();
  for (const project of registry) {
    for (const repository of project.repositories || []) {
      if (repository.visibility !== "public" || !repository.url) continue;
      const item = { projectId: project.slug, projectName: project.name, role: repository.role || "related", url: repository.url };
      byUrl.set(repository.url, [...(byUrl.get(repository.url) || []), item]);
      const name = repoNameFromUrl(repository.url);
      if (name) byRepoName.set(name, [...(byRepoName.get(name) || []), item]);
    }
  }
  return { byUrl, byRepoName };
}

export function validateRelationships(registry) {
  const known = new Set(registry.map((project) => project.slug));
  const warnings = [];
  const seen = new Set();
  for (const project of registry) {
    if (project.parentProject && !known.has(project.parentProject)) warnings.push({ projectId: project.slug, issue: "MISSING_PARENT_PROJECT", target: project.parentProject });
    for (const related of project.relatedProjects || []) if (!known.has(related)) warnings.push({ projectId: project.slug, issue: "MISSING_RELATED_PROJECT", target: related });
    for (const repository of project.repositories || []) {
      if (!RELATIONSHIP_TYPES.has(repository.role)) warnings.push({ projectId: project.slug, issue: "UNKNOWN_RELATIONSHIP_TYPE", value: repository.role });
      const key = `${project.slug}:${repository.url}:${repository.role}`;
      if (seen.has(key)) warnings.push({ projectId: project.slug, issue: "DUPLICATE_SOURCE_RELATIONSHIP", value: repository.url });
      seen.add(key);
    }
  }
  return warnings;
}

function manifestProposals(manifestRecords, registry) {
  const bySlug = new Map(registry.map((project) => [project.slug, project]));
  const conflicts = [];
  const pending = [];
  const relationshipWarnings = [];
  const errors = manifestRecords.flatMap((record) => record.errors.map((error) => ({ file: path.basename(record.file), error })));
  for (const record of manifestRecords) {
    if (!record.manifest) continue;
    const proposal = record.manifest.project || {};
    const slug = proposal.slug || proposal.id;
    const canonical = bySlug.get(slug);
    if (!canonical) {
      pending.push({ slug: slug || null, name: proposal.name || null, reason: "manifest project is not in the approved registry", action: "PENDING_REVIEW" });
      continue;
    }
    if (proposal.parentProject && !bySlug.has(proposal.parentProject)) relationshipWarnings.push({ projectId: canonical.slug, issue: "MANIFEST_PARENT_PROJECT_MISSING", target: proposal.parentProject });
    for (const related of proposal.relatedProjects || []) if (!bySlug.has(related)) relationshipWarnings.push({ projectId: canonical.slug, issue: "MANIFEST_RELATED_PROJECT_MISSING", target: related });
    for (const field of ["name", "slug", "category", "summary", "featured", "parentProject", "websiteState", "liveUrl"]) {
      if (proposal[field] === undefined) continue;
      const canonicalValue = field === "websiteState" ? canonical.websiteState || (canonical.liveUrls?.length ? "live" : "none") : canonical[field];
      if (JSON.stringify(proposal[field]) !== JSON.stringify(canonicalValue)) {
        conflicts.push({ projectId: canonical.slug, field, canonicalValue: canonicalValue ?? null, proposedValue: proposal[field], action: "HUMAN_REVIEW_REQUIRED" });
      }
    }
  }
  return { conflicts, pending, errors, relationshipWarnings };
}

export function classifyRepositories(repositories, registry, discoveryComplete = true) {
  const index = buildApprovedSourceIndex(registry);
  const known = [];
  const pendingReview = [];
  const classificationForRole = (role) => {
    if (role === "primary") return "KNOWN_PUBLIC_SOURCE";
    if (["component", "integration", "web-app"].includes(role)) return "PROJECT_COMPONENT";
    if (["companion", "evidence", "documentation"].includes(role)) return "SUPPORTING_REPOSITORY";
    if (["original", "current", "lineage/original", "lineage/current"].includes(role)) return "PROJECT_LINEAGE";
    return "RELATED_REPOSITORY";
  };
  for (const repository of repositories) {
    const mappings = index.byUrl.get(repository.url) || [];
    if (mappings.length) {
      known.push({ repository: repository.name, url: repository.url, classification: classificationForRole(mappings[0].role), mappings: mappings.map(({ projectId, role }) => ({ projectId, role })) });
    } else {
      pendingReview.push({ repository: repository.name, url: repository.url, reason: "public repository is not represented in approved project/source mappings", classification: "PENDING_REVIEW" });
    }
  }
  const visibilityWarnings = [];
  if (discoveryComplete) {
    for (const [url, mappings] of index.byUrl.entries()) {
      if (!repositories.some((repository) => repository.url === url)) {
        visibilityWarnings.push({
          severity: "HIGH",
          projectIds: [...new Set(mappings.map((mapping) => mapping.projectId))].sort(),
          issue: "EXPECTED_PUBLIC_SOURCE_NOT_DISCOVERED",
          action: "review visibility and remove the public source link only after human approval",
        });
      }
    }
  }
  return { known, pendingReview, visibilityWarnings };
}

export function detectLiveSurfaceAnomalies(registry, probes = {}) {
  const anomalies = [];
  for (const project of registry) {
    const websiteState = project.websiteState || (project.liveUrls?.length ? "live" : "none");
    for (const url of project.liveUrls || []) {
      const probe = probes[url];
      if (!probe) continue;
      if (probe.status === 200 && websiteState !== "live") anomalies.push({ projectId: project.slug, issue: "LIVE_SURFACE_DETECTED_STATUS_REVIEW_REQUIRED", url, status: probe.status, websiteState });
      if (websiteState === "live" && probe.status !== 200) anomalies.push({ projectId: project.slug, issue: "LIVE_URL_UNAVAILABLE", url, status: probe.status ?? null, websiteState });
    }
  }
  return anomalies;
}

export function detectStatusAnomalies(registry, repositories) {
  const index = buildApprovedSourceIndex(registry);
  const anomalies = [];
  for (const project of registry) {
    const sources = (project.repositories || [])
      .flatMap((repository) => index.byUrl.get(repository.url) || [])
      .map((mapping) => repositories.find((repository) => repository.url === mapping.url))
      .filter(Boolean);
    if (/archived/i.test(project.status || "") && sources.some((repository) => !repository.archived)) {
      anomalies.push({ projectId: project.slug, issue: "ARCHIVED_PROJECT_HAS_ACTIVE_SOURCE", action: "STATUS_REVIEW_REQUIRED" });
    }
    if (/\blive\b/i.test(project.status || "") && sources.some((repository) => /prototype|early development/i.test(repository.description || ""))) {
      anomalies.push({ projectId: project.slug, issue: "LIVE_STATUS_SOURCE_SOUNDS_EARLY_STAGE", action: "STATUS_REVIEW_REQUIRED" });
    }
  }
  return anomalies;
}

export function buildSyncOutputs({ registry, discovery, manifests = [], probes = {}, source = "github" }) {
  const classifications = classifyRepositories(discovery.repositories, registry, discovery.complete);
  const manifestState = manifestProposals(manifests, registry);
  const relationshipWarnings = validateRelationships(registry);
  const liveSurfaceAnomalies = detectLiveSurfaceAnomalies(registry, probes);
  const statusAnomalies = detectStatusAnomalies(registry, discovery.repositories);
  const canonicalPrivacyWarnings = registry
    .filter((project) => project.sourceVisibility === "private" && ((project.repositories || []).length || project.githubUrl || (project.evidenceLinks || []).length))
    .map((project) => ({ severity: "HIGH", projectId: project.slug, issue: "PRIVATE_SOURCE_HAS_PUBLIC_LINK", action: "remove public source evidence after human review" }));
  const safeSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    owner: "hourwise",
    source,
    repositories: sortBy(discovery.repositories, "name"),
  };
  const report = {
    schemaVersion: SCHEMA_VERSION,
    source,
    autoDerivedSafeFacts: {
      publicRepositoryCount: discovery.repositories.length,
      knownMappedRepositoryCount: classifications.known.length,
      archivedRepositories: discovery.repositories.filter((repo) => repo.archived).map((repo) => repo.name).sort(),
      privateRepositoriesWithheld: discovery.privateSeen || 0,
    },
    proposedManifestChanges: manifestState.conflicts,
    canonicalConflicts: manifestState.conflicts,
    newProjectsPendingReview: [...classifications.pendingReview, ...manifestState.pending].sort((a, b) => String(a.repository || a.slug || "").localeCompare(String(b.repository || b.slug || ""))),
    privacyVisibilityWarnings: [...classifications.visibilityWarnings, ...canonicalPrivacyWarnings],
    relationshipWarnings: [...relationshipWarnings, ...manifestState.relationshipWarnings],
    liveSurfaceAnomalies,
    statusAnomalies,
    manifestErrors: manifestState.errors,
    discoveryErrors: discovery.errors || [],
    noChangeItems: classifications.known.map((item) => item.repository).sort(),
  };
  report.hasMaterialDrift = Boolean(
    report.newProjectsPendingReview.length || report.canonicalConflicts.length || report.privacyVisibilityWarnings.length ||
    report.relationshipWarnings.length || report.liveSurfaceAnomalies.length || report.statusAnomalies.length || report.manifestErrors.length || report.discoveryErrors.length,
  );
  report.result = report.hasMaterialDrift ? "PROPOSED_CHANGES" : "NO_CHANGE";
  report.summary = report.hasMaterialDrift
    ? "Discovery found reviewable portfolio evidence; no canonical publication state was changed."
    : "No material governed portfolio drift was found.";
  return { snapshot: safeSnapshot, report, markdown: renderReportMarkdown(report) };
}

export function renderReportMarkdown(report) {
  const list = (items, empty = "None") => items.length ? items.map((item) => `- ${typeof item === "string" ? item : JSON.stringify(item)}`).join("\n") : `- ${empty}`;
  return `# Portfolio Sync Reconciliation Report\n\nResult: **${report.result}**\n\n${report.summary}\n\n## Auto-derived safe facts\n\n- Public repositories: ${report.autoDerivedSafeFacts.publicRepositoryCount}\n- Mapped repositories: ${report.autoDerivedSafeFacts.knownMappedRepositoryCount}\n- Archived repositories: ${report.autoDerivedSafeFacts.archivedRepositories.length}\n- Private repositories withheld: ${report.autoDerivedSafeFacts.privateRepositoriesWithheld}\n\n## Proposed manifest changes\n\n${list(report.proposedManifestChanges)}\n\n## New projects pending review\n\n${list(report.newProjectsPendingReview)}\n\n## Privacy / visibility warnings\n\n${list(report.privacyVisibilityWarnings)}\n\n## Relationship warnings\n\n${list(report.relationshipWarnings)}\n\n## Live-surface anomalies\n\n${list(report.liveSurfaceAnomalies)}\n\n## Status anomalies\n\n${list(report.statusAnomalies)}\n\n## Manifest or discovery errors\n\n${list([...report.manifestErrors, ...report.discoveryErrors])}\n\n## No-change items\n\n${list(report.noChangeItems)}\n`;
}

export async function probeLiveUrls(registry, fetchImpl = globalThis.fetch) {
  const probes = {};
  if (typeof fetchImpl !== "function") return probes;
  const urls = [...new Set(registry.flatMap((project) => project.liveUrls || []))].sort();
  for (const url of urls) {
    try {
      const response = await fetchImpl(url, { method: "HEAD", redirect: "follow" });
      probes[url] = { status: response.status };
    } catch {
      probes[url] = { status: null };
    }
  }
  return probes;
}
