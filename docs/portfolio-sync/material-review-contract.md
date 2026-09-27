# Material review delivery (AUTO-04E)

This is a delivery comparison, not another canonical source. `data/projects.json`
remains the only human-approved publication registry. The reconciliation engine,
manifest fetching, integrity checks and privacy filtering are unchanged.

## Two views of the same run

The engine still produces the four complete, provenance-bound files:

1. `data/generated/github-portfolio-snapshot.json`
2. `data/generated/portfolio-sync-report.json`
3. `docs/portfolio-sync/portfolio-sync-report.json`
4. `docs/portfolio-sync/portfolio-sync-report.md`

Every successful observation run uploads these files as the
`portfolio-sync-report` artifact, **before** any review delivery. They contain the
actual observed default-branch SHAs and commit dates, manifest lookup commit SHAs,
blob identities and verification results. The artifact is attached to its GitHub
run, including that run's identity/time. Retention is explicitly **90 days**, not
permanent archival; download an artifact within that window for longer retention.
No current observation is replaced with an older SHA to make its bytes look stable.

`scripts/portfolio-review-evidence.mjs` derives a deterministic comparison view
from the snapshot and machine report. `scripts/compare-portfolio-review.mjs`
reads the one open `automation/portfolio-sync` -> `main` PR and fetches its two
JSON inputs at the **exact returned head SHA**. It compares normalized bytes,
not just hashes. It writes the current comparison view to
`data/generated/portfolio-review-evidence.json` for the run artifact only. The
view's SHA-256 and the previous view's SHA-256 are recorded in the run summary.

The JSON report copy under `docs/` and Markdown are renderings of the same machine
report, not separate authorities. Their formatting is not an additional material
input. A future change to the comparison contract must version the comparison
view; unknown schema versions currently fail closed.

## Exact material-change rule

All snapshot/report fields are significant **except** these explicit observation
fields, under the stated conditions:

| Location | Normalization |
| --- | --- |
| `snapshot.repositories[].latestDefaultBranchCommit` | Omit `sha` and `date` when `sha` is a resolved 40-character Git SHA; preserve null/unresolved state and any other keys. |
| `report.autoDerivedSafeFacts.repositories[].defaultBranchSha` | Omit a resolved 40-character SHA; preserve unresolved/null state. |
| Default-branch manifest lookup with `state: NO_MANIFEST`, null blob and integrity | Omit its resolved `commitSha`; absence and source identity remain significant. |
| Default-branch manifest with verified blob and `SOURCE_IDENTITY_MATCH` | Omit its resolved `commitSha` only when the snapshot and report agree on commit, blob and verification. |
| References to an observation-only manifest commit | Omit the matching `manifestCommitSha` in repository facts and matching top-level `commitSha` in the known provenance/proposal/field-outcome/conflict/warning/governance/error/pending collections. |

Explicit pinned overrides, ineligible/unmapped/rejected sources, integrity
failures, unresolved identities and source-error commit identities remain
material. A source repository, path, source kind, lookup mode, blob, integrity,
classification or canonical mapping change remains material.

Object keys are sorted with an ordinal comparator. Named evidence collections
(repositories, sources, findings, mappings, lineage, eligibility and errors) are
sorted by canonical serialized content. Collections preserve duplicate entries.
Opaque manifest/canonical values (`fields`, `value`, `canonicalValue`,
`proposedValue`) retain their array order and all values, including SHA-shaped
strings. Unknown fields are retained. No blanket removal of timestamps, SHAs,
error strings or arbitrary payload properties occurs.

Consequently, these remain material:

- discovery additions/removals, public visibility/withheld-count changes and archive state;
- canonical mappings, eligibility, empty-repository state and default branch names;
- manifest appearance/disappearance, blob/content changes, source identity or verification changes;
- proposals, canonical agreements/conflicts, governance, relationships and lineage;
- homepage evidence and all other safe metadata, including releases;
- provenance/privacy/discovery/manifest errors and pending-review changes.

This deliberately treats some harmless safe metadata changes conservatively as
material. It suppresses unrelated resolved HEAD/date churn, not every possible
source of noise. `hasMaterialDrift` still means drift against canonical data;
the new delivery decision means change **since the open review PR's evidence**.
Existing unresolved findings therefore remain visible without daily delivery.

## Manifest provenance

A verified eligible manifest at a new default-branch commit with the same blob,
source and reconciliation meaning is the same review proposal. The run artifact
records its new commit. The PR retains the previous complete, valid commit/blob
pair until a material change occurs. Neither record claims the old commit is the
latest HEAD. This avoids fabricating or weakening provenance while preserving
the exact state of both observations.

Blob changes remain material even if the parsed proposal happens to be unchanged
(for example, a comment-only manifest edit). Blob-byte integrity verification
still happens in the existing adapter before reconciliation; the comparison
does not authorize or repair failed verification.

## Delivery and failure behaviour

- Equal normalized evidence: `changed=false`; skip create-pull-request entirely;
  record `operation: none` with the existing PR number/head. No branch commit,
  push, PR body update or Cloudflare preview is caused by this run.
- Different evidence: `changed=true`; upload raw evidence, then run the existing
  stable-branch create-pull-request action with the same four `add-paths`. Its
  ordinary unchanged-tree behaviour can still return `none`.
- No open PR: bootstrap ordinary delivery; an absent/closed review is not used
  to suppress a new review. Existing branch handling remains the action's job.
- Multiple matching PRs, invalid head identity, unreadable evidence, API failure,
  invalid JSON or unsupported schemas: fail the job and skip delivery. Never
  silently turn missing evidence into a successful no-op.

The workflow's concurrency group serializes its runs. Reading the review baseline
uses only GET requests and the existing repository-scoped token. There are no
project-repository writes, approval calls, merge calls, permission increases or
manual edits of the generated branch. The artifact-only comparison view remains
outside `add-paths` and outside the public build allowlist.

After this implementation is merged, existing PR #7 can be compared immediately:
no migration commit is necessary. Its base may temporarily lag main while its
evidence stays material-equivalent. The next material delivery rebuilds the
single generated commit on the then-current main, as before.

## Runtime compatibility review

Verified against upstream stable release tags on 2026-09-27:

| Action | Old | New | Compatibility and authority |
| --- | --- | --- | --- |
| checkout | v4 | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) | Native Node 24; main and full-history checkout unchanged. New fork-trigger protection does not affect schedule/dispatch. New credential-file storage is supported by create-pull-request v8.1.1. |
| setup-node | v4 | [v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0) | Native Node 24 action runtime; application Node stays 22. Explicit `package-manager-cache: false` preserves uncached installation and avoids implicit cache authority. |
| upload-artifact | v4 | [v7.0.1](https://github.com/actions/upload-artifact/releases/tag/v7.0.1) | Native Node 24; ZIP explicitly retained with `archive: true`; no hidden-file opt-in. Same report artifact, now also carrying the comparison view. |
| create-pull-request | v7 | [v8.1.1](https://github.com/peter-evans/create-pull-request/releases/tag/v8.1.1) | Native Node 24; same fixed branch, PR reuse, four paths, actor author, bot committer, unsigned commits and no deletion. No approve/merge behaviour added. |

All releases declare `runs.using: node24`. The certified hosted runner version
2.337.0 exceeds the Node 24 minimum 2.327.1. Upstream's
[v7-to-v8 migration notes](https://github.com/peter-evans/create-pull-request/blob/v8.1.1/docs/updating.md)
list the runner requirement; its credential helper explicitly supports the
checkout credential-file layout. Its implementation still initializes the
operation output to `none` and only pushes a created/updated branch.

Workflow authority remains exactly `contents: write` and `pull-requests: write`;
all other workflow token permissions are unset. No extra token is introduced.
The action versions are pinned to reviewed release versions rather than moving
major tags. Actual hosted warning elimination must be observed after merge;
transitive dependency warnings are not assumed absent from static inspection.

## Scope and review gate

The daily `17 3 * * *` schedule stays active and unchanged. Development occurs on
`codex/pcgsoft-auto-04e-sync-noise-runtime`; the scheduler still executes accepted
main until a human merges the implementation PR. No manual dispatch is needed
before that gate. Do not merge generated PR #7.

GitHub App migration: **DEFERRED TO AUTO-04F**. Canonical lifecycle/IDs, pending
adjudication, project-repository manifests and AUTO-05 remain out of scope.
