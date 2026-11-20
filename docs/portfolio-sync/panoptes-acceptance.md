# Panoptes portfolio entry — review acceptance

Prepared 20 November 2026. Status: implemented, tested offline and certified live; awaiting human review. Nothing is published, merged or deployed by this record.

## Source identity

- Public source repository: hourwise/panoptes, default branch `main`, MIT licensed (Copyright 2026 PCGsoft).
- Pinned commit for every claim in this change: `589ac42fa14112d51f8019c28474f87a9f7a65b1` (the repository's only commit, titled "Panoptes 0.6.0"). The README states Version 0.6.0.
- Source manifest: `.pcgsoft/project.yml`, blob SHA `5615dd49cf2baae752db80b27ebc9fa4445c31fe`, read from an exported tree of the pinned commit rather than the network. The blob hash was reproduced locally with `git hash-object` before the fixture was built, so the reconciliation cannot silently read a different manifest.
- Manifest identity fields: slug `panoptes`, name `Panoptes`, category `open-source`, status `Active development`, `repository.role: primary`, `activity.enabled: false`, `publication.eligible: false`, no live URLs, no alternate names, no parent or related projects.
- The registry summary is the manifest summary byte for byte, which is what makes the summary field reconcile instead of conflicting.

## Public text and evidence

Page: `/open-source/panoptes/`, canonical `https://pcgsoft.co.uk/open-source/panoptes/`, built on the structure of the PlainSpeak open-source page.

Implemented claims are limited to what the pinned tree contains: hardware telemetry, per-engine inference telemetry behind per-type adapters, engine profile preview/apply/rollback, twice-confirmed container controls behind the guarded root helper, agent-harness job history and worker counts, and the read-only lab comparisons. Guardian, multi-GPU discovery on headless servers, Windows/macOS support and harnesses beyond OMP appear only under a labelled Roadmap section and again in the FAQ as not available. The page states there is no hosted instance, no account and no public URL, that the server binds the loopback interface only, and that outbound telemetry, a build step, third-party front-end dependencies and publishing automation are out of scope by design rather than unfinished.

Only these links are introduced, each checked against the exported tree of the pinned commit before it was written down:

- `https://github.com/hourwise/panoptes`
- `https://github.com/hourwise/panoptes/blob/main/README.md`
- `https://github.com/hourwise/panoptes/blob/main/LICENSE`
- `https://github.com/hourwise/panoptes/blob/main/.pcgsoft/project.yml`
- `https://github.com/hourwise/panoptes/tree/main/docs`
- `https://github.com/hourwise/panoptes/blob/main/docs/INSTALL.md`
- `https://github.com/hourwise/panoptes/blob/main/docs/SECURITY.md`

No version numbers beyond the published 0.6.0, no performance figures, no adoption or benchmark claims, and no commit SHA appear in the website copy. Commit and blob identifiers live in this note and the offline fixtures only. The page never prints a loopback URL; it says the server prints its own loopback address, which also keeps the copy clear of the validator's loopback rule.

## Changed files

- `data/projects.json`: one new `panoptes` record — open source, public source visibility, `Active development`, one `primary` public repository, docs directory as `documentationUrl`, four evidence links, three documentation links, `liveUrl` null and `liveUrls` empty.
- `open-source/panoptes/index.html`: static project page with the shared header/footer, canonical and social metadata, `SoftwareSourceCode` JSON-LD with `codeRepository`, the SPDX MIT licence and `programmingLanguage`.
- `open-source/index.html`: static no-JS fallback card in the existing open-source grid. The client-side renderer picks up the canonical record by category, so no other listing was edited.
- `sitemap.xml` and `llms.txt`: one canonical project route and one additional-project line under "Additional public projects".
- `docs/project-inventory.md`: the open-source identity list gains Panoptes and its count rises to 12. The September baseline table itself moves to the current 31 records with the updated category counts, and a one-line note records the LVRC and Panoptes additions.
- This acceptance note.

No script, workflow, test or fixture in the site repository needed a change: no test counts registry records, and the sitemap/page/JSON expectations all moved with the registry entry.

## Expected reconciliation outcomes

Run offline against the pinned tree only (fixtures held outside the site checkout, passed through `--github-json` and `--manifest-fixture`; `--dry-run`, so nothing was written):

- Provenance: `panoptes@589ac42f…5b1 .pcgsoft/project.yml blob 5615dd49…31fe (fixture, VERIFIED)`, classification `SOURCE_IDENTITY_MATCH`, proposal outcome `NO_CANONICAL_CHANGE_PROPOSED`.
- Manifest source eligibility for the project: `SINGLE_ELIGIBLE_SOURCE`, one eligible repository (`panoptes`, role `primary`).
- `AGREEMENT` (11): `project.name`, `project.slug`, `project.category`, `project.summary`, `project.status`, `project.statusLabel`, `project.parentProject`, `project.relatedProjects`, `repository.role`, `web.state`, `web.urls`. `project.status` agrees on the derived value `active-development` with canonical label `Active development`; `web.state` agrees on `none` and `web.urls` on the empty set.
- `INFORMATIONAL` (4, proposal-only metadata, never compared or applied): `project.lastReviewed`, `publication.eligible`, `publication.notes`, `activity.enabled`.
- `NOT_PROPOSED` (1): `project.alternateNames`, because the manifest proposes no alternate names; the canonical empty list is unchanged.
- Zero `CONFLICT`, zero `UNCOMPARABLE`, zero relationship warnings, zero live-surface or status anomalies, zero manifest or discovery errors, and `panoptes` listed under "No change".
- `report.result` is `PROPOSED_CHANGES` with `hasMaterialDrift: true`. Both come from the fixture, not from Panoptes: this offline fixture contains only `hourwise/panoptes`, so every other registry record with a public source reports `HIGH` `EXPECTED_PUBLIC_SOURCE_NOT_DISCOVERED` (23 of them). That is an artifact of a deliberately partial offline fixture and not evidence about those projects; a full live run replaces it.

## Verification

- `npm run portfolio:test`: PASS, 121 tests, 0 failures (baseline 121/121).
- `npm run validate`: PASS, 38 indexable pages, 31 registry records, 38 sitemap URLs, no notes (immediately-before baseline: 37 pages/30 records/37 URLs).
- `npm run build`: PASS, 46 allowlisted `public/` files, 38 HTML pages, 38 sitemap URLs — the sitemap count rose by exactly one.
- `npm run portfolio:sync -- --dry-run --github-json <fixture> --manifest-fixture <fixture>`: exit 0, report above, nothing written.
- The offline harness requires both fixture paths to resolve inside the site checkout, so the two fixtures were copied into the git-ignored `public/` output directory for the run and deleted afterwards; their originals are in the review task directory with the captured report. `git status` after the run shows only the five edited files and the new page directory.

## Review and publication boundary

- Publication needs a human. `.github/CODEOWNERS` assigns every path to the human owner `@hourwise`, and active ruleset `23957714` has `require_code_owner_review: true` (docs/portfolio-sync/README.md). An automation identity may hold API permission to submit a generic `APPROVE` review, but it is not a Code Owner and can never satisfy that approval; GitHub App delivery notes say the same (docs/portfolio-sync/github-app-delivery.md).
- This change is proposed on branch `add-panoptes-registration`. Nothing here merges, writes `data/generated/`, runs `portfolio:sync` in write mode or deploys the site.
- The supervisor owns the live reconciliation with `--manifest-ref` for `panoptes`, the review-PR delivery, and any publication decision. Do not merge or deploy PCGsoft on the strength of this note.
- Wording decision resolved by Phil on 20 November 2026: `docs/project-inventory.md` now updates the September baseline table itself to the current 31 records, and the additions section is reduced to a one-line note of the change.

## Live certification (20 November 2026)

`npm run portfolio:sync -- --dry-run --manifest-ref panoptes=589ac42fa14112d51f8019c28474f87a9f7a65b1`, run against live
GitHub on this branch:

- `panoptes@589ac42… .pcgsoft/project.yml blob 5615dd49… (pinned-override, VERIFIED) → SOURCE_IDENTITY_MATCH →
  panoptes: NO_CANONICAL_CHANGE_PROPOSED`.
- Every comparable field agrees, the related projects agree, and there are no conflicts, privacy warnings or human-approval items for
  Panoptes.
- The run's overall `PROPOSED_CHANGES` comes only from findings that were already present on `main` (`c088c8d`) before this
  change, confirmed by the same live run there: five AnyaParallax manifest conflicts and one `EXPECTED_PUBLIC_SOURCE_NOT_DISCOVERED`
  warning for `hourwise-fleet`.
- On `main`, Panoptes is already discovered as `SOURCE_NOT_CANONICALLY_MAPPED`, which this registration resolves.
