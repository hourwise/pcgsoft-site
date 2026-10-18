# LVRC Events portfolio entry — review acceptance

Prepared 18 October 2026. Status: implemented and tested; awaiting human marketing/publication approval. No site or application deployment is authorised by this record.

## Starting identity and isolation

- Repository: hourwise/pcgsoft-site, default/publication branch main.
- Existing checkout: D:/Users/fleur/PCGsoft pages, branch codex/pcgsoft-auto-04f-c-rollback-doc at c87408e1c9ac4e9a9d4d69e208050f7d9e036228. One unrelated untracked discovery-baseline document was preserved, along with all branch/worktree state.
- Fresh origin/main base: 4f11a46c28ec3be37f1f9fea116584afc0f1a46d.
- Isolated feature branch: codex/pcgsoft-lvrc-client-project, worktree D:/Users/fleur/LVRC payment screen/PCGsoft-portfolio-lvrc.
- The private LVRC checkout was read only. Its release branch, current launch/configuration records and feature implementation were inspected; its old main branch and stale starter README were not treated as production evidence. Authenticated GitHub metadata confirms that source remains private. No LVRC source/configuration/settings were changed.

## Public text and evidence

Page: /web-client-work/lvrc-events/, canonical https://pcgsoft.co.uk/web-client-work/lvrc-events/.

The entry describes a live client implementation developed by PCGsoft for Liverpool Victoria Rowing Club, not an open-source project or PCGsoft subscription product. Copy covers individual race entries, named four-person relays, configured eligibility, SumUp payment verification/reconciliation, booking confirmation emails, separate protected administration/reporting, spreadsheet exports and scheduled financial summaries. Technologies: TypeScript, Workers, D1, Access, SumUp and Resend. It claims no adoption statistics, performance figures, endorsement, commercial contract, ownership of the club or its participant data.

Only these client links are introduced:

- https://lvrceventspayment.co.uk
- https://lvrceventspayment.co.uk/events/vics-500-2026

Live status is supported by owner-supplied launch records of explicit public-opening approval, independently provider-verified live payment, controlled confirmation/summary email receipt, the reporting release and confirmed workbook download. Fresh anonymous HTTPS reads on 18 October confirm the public event page is reachable with a booking form, named four-person relay controls and the displayed junior school-year explanation. These reads did not submit forms, create bookings or make payments. Source inspection corroborates capabilities; it is not used as a substitute for the launch evidence. Historical pending documents are superseded by the latest release status. No new financial/delivery certification was attempted for this portfolio task.

## Changed files

- data/projects.json: one private-source, non-open-source, Live client record; no source/documentation mappings.
- web-client-work/lvrc-events/index.html: static, accessible core explanation, public CTAs, return navigation and SEO/social/JSON-LD metadata.
- web-client-work/index.html and projects/index.html: static fallback cards; existing JavaScript picks up the canonical record automatically.
- sitemap.xml and llms.txt: one canonical project route, no private source link.
- scripts/private-source-policy.mjs: shared narrow validator/reconciliation policy separating private implementation from approved public live URLs.
- scripts/validate-site.mjs and scripts/portfolio-reconcile.mjs: use the shared rule instead of treating every public website/evidence link as private-source disclosure.
- scripts/private-client-portfolio.test.mjs and package.json: eight focused regression tests, included in public:test.
- docs/project-inventory.md: document that existing privacy/publication boundary, not a new discovery/publication authority.
- .gitignore: local Playwright screenshots excluded; no client screenshots are included in the page or PR.
- This acceptance report.

## Private-source protections and automation

The public canonical record contains no private repository name, URL, branch, commit, local path, source licence or implementation identifiers. githubUrl/documentationUrl are null; repositories/documentationLinks are empty; openSource is false. For private-source records, code-host URLs, credentials/query strings in live URLs, source/documentation mappings and evidence outside explicitly listed live URLs are refused. Existing private identities remain supported.

The public-only discovery adapter, workflow permissions/schedule, manifest provenance/eligibility rules, human-review delivery mechanism and public build allowlist are unchanged. No source manifest is required or fabricated. A private repository is not mapped as a public source and is not fetched. A no-discovery reconciliation preserves this canonical record, has no false privacy/status warning and reports NO_CHANGE. Existing public discovery, eligibility, conflict and nonpublication tests pass.

Generated public/ contains45files,37indexable pages/sitemap routes and30canonical records. Internal docs/scripts/tests/workflows/generated review data stay outside public/. Public output scans contain no private source link, customer/booking/transaction identifiers, operator/reporting link, credential or infrastructure identifier introduced by this change. Existing Anyaparallax/Amped Up detail pages and all other canonical records are unchanged.

## Verification

- npm run validate: PASS,37pages/30records/37sitemap routes.
- npm run build: PASS,45allowlisted public files.
- npm run public:test: PASS,15tests (7existing public-boundary tests plus8focused regressions).
- npm run portfolio:test: PASS,121tests.
- npm run public:smoke: PASS,44positive responses match artifact bytes;14internal paths and an invalid route404. Initial sandboxed loopback fetch failed; the same smoke passed with local networking permitted.
- Desktop1440x1000 and mobile390x844 local built-page screenshots reviewed using installed Chrome through Playwright CLI. Core content and public links remain present without JavaScript (static HTML regression). No screenshots contain participant/payment data; screenshots remain local and ignored.
- Whitespace, staged privacy scan and unchanged-file comparisons recorded before commit.

## Review and publication boundary

The owner must approve client-facing marketing copy/club naming and confirm appropriate club permission before publication. No independent client endorsement or marketing permission is inferred from technical launch approval. No client screenshot permission is needed for this candidate because no screenshot is published. A human reviews the canonical edit and private-source compatibility correction; neither reconciliation nor this PR merges or publishes it automatically.

The repository has an existing Pages Git integration. Every feature commit uses the documented [CF-Pages-Skip] prefix to avoid an automatic preview deployment when pushing/opening this review PR. No hosting settings or subscriptions are changed. Official behaviour: https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message.

Do not merge this PR or deploy PCGsoft without separate approval. On an approved merge, account for the skip marker when choosing the publication commit/message; a merge into main may normally trigger Pages. Keep the site build output set to public/. LVRC remains unaffected and private throughout.
