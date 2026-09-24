# PCGsoft project manifest contract

A repository may carry an optional `.pcgsoft/project.yml`. A manifest is
project-owned **proposal data**, not publication authority. The canonical
PCGsoft registry in `data/projects.json` remains the approval layer; no
manifest, GitHub metadata or discovery result ever edits it.

## Ownership layers

1. **Canonical (`CANONICAL`)** — `data/projects.json` owns public project
   identity, category, summary, status, live URLs, relationships, repository
   roles and featured state.
2. **Manifest proposal (`MANIFEST_PROPOSAL`)** — `.pcgsoft/project.yml`
   proposes project-owned metadata for human review.
3. **GitHub metadata (`GITHUB_METADATA`)** and **derived facts
   (`DERIVED_FACT`)** — safe public facts such as visibility, archived state,
   default branch, commit SHA and homepage. They may corroborate a proposal but
   never promote it to canonical truth.

## Provenance: which repository supplied the manifest

The engine never trusts a manifest because of the slug it declares. For every
manifest it independently records, from GitHub rather than from the manifest:

- repository owner, name, URL and numeric GitHub ID;
- the exact commit SHA read (the default-branch head recorded by discovery, or
  an explicit `--manifest-ref <repo>=<sha>` pin);
- the path `.pcgsoft/project.yml` and its git blob SHA, verified against the
  bytes actually returned.

The source repository must canonically map to the project the manifest names:

| Classification | Meaning | Result |
|---|---|---|
| `SOURCE_IDENTITY_MATCH` | Source repository is mapped to the declared project | Reconciled field by field |
| `MANIFEST_PROJECT_MISMATCH` | Source is mapped, but to a different project | HIGH provenance warning; not reconciled |
| `SOURCE_NOT_CANONICALLY_MAPPED` | Source repository is not in the registry | `PENDING_REVIEW`; not reconciled |
| `MANIFEST_PROJECT_UNKNOWN` | Declared project is not in the registry | `PENDING_REVIEW`; not reconciled |
| `SOURCE_INTEGRITY_FAILURE` | Content does not hash to its blob SHA | HIGH provenance warning; ignored |
| `MANIFEST_INVALID` | Schema validation failed | Manifest error; not reconciled |
| `NO_MANIFEST` | Repository has no manifest at that commit | Normal state |

A manifest in repository A therefore cannot make a proposal on behalf of
project B merely by naming B's slug.

## Schema version 2

```yaml
schemaVersion: 2
project:
  slug: reticle                  # required; must match the source's project
  name: Reticle Systems
  alternateNames:
    - Reticle
  category: products
  status: active-development     # lifecycle enum
  statusLabel: Active development
  summary: A concise factual project summary.
  parentProject: null
  relatedProjects:
    - plain-speak
  lastReviewed: 2026-09-24
repository:
  role: primary                  # primary | current | original | component | supporting
web:
  state: preview                 # none | preview | live
  urls:
    - https://example.com/
publication:
  eligible: false                # proposal only; never publishes
  notes: Requires explicit PCGsoft review.
activity:
  enabled: false
```

Only `schemaVersion` and `project.slug` are required. Lifecycle values are
`concept`, `prototype`, `active-development`, `public-preview`, `live`,
`maintenance`, `complete`, `paused`, `archived`.

Changes from version 1 and why:

- `web.urls` (zero or more HTTPS URLs) and `web.state` replace the singular
  `liveUrl` and `websiteState`, so proposals compare structurally with the
  canonical `liveUrls` list.
- `repository.role` lets a repository propose its place in a project's lineage.
  Roles map onto canonical roles: `primary`→primary, `current`→current,
  `original`→original, `component`→component/integration/web-app,
  `supporting`→companion/evidence/documentation. The role is a proposal; the
  canonical mapping still decides which project the repository belongs to.
- `project.slug` is required; `id`, `public` and `featured` are dropped because
  identity comes from provenance and featured placement is a PCGsoft curation
  decision.

Version 1 manifests remain accepted: `liveUrl` and `websiteState` are read as
`web.urls` and `web.state`.

## Field reconciliation

Every field produces an explicit outcome, and absent comparable fields are
listed as `NOT_PROPOSED`, so a missing comparison never looks like agreement:

| Field | Compared with | Notes |
|---|---|---|
| `project.name`, `category`, `summary`, `parentProject` | Same canonical field | Exact match |
| `project.status` | Lifecycle derived from the canonical status label | `UNCOMPARABLE` when the label has no unambiguous lifecycle mapping |
| `project.statusLabel` | Canonical `status` text | Exact match |
| `project.alternateNames` | Canonical name, short name and alternate names | Aliases only; names outside the canonical set are additions; never create a project |
| `project.relatedProjects` | Canonical relationship set | Agreements, additions, removals and unknown targets reported |
| `repository.role` | Canonical role(s) of the source repository for that project | |
| `web.state` | Canonical `websiteState`, else `live` if `liveUrls` exist, else `none` | |
| `web.urls` | Canonical `liveUrls` | Set comparison, trailing-slash normalised |
| `project.lastReviewed`, `publication.*`, `activity.*` | — | `INFORMATIONAL`; never applied |

Outcomes are `AGREEMENT`, `CONFLICT`, `NOT_PROPOSED`, `UNCOMPARABLE`,
`INFORMATIONAL` and `UNSUPPORTED_FIELD`. Every `CONFLICT`, `UNCOMPARABLE` and
`UNSUPPORTED_FIELD` is listed under *Human approval required*. Unknown keys
fail schema validation, and any validated field without a reconciliation rule
is reported as `UNSUPPORTED_FIELD` rather than dropped.

## Security restrictions

- YAML is parsed by the repository's safe subset parser; no general YAML
  features, aliases, tags or executable expressions are supported.
- Unknown keys, malformed YAML, oversized values, script-like strings,
  `javascript:` URLs and non-HTTPS URLs fail closed.
- Manifests are read only through the GitHub contents API at an exact commit
  SHA, capped at 24 KB and verified against their blob SHA. Floating branch
  names are refused.
- README ingestion is limited to marked sections and a fixed length.
- The workflow checks out only `pcgsoft-site` and does not execute discovered
  repository code or install sibling-project dependencies.

## Review process

The deterministic report separates automatically derived safe facts, manifest
provenance, manifest proposals, canonical agreements, canonical conflicts,
relationship and lineage findings, GitHub metadata evidence, provenance
warnings, privacy/visibility warnings, pending review, human approval required
and no-change items. A human must approve any canonical registry or
public-content change through a reviewed PR.
