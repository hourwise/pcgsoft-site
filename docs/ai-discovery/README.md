# PCGsoft AEO observatory

This directory contains the first post-launch observation record for the PCGsoft
project hub and the repeatable procedure for later discovery checks. It is an
evidence log, not an AI ranking claim.

## T0 identity

| Field | Value |
| --- | --- |
| Observation ID | `PCGSOFT_AEO_T0` |
| Classification | First post-launch observation |
| UTC | `2026-08-31T12:21:10.1128129Z` |
| Europe/London | `2026-08-31T13:21:10.1128129+01:00` |
| Production SHA | `ca1d7c4d16256d34e998d5f75d4653c5ddb50c40` |
| Production deployment | `a4222e92-5985-490c-aaca-6d9781e68fd2` |
| Canonical identity | <https://pcgsoft.co.uk/> |
| Sitemap | <https://pcgsoft.co.uk/sitemap.xml> |
| Sealed query set | `AEO_DISCOVERY_QUERY_SET_V1`, 35 questions |
| Pre-launch model measurements | `NOT_COLLECTED` |

The pre-launch wording is preserved in `docs/ai-discovery-baseline.md` and copied
verbatim into `query-set-v1.json`. No ChatGPT, Claude, Gemini or Perplexity model
observations are represented as if they existed.

## Technical crawl observation

`t0-crawl-observations.json` records anonymous HTTP GET observations of every URL
listed by the production sitemap. The production sitemap returned 23 URLs and all
23 returned HTTP 200. Each observed route had a final URL, title, canonical, one
H1, text content and JSON-LD. This is crawlability evidence, not an indexing result.

## Crawler-policy review

The live `robots.txt` was observed as:

```text
User-agent: *
Allow: /

Sitemap: https://pcgsoft.co.uk/sitemap.xml
```

The classification below describes the current wildcard rule. It does not change
robots.txt and does not imply that a crawler will index a page.

| Crawler or family | Classification | Basis |
| --- | --- | --- |
| Googlebot | `ALLOWED` | Wildcard `Allow: /`; Google documents Googlebot and the Robots Exclusion Protocol in its [crawler guidance](https://developers.google.com/search/docs/crawling-indexing/googlebot) and [robots specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec). |
| Bingbot | `ALLOWED` | Wildcard `Allow: /`; Bing states that Bingbot reads and honours robots.txt in its [Bingbot guidance](https://www.bing.com/webmasters/help/how-to-report-an-issue-with-bingbot-25c19802). |
| OpenAI OAI-SearchBot / OAI-AdsBot | `ALLOWED` | No OpenAI-specific disallow group is present, so the wildcard applies. OpenAI identifies OAI-SearchBot as the crawler for public search discovery in its [publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq). |
| Anthropic ClaudeBot / Claude-User | `ALLOWED` | No Anthropic-specific disallow group is present, so the wildcard applies. Anthropic documents its bots and robots.txt controls in [its crawler guidance](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler). |
| Any other crawler | `NOT SPECIFICALLY ADDRESSED` | The wildcard permits access, but no claim is made about the identity, conduct or indexing behaviour of an unverified crawler. |

Google explicitly distinguishes crawling from indexing and notes that robots.txt is
not a mechanism to guarantee exclusion or inclusion in search. The same distinction
is retained here: `ALLOWED` means permitted to request the URL, not found, indexed,
ranked or cited.

## Public search observation

`t0-search-observations.json` records exact public-search queries and only what the
configured search interface returned. The PCGsoft homepage was observed for broad
brand and site-prefix searches. Dedicated project pages were inconsistently or not
observed. All index-status fields remain `UNKNOWN`; no result absence is treated as
proof of non-indexation.

No Search Console, Bing Webmaster Tools or IndexNow account was created, connected or
submitted to. Their current account/submission state is `UNKNOWN`; a human operator
could perform account verification, sitemap submission and URL inspection later.

## Measurement definitions

The observatory uses five separate measures, reported by query and by run:

- `MENTION_RATE`: relevant answers that mention PCGsoft or the requested PCGsoft entity / eligible answers.
- `CITATION_RATE`: relevant answers that cite or link the correct canonical PCGsoft page / answers that mention PCGsoft.
- `GITHUB_EVIDENCE_RATE`: relevant answers that cite the correct public repository where one is recorded / answers that cite a PCGsoft project.
- `ENTITY_ACCURACY_RATE`: answers with correct project identity, status, relationship, source visibility and authority boundary / answers containing a PCGsoft entity.
- `PROJECT_DISCOVERY_RATE`: sealed project-discovery queries where the correct project page or source trail is surfaced / eligible project-discovery queries.

Each numerator and denominator must be written beside the rate. There is no universal
combined “AEO score”; a missing denominator, a ranking-only number or an unobserved
model response is not reported as a win.

## Repeat schedule

Keep the exact query wording and run the same panel at `T0`, `T+7`, `T+14`, `T+28`
and `T+56` days. Record the system, model or search interface, locale, date/time,
result ordering where available, citations, factual errors and private-material
exposure. A future reconciled production promotion may be labelled
`AEO_DISCOVERY_BASELINE_V1`; this T0 record remains the technical baseline for the
production state observed on 31 August 2026.

## Domain behaviour

The apex, `www` and Pages deployment host were observed to return 200 with a
canonical pointing to the apex identity. This is classified as
`CANONICAL_CORRECT` with `REDIRECT_NORMALIZATION_NOT_IMPLEMENTED`. It is a
non-blocking observation for this baseline, not a reason to alter DNS, Cloudflare
configuration or production routing in this work.
