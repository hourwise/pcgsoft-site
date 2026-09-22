# Governed portfolio sync foundation

AUTO-01 keeps portfolio discovery separate from publication. The CLI reads the
approved registry and bounded public evidence, then produces reviewable,
deterministic output. It does not edit `data/projects.json`, generate public
project pages or publish discovered repositories.

## Commands

```text
npm run portfolio:test
npm run portfolio:sync -- --dry-run
npm run portfolio:sync -- --check
npm run portfolio:sync -- --write
npm run portfolio:audit-local
```

`--dry-run` prints a reconciliation report. `--check` exits non-zero when
material drift or validation errors are present. `--write` writes only the
derived snapshot and report under `data/generated/` and
`docs/portfolio-sync/portfolio-sync-report.md`; it never approves or changes
the canonical registry.

For deterministic offline work, pass `--github-json` with a fixture containing
safe repository metadata. `--manifest-root` is an explicit bounded input for
local audits; the GitHub workflow does not recursively scan an operator drive.

## Generated layers

- `data/projects.json` — canonical, human-approved publication state.
- `data/generated/github-portfolio-snapshot.json` — safe public GitHub facts.
- `data/generated/portfolio-sync-report.json` — machine-readable review report.
- `docs/portfolio-sync/portfolio-sync-report.md` — human-readable report.

Generated snapshots are evidence, not publication authority. The public site
must remain unchanged unless a human reviews and merges a separate content PR.

## Relationship and activity boundaries

Repository roles retain project relationships such as primary source,
component, companion, original/current lineage and integration. A repository
does not become a project merely because it is public.

Meaningful activity is reserved for `STATUS_CHANGED`, `RELEASE_PUBLISHED`,
`PUBLIC_PREVIEW_AVAILABLE`, `LIVE_SURFACE_AVAILABLE`, `MILESTONE_NOTE` and
`PROJECT_COMPLETED`. AUTO-01 does not synthesize activity from commits.

## Local development reality

`npm run portfolio:audit-local` is an optional operator-side audit. Local
branches and worktrees may be ahead of GitHub, but their evidence is never
treated as public or publication authority. Scheduled automation runs only
against bounded public GitHub metadata and checked-in PCGsoft inputs.
