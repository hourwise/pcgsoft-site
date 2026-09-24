# Production manifest authority and location (AUTO-04A)

Status: accepted (AUTO-04A, merged in `cba4067`). The manifest-source and
empty-repository engine rules it called for are implemented in AUTO-04B.
Nothing here changes repository settings or the workflow schedule.

This decides where production project manifests live, what authority they
have, how projects with several repositories behave, and what must be true
before scheduled reconciliation is re-enabled. It builds on the implemented
contract in [project-manifest.md](project-manifest.md).

## Baseline (2026-09-24)

| Item | State |
|---|---|
| `pcgsoft-site` `main` / production | `eefea02` (AUTO-03 + AUTO-03F, certified) |
| Governed portfolio sync workflow | `disabled_manually` |
| "Allow GitHub Actions to create and approve pull requests" | Off |
| `main` branch protection / rulesets | None |
| Pilot manifests (unmerged pilot branches) | Reticle `b40f849` (v2), PlainSpeak-Next `00e6b44` (v2), Moirae-Protocol `0c96ec5` (v1, repository frozen) |
| Canonical registry | 29 projects; 7 have no repository; no project has more than one `primary`/`current` repository |

## Governing principle

```text
repository evidence / manifest proposal → reconciliation → human review
  → canonical PCGsoft record → publication
```

`data/projects.json` (or its eventual successor) is PCGsoft's canonical
portfolio state. A manifest is a proposal and evidence source only:

- a missing manifest does not reduce canonical authority;
- a manifest conflict never mutates canonical state;
- GitHub metadata never mutates canonical state;
- discovery never creates a canonical project;
- only a human-reviewed change to the canonical record, merged by a human,
  changes what is published.

## Location models

| Model | Strengths | Weaknesses |
|---|---|---|
| **A. Repository-owned** `.pcgsoft/project.yml` | The project states its own view. Provenance is real: the engine binds each manifest to the repository and commit that supplied it, so impersonation is detectable. Optional per repository. | Requires write access to each repository that adopts one. Frozen or unwritable repositories cannot adopt one, which is acceptable because the canonical record remains. |
| **B. Central** `pcgsoft-site/data/manifests/<project>.yml` | One place and one review flow; easy to schedule. | Its provenance is `pcgsoft-site` itself, the same repository, reviewers and PR flow as `data/projects.json`. It becomes a second, softer canonical source with no independent evidence value, and it discards the property AUTO-03 built (the source matters). |
| **C. Hybrid** (repository first, central override where needed) | Keeps repository provenance while covering exceptions. | Adds precedence rules and the same second-source risk as B, for the exceptions only. Justified only if some case needs a central production proposal (tested below). |

### Central-proposal necessity test

*What can a central production proposal express that is not better handled by
editing the canonical record through its reviewed PR process?*

| Case | Correct mechanism | Central proposal needed? |
|---|---|---|
| Frozen repository (Moirae during judging) | Canonical record; freeze is an operational rule | No |
| Legacy repository | Canonical record; `NO_MANIFEST` | No |
| Repository PCGsoft cannot write to | Canonical record; its maintainers may add a manifest later | No |
| Project with no repository (7 today) | Canonical record; nothing to reconcile | No |
| Migration (for example V1 → V2) | Pilot branch plus `--manifest-ref`, and test fixtures | No |
| Compatibility testing | `tests/fixtures/` | No |
| Temporary operational state | Operational documentation | No |

No case needs one. A central proposal authored by PCGsoft about its own
project is a canonical edit and should be made as one.

**Decision: Model A, optional. Central production manifests are not
supported. Fixtures live under `tests/fixtures/` only.**

## Production location and ref

- Path: `.pcgsoft/project.yml` in the project's repository.
- Scheduled production discovery reads it only from the repository's **default
  branch**, resolved to an exact commit SHA and verified against its git blob
  SHA (implemented in AUTO-03).
- `--manifest-ref <repo>=<sha>` exists for pilots and certification. It never
  defines production authority and is not used by the scheduled workflow.
- Offline fixtures (`--manifest-fixture`, `tests/fixtures/`) exist for
  deterministic tests only. They never take part in scheduled discovery, carry
  no repository provenance and are not canonical. This includes the synthetic
  Moirae V2 fixture.

## Optionality

Manifests are **optional**. They are encouraged for projects whose repository
is actively maintained and whose maintainers want to propose metadata.

```text
manifest exists        → reconcile it (subject to provenance and eligibility)
manifest absent        → NO_MANIFEST, a normal state, not an error
repository unmapped    → PENDING_REVIEW
repository frozen      → no manifest is fine; canonical record stands
```

Scheduled reconciliation is useful with zero manifests, so adoption is never
forced to make scheduling worthwhile.

## Edit authority

Anyone authorised to write to the source repository may propose changes
through its manifest. Repository governance decides who that is; PCGsoft adds
no manifest-specific access list. This is acceptable because:

- a manifest has no canonical or publication authority;
- provenance binds it to the real repository and commit, and the engine does
  not trust the manifest's own claims about its source;
- a manifest naming another repository's project is rejected
  (`MANIFEST_PROJECT_MISMATCH`);
- every disagreement becomes a review finding, and a human approves any
  canonical change.

The worst case from a hostile or careless manifest is review noise. Revisit
this only if a future threat model needs it.

## Projects with several repositories

Before AUTO-04B the engine reconciled each manifest on its own against the
canonical record, whichever mapped repository supplied it, and never compared
two manifests for the same project.

**Decision: Option 1, one manifest source per project.** A repository may carry
the project manifest only if its canonical role for that project is `primary`
or `current`. The canonical record, not the manifest, identifies the source.
Other repositories in the project (original, component, companion,
integration and so on) contribute lineage through the canonical record and
do not propose project metadata.

- Today every project has at most one such repository, so the rule is
  unambiguous: Moirae-Protocol, Reticle-systems and PlainSpeak-Next are all
  eligible sources.
- `fates`, `fates-integration` and `trace-capture` have only
  `integration`/`companion` repositories, so they have no manifest source until
  a human changes their canonical roles. (`trace-capture`'s single repository is
  arguably its primary; that is a canonical data decision, not a manifest one.)
- If the canonical role moves (for example a new `current` repository
  replaces an old one), eligibility moves with it in the same reviewed
  canonical change. The old repository's manifest then becomes ineligible.
- `repository.role` in a manifest stays a proposal compared against the
  canonical role. It never grants eligibility or precedence.

Option 2 (several manifests, with repository-scoped and project-scoped fields
and intra-project conflict detection) is deferred until a genuinely composite
project needs it. No current project does.

**Implemented in AUTO-04B.** A manifest from a mapped but ineligible repository
is reported as `MANIFEST_SOURCE_INELIGIBLE` and not reconciled. A project whose
canonical record names more than one `primary`/`current` repository is flagged
as `DUPLICATE_ELIGIBLE_MANIFEST_SOURCE` from the canonical mapping alone, and no
manifest for it is reconciled. Neither rule changes the three pilots, which are
all eligible.

## Frozen, legacy and external repositories

- The engine is read-only toward project repositories. It never commits,
  pushes, tags or edits them.
- The Moirae-Protocol freeze is an operational rule for people and agents
  while hackathon judging continues. It does not shape this contract, needs no
  special storage and needs no engine support.
- A frozen, legacy or external repository may simply have no production
  manifest; its canonical record is sufficient. If its legitimate maintainers
  later add one on the default branch, scheduled reconciliation consumes it
  normally.
- Moirae's pilot commit `0c96ec5` stays a certification input only. After
  judging ends, Moirae may adopt a V2 manifest like any other eligible
  repository.

## Manifest lifecycle

| Event | Expected behaviour |
|---|---|
| Introduced on the default branch | Next scheduled run reconciles it; findings go to review |
| Updated | Re-read at the new default-branch SHA and re-reconciled |
| Deleted | `NO_MANIFEST`; canonical metadata is untouched |
| Repository renamed or transferred | Canonical mapping is by URL, so the new URL is `PENDING_REVIEW` and the old one raises `EXPECTED_PUBLIC_SOURCE_NOT_DISCOVERED` until a human updates the canonical URL. The manifest cannot re-bind itself. |
| Repository replaced (new implementation) | A human updates canonical roles (for example new `current`, old `original`); eligibility follows |
| Role changed | Only through the canonical record; manifest `repository.role` is compared, never applied |
| Project retired | A human changes the canonical record; a leftover manifest is reconciled against the retired record or becomes ineligible |

GitHub's numeric repository ID is recorded as a derived fact but is not yet
stored canonically, so a deleted and recreated repository with the same name
is not detected. Storing IDs canonically is a possible future hardening.

## Failure and conflict handling

| Condition | Current behaviour | Class |
|---|---|---|
| No manifest | `NO_MANIFEST` | Normal state |
| Invalid manifest (schema) | `MANIFEST_INVALID`, listed in manifest errors; other repositories still reported | Review finding (non-blocking) |
| Unknown project slug | `MANIFEST_PROJECT_UNKNOWN`, pending review | Review finding |
| Manifest names another repository's project | `MANIFEST_PROJECT_MISMATCH`, HIGH, not reconciled | Warning |
| Unknown field | Schema rejects it (`MANIFEST_INVALID`); a validated field without a rule is `UNSUPPORTED_FIELD` and needs human approval | Review finding |
| Manifest from an ineligible repository | `MANIFEST_SOURCE_INELIGIBLE`, not reconciled (AUTO-04B) | Review finding |
| Project with more than one eligible repository | `DUPLICATE_ELIGIBLE_MANIFEST_SOURCE`, flagged from the canonical mapping; no manifest reconciled (AUTO-04B) | Review finding |
| Blob integrity failure | `SOURCE_INTEGRITY_FAILURE`, HIGH, ignored | Warning |
| Manifest fetch error (HTTP other than 404) | Recorded as a discovery error; `--write` refuses | Scheduler-blocking infrastructure error |
| Repository listing fails | Run fails | Scheduler-blocking infrastructure error |
| Empty repository (GitHub reports no commits) | `EMPTY_REPOSITORY`; no manifest fetch; `--write` proceeds (AUTO-04B) | Normal state |
| Default-branch commit lookup fails (HTTP error or malformed response) | Recorded as a discovery error; `--write` refuses | Scheduler-blocking infrastructure error |

One bad manifest does not stop reporting on other repositories. Only
infrastructure failures block the scheduled write, so a partial report is
never presented as complete.

## Scheduler relationship

Manifest adoption is **not** a scheduler prerequisite. With no manifests at
all, a scheduled run still reports newly discovered and unmapped repositories,
visibility and archive changes, privacy warnings (including expected public
sources that disappear), canonical mapping and relationship problems, and
GitHub metadata evidence such as homepages.

The schedule is disabled because review delivery fails, not because of
manifests. Each run updates the review branch (which creates a Cloudflare
preview), then fails when the repository setting blocks PR creation.

### Re-enable gate

1. The AUTO-03 engine is on `main`. Already satisfied (`eefea02`).
2. A review-PR delivery mechanism is chosen, configured and certified.
3. Automation cannot approve or merge its own change, and cannot push to
   `main`. Today `main` is unprotected and the workflow holds
   `contents: write`, so a ruleset on `main` is required whichever delivery
   option is chosen.
4. Review-branch behaviour is acceptable (name, and the stale `3666f3d`
   AUTO-01-format content is replaced on first run).
5. A manual `workflow_dispatch` run completes end to end, opens the review
   PR, and its preview passes the public-boundary smoke.
6. Only then is the recurring schedule re-enabled.

An empty repository is a normal state since AUTO-04B, so it no longer blocks a
scheduled write.

## Review-PR delivery options

| Option | Assessment |
|---|---|
| **A. Actions toggle** ("Allow GitHub Actions to create and approve pull requests") plus a ruleset on `main` | Simplest; no new credentials. The PR author is `github-actions[bot]`, which cannot approve its own PR. The toggle also lets workflows approve *other* PRs, so the ruleset must require a human approval and no workflow may approve. PRs opened with `GITHUB_TOKEN` do not trigger other workflows (there are none today; Cloudflare previews still build). |
| **B. GitHub App** | Cleanest identity and least privilege, and no repository-wide toggle. Needs an App, a private-key secret and a token-minting step. Worth it with multiple maintainers or repositories. |
| **C. Fine-grained token / bot account** | Works, but a token tied to the owner's account makes the owner the PR author, so under required review the owner cannot approve it. A separate bot account adds another identity to manage, and tokens expire and need rotation. |

**Recommendation for current scale: Option A plus a ruleset on `main`**
requiring a pull request and one approval, blocking force pushes and
deletion, with only the repository admin (the human maintainer) allowed to
bypass. On this user-owned, single-maintainer repository the maintainer
bypasses for their own PRs, which they cannot self-approve; the bot cannot
bypass. Move to Option B if more maintainers join.

## Review branch name

`codex/auto-01-portfolio-sync` is historical but now misleading, since the
branch carries AUTO-03 reports. Recommend renaming it to
`automation/portfolio-sync` in the review-delivery slice, at the same time as
certifying delivery, because the first delivered run replaces its stale
content anyway. Not renamed here.

## Decision table

| Question | Decision |
|---|---|
| Where does a production manifest live? | `.pcgsoft/project.yml` in the project's repository (Model A) |
| Is a production manifest required? | No. Optional; `NO_MANIFEST` is normal |
| Are central production manifests allowed? | No. No case needs one; fixtures live in `tests/fixtures/` only |
| Which Git ref is authoritative? | Default branch, resolved to an exact SHA; `--manifest-ref` is for pilots only |
| Who may edit a manifest? | Anyone with write access to that repository; no PCGsoft-specific list |
| How are multi-repository projects handled? | One manifest source per project: the canonical `primary`/`current` repository (enforced since AUTO-04B) |
| What happens for frozen, legacy or external repositories? | No manifest needed; canonical record stands; Moirae's freeze is an operational rule |
| What is the real scheduler re-enable gate? | Certified review-PR delivery, a ruleset on `main`, and a successful manual run; not manifest adoption |
| What authority does a manifest possess? | Proposal and evidence only; never canonical or publication authority |
| What is canonical? | `data/projects.json` (or successor) |
| How is review-PR delivery done? | Actions toggle plus a `main` ruleset (Option A); GitHub App if the team grows |
| Does manifest `repository.role` grant precedence? | No; compared against canonical roles only |

## Future implementation work (not done here)

1. Done in AUTO-04B: enforce manifest-source eligibility (`primary`/`current`) and flag
   canonical records with more than one eligible repository.
2. Done in AUTO-04B: make an empty repository (no resolvable commit) a normal state rather than
   a scheduler-blocking error.
3. Review-delivery slice: ruleset on `main`, Actions toggle, review-branch
   rename, certified manual run, then schedule re-enable.
4. Optional hardening: store GitHub repository IDs canonically.
5. Separate slices already planned: canonical lifecycle modelling, human
   adjudication of the eight open review findings, and Moirae V2 adoption after
   judging.
