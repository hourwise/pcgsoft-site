# PCGsoft project manifest contract

AUTO-01 introduces an optional `.pcgsoft/project.yml` proposal format. A
manifest is project-owned input, not publication authority. The canonical
PCGsoft registry in `data/projects.json` remains the approval layer.

The sync engine treats every manifest as untrusted data. It uses a bounded
YAML subset, rejects unknown fields and unsafe values, accepts HTTPS URLs only,
and never executes manifest content or project code.

## Ownership layers

1. **Canonical approval data** — `data/projects.json` owns the public project
   identity, category, approved summary, status, website state, relationships
   and featured state.
2. **Optional project manifest** — `.pcgsoft/project.yml` proposes project-owned
   metadata for human review. It cannot add a project or override canonical
   data automatically.
3. **Derived GitHub metadata** — the sync adapter records safe public facts such
   as repository URL, visibility, default branch, archived state, description,
   homepage, language, licence and latest default-branch commit.

Conflicts are reported as `HUMAN_REVIEW_REQUIRED`. They are never silently
resolved in favour of a manifest or a repository.

## Schema

```yaml
schemaVersion: 1
project:
  id: example-project
  name: Example Project
  slug: example-project
  alternateNames:
    - Example
  public: true
  category: open-source
  status: active-development
  statusLabel: Active development
  summary: A concise factual project summary.
  featured: false
  liveUrl: https://example.com/
  websiteState: planned
  parentProject: null
  relatedProjects:
    - another-project
  lastReviewed: 2026-09-22
publication:
  eligible: false
  notes: Requires explicit PCGsoft review.
activity:
  enabled: false
```

All fields are optional except `schemaVersion` and `project`. The initial
controlled lifecycle values are:

`concept`, `prototype`, `active-development`, `public-preview`, `live`,
`maintenance`, `complete`, `paused`, `archived`.

Website states are:

`none`, `planned`, `coming-soon`, `preview`, `live`.

The manifest may describe `publication.eligible`, but that value is a
proposal only. It cannot publish a project, source link, route, sitemap entry
or `llms.txt` entry.

## Security restrictions

- YAML is parsed by the repository's safe subset parser; no general YAML
  features, aliases, tags or executable expressions are supported.
- Unknown keys, malformed YAML, oversized values, script-like strings,
  `javascript:` URLs and non-HTTPS public URLs fail closed.
- README ingestion is limited to marked sections and a fixed length.
- Manifest paths are supplied by the bounded caller; manifest contents cannot
  select arbitrary filesystem paths or commands.
- The workflow checks out only `pcgsoft-site` and does not execute discovered
  repository code or install sibling-project dependencies.

## Review process

The sync engine produces a deterministic report with separate sections for
safe derived facts, proposed manifest changes, canonical conflicts, new
projects pending review, privacy/visibility warnings, relationship warnings,
live-surface anomalies and no-change items.

Unknown repositories are classified as `PENDING_REVIEW`. A human must approve
any canonical registry or public-content change through a reviewed PR.
