# PCGSOFT-AEO-04 report

Date: 31 August 2026

This report covers two bounded tracks: the first post-launch discovery observation
and the feature-branch portfolio/repository reconciliation. It does not claim model
visibility uplift or search-engine indexation.

## A. Starting production state

- Production canonical: <https://pcgsoft.co.uk/>
- Production branch: `main`
- Production SHA: `ca1d7c4d16256d34e998d5f75d4653c5ddb50c40`
- Production deployment: `a4222e92-5985-490c-aaca-6d9781e68fd2`
- Previous hub state: 17 registry records and 23 sitemap URLs.
- Duplicate-domain observation: apex, `www` and Pages host returned 200 and
  canonicalised to the apex. Classification: `CANONICAL_CORRECT` /
  `REDIRECT_NORMALIZATION_NOT_IMPLEMENTED`, non-blocking.

## B. T0 discovery identity

`PCGSOFT_AEO_T0` was recorded at `2026-08-31T12:21:10.1128129Z` UTC /
`2026-08-31T13:21:10.1128129+01:00` Europe/London against the production SHA and
deployment above. The sealed set is `AEO_DISCOVERY_QUERY_SET_V1` with 35 exact
questions. Pre-launch model measurements are `NOT_COLLECTED`.

## C. Technical crawl result

The production sitemap returned 23 URLs. All 23 returned HTTP 200 with a final URL,
title, canonical, one H1, text availability and JSON-LD. This is retrieval and
page-structure evidence, not an indexation result.

## D. Crawler-policy review

The live policy is wildcard `Allow: /` plus the canonical sitemap. Googlebot,
Bingbot, OpenAI OAI-SearchBot/OAI-AdsBot and Anthropic ClaudeBot/Claude-User are
classified `ALLOWED` by the current wildcard rule. Other crawlers are
`NOT_SPECIFICALLY_ADDRESSED`. The review used [Google's Googlebot guidance](https://developers.google.com/search/docs/crawling-indexing/googlebot),
[Google's robots specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec),
[Bing's Bingbot guidance](https://www.bing.com/webmasters/help/how-to-report-an-issue-with-bingbot-25c19802),
[OpenAI's publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
and [Anthropic's crawler guidance](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).

No robots, DNS, Cloudflare, Search Console or Webmaster configuration was changed.

## E. Public-search observation

Broad `site:pcgsoft.co.uk` and `PCGsoft` searches returned the PCGsoft homepage.
Fates and section-prefix searches returned the homepage without consistently
surfacing the dedicated route. Ananke, Mnemosyne, Moirae Console and PlainSpeak
queries did not surface a relevant PCGsoft route in the observed result sets.
These results are recorded as `NOT_OBSERVED` at that time and `UNKNOWN` for index
status. No model UI was scraped and no paid AI API was used.

## F. Indexing evidence

Search Console, Bing Webmaster Tools and IndexNow were not connected or submitted.
Current account/submission state is `UNKNOWN`; a human operator can perform
verification, sitemap submission and URL inspection later.

## G. Repository inventory

The GitHub inventory was reconciled read-only at 27 repositories: 22 public and 5
private. The complete public-safe mapping is in
`docs/project-reconciliation-2026-08-31.md`. The canonical hub repository is
classified as `SITE_INFRASTRUCTURE`, not a normal product.

## H. Portfolio decisions

- The Fates remains one umbrella entity. Fates Integration now has a dedicated
  public component page and an explicit integration/system-validation role.
- Project Adrasteia and Runtime Contracts remain one entity with both names exposed.
- PlainSpeak remains one entity with `Project-PlainSpeak` labelled Original and
  `PlainSpeak-Next` labelled Current.
- Relief remains one entity with mobile and web-app repository roles.
- TRACE Capture App is a genuine companion identity parented to The Trace Manifest.
- HourWise EU remains source-unverified; the ambiguous public repository is not
  linked as current evidence.
- The fleet public source is the public Fleet Portal repository; private source is
  not exposed.
- Prefixity, Vestigia: New Dawn and Read Me a Story have public-safe identities;
  private implementation details and private repositories remain unlinked.
- Two private internal projects are excluded from public output.
- Akuma Velocity is listed as an early/prototype creative direction with no source,
  release, demo or screenshot claim.

## I. Registry result

The registry grows from 17 to 25 entities. New identities are Fates Integration,
TRACE Capture App, TeamSphere, Forge Arena, The Gilded Bazaar, Prefixity, Vestigia:
New Dawn and Akuma Velocity. The expanded schema supports alternate names, live
URL arrays, repository arrays with roles, documentation links, parent projects,
source visibility and review dates while retaining legacy aliases for compatibility.

## J. Public routes and metadata

Eight new detail routes were added under the existing Products, Open source and
Creative sections. Each has a stable trailing-slash canonical, unique title and
description, Open Graph URL, one H1, JSON-LD, source/status boundary and internal
navigation. Sitemap and `llms.txt` were regenerated to include the new routes.

## K. Validation and visual review

- `npm.cmd run validate`: passed — 31 indexable HTML pages, 25 registry records,
  31 sitemap URLs.
- Local smoke pass: all listed routes HTTP 200, missing route HTTP 404, custom 404
  present, mobile navigation wired.
- Node syntax checks: passed for site JavaScript, validator, crawl observer and
  page generator.
- Browser review: desktop registry, mobile registry, Fates Integration and
  private-safe Prefixity pages rendered without overflow or broken layout. New
  card statuses, long descriptions and responsive navigation were inspected.

## L. Feature branch and preview

All source changes are on `codex/pcgsoft-portfolio-reconciliation`, created from
the exact production `main` SHA. The branch is the only permitted publication target
for this track. Cloudflare Git integration reported a successful preview for
commit `e4ac7572c45db05342c02ff8920e2fc7b7dfa93b`:

- Deployment ID: `c8259478-f055-4996-9b13-4366e02afec6`
- Exact deployment preview: <https://c8259478.pcgsoft-site.pages.dev>
- Branch preview alias: <https://codex-pcgsoft-portfolio-reco.pcgsoft-site.pages.dev>
- Environment: Pages preview / non-production

The preview sitemap and all 31 routes returned HTTP 200. All route canonicals point
to `https://pcgsoft.co.uk/`; no `pages.dev` canonical and no private-source hit was
observed. The branch preview pattern follows Cloudflare Pages' documented Git
integration and preview-deployment behaviour ([Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/),
[preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)).

## M. Recommendations and stop condition

- Discovery observatory: `OBSERVATION_BASELINE_READY`.
- Portfolio reconciliation: `READY_FOR_HUMAN_PORTFOLIO_REVIEW`.

No production merge, production deployment, DNS change, Cloudflare configuration
change, repository visibility change, private-source exposure or AI visibility uplift
claim is authorised by this report. Stop before production promotion.
