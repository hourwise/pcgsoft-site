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
```

`--dry-run` prints a reconciliation report. `--check` exits non-zero when
material drift or validation errors are present. `--write` writes only the
derived snapshot and report under `data/generated/` and
`docs/portfolio-sync/portfolio-sync-report.md`; it never approves or changes
the canonical registry.

In live mode the CLI also reads `.pcgsoft/project.yml` from every discovered
public repository at the exact default-branch commit SHA recorded by discovery,
and verifies the returned bytes against the git blob SHA. `--manifest-ref
<repo>=<sha>` pins a different exact commit for bounded pilots (for example an
unmerged manifest branch). Manifests are reconciled only when the repository
that supplied them canonically maps to the project they name; see
[project-manifest.md](project-manifest.md). Where production manifests live,
who may edit them and the scheduler re-enable gate are decided in
[manifest-authority.md](manifest-authority.md).

For deterministic offline work, pass `--github-json` with a fixture containing
safe repository metadata and optionally `--manifest-fixture` with pinned
manifest entries (`repository`, `commitSha`, `path`, `blobSha`, `content`). There
is no unauthenticated local-directory manifest input: a manifest without
repository provenance cannot be reconciled.

## Generated layers

- `data/projects.json` — canonical, human-approved publication state.
- `data/generated/github-portfolio-snapshot.json` — safe public GitHub facts and
  manifest source identities (repository, commit SHA, path, blob SHA).
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

## AUTO-02 pilot plan

AUTO-02 is documented here but is not executed by AUTO-01. The recommended
first pilot repositories are:

1. `hourwise/Moirae-Protocol` — newer project with strong evidence and
   explicit Fates / Ananke / Horae relationships.
2. `hourwise/Reticle-systems` — public default branch may lag the current
   project direction and therefore exercises conservative source drift review.
3. `hourwise/PlainSpeak-Next` — exercises original/current repository lineage.

AUTO-02 should add manifests only after a human approves the pilot scope,
prove the first governed sync against offline and live evidence, and keep all
canonical publication changes behind a reviewed PR. It must not auto-merge or
publish discovery results.

## Local development reality

An optional future local-audit command may compare operator-provided local
repositories with public GitHub state. Local branches and worktrees may be
ahead of GitHub, but their evidence is never treated as public or publication
authority. Scheduled automation runs only against bounded public GitHub
metadata and checked-in PCGsoft inputs; AUTO-01 does not recursively scan
operator drives.
