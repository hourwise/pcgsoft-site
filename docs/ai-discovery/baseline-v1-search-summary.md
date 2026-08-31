# AEO_DISCOVERY_BASELINE_V1 — search-registration observation summary

Recorded 2026-08-31 at 17:17:27 UTC / 18:17:27 Europe/London.

This is a read-only public-search sample attached to the reconciled production
baseline. It is not a Search Console export, Bing Webmaster export, AI-model
measurement, ranking claim, or indexing claim.

## Production evidence

- Production SHA: `989a09ecf4b96e26a128d7b531fbc2f0a880602d`
- Cloudflare Pages deployment: `87dee485-e51f-475b-8743-ab80730c7ce2`
- Canonical origin: `https://pcgsoft.co.uk/`
- `https://pcgsoft.co.uk/`: HTTP 200, canonical `https://pcgsoft.co.uk/`
- `https://pcgsoft.co.uk/sitemap.xml`: HTTP 200, 31 URLs
- `https://pcgsoft.co.uk/robots.txt`: HTTP 200, sitemap directive present
- Repository `main` and `origin/main`: both resolve to the production SHA
- `git diff --check`: passed

## Public-search result

The search tool surfaced the PCGsoft homepage for the brand query and for some
entity-qualified queries, including Mnemosyne, Moirae, and Trace Capture. Other
exact entity queries returned no PCGsoft result or returned an unrelated result.
The bare `site:pcgsoft.co.uk` query produced conflicting results on repeat, so
its status is `UNKNOWN`.

The complete per-query record is in
[`baseline-v1-search-observations.json`](./baseline-v1-search-observations.json).

The search surface was a public read-only web-search tool whose underlying
provider/engine and locale were not exposed. Results therefore remain
observations of that sample only.

## Robots observation

The live robots file contains a general `User-agent: *` section with
`Content-Signal: search=yes,ai-train=no,use=reference` and `Allow: /`, plus a
second general `Allow: /` and the sitemap directive. It also explicitly
disallows these named user agents:

- `Amazonbot`
- `Applebot-Extended`
- `Bytespider`
- `CCBot`
- `ClaudeBot`
- `CloudflareBrowserRenderingCrawler`
- `Google-Extended`
- `GPTBot`
- `meta-externalagent`

This is an existing production configuration observation. No robots, HTML,
CSS, JavaScript, registry, sitemap, DNS, or Cloudflare configuration was
changed by AEO-06. The named AI-crawler disallows should be reviewed by the
operator before any separate production decision; they are not silently
treated as an indexing failure.

## Measurement boundary

- Search Console registration/status: `OPERATOR_VERIFICATION_REQUIRED`
- Bing Webmaster registration/status: `OPERATOR_VERIFICATION_REQUIRED`
- Sitemap submission status: `UNKNOWN` until the operator opens the verified properties
- URL Inspection/indexing-request status: `NOT_RUN` because property access was unavailable
- IndexNow key/submission status: `NOT_CONFIGURED_OR_NOT_EVIDENCED`
- AI model visibility measurements: `NOT_YET_COLLECTED`
- Composite score: intentionally not calculated
