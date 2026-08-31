# Google Search Console state - AEO-07

Status: `OPERATOR_ACTION_REMAINING`

Captured 2026-08-31 at 18:15:27 UTC / 19:15:27 Europe/London.

The authenticated browser was unavailable in this session (`[]`). No protected
login was automated, no credentials or tokens were requested, and no account
state was fabricated.

## Current state

- Property requested: `pcgsoft.co.uk`
- Property classification: `UNKNOWN` (`DOMAIN PROPERTY`, `URL PREFIX PROPERTY`, or `NOT PRESENT`)
- Verification: `UNKNOWN`
- Verification method: `UNKNOWN`
- Sitemap submission: `UNKNOWN`
- Sitemap last read: `UNKNOWN`
- Discovered URL count: `UNKNOWN`
- Processing status, warnings, errors: `UNKNOWN`
- URL Inspection: `NOT_RUN`
- Indexing requests: `NOT_RUN`

Repository search found no `google-site-verification` evidence. Existing AEO
records state that Search Console was not connected.

## Operator action

1. Open [Google Search Console](https://search.google.com/search-console) and
   sign in interactively.
2. Select or add the Domain property `pcgsoft.co.uk`. Google documents Domain
   properties as covering protocols and subdomains and using DNS verification.
3. If Google requests a DNS TXT record, stop and provide the exact record for
   separate operator authorization. Do not change DNS in this workstream.
4. Once verified, inspect the existing sitemap
   `https://pcgsoft.co.uk/sitemap.xml`. Submit it only if it is not already
   registered; do not create a duplicate submission.
5. Record submission state, last read, discovered URL count, processing status,
   warnings, and errors. Submission is not proof of indexing.
6. Inspect the ten URLs in `google-url-inspection-v1.json`. For each, record
   `URL_KNOWN_TO_GOOGLE`, `INDEXED`, `LAST_CRAWL`, `CRAWL_ALLOWED`,
   `INDEXING_ALLOWED`, `USER_CANONICAL`, `GOOGLE_CANONICAL`,
   `PAGE_FETCH_STATUS`, and `WARNINGS`.
7. If an important new page is not indexed and the UI offers **Request
   indexing**, make at most one request for that URL and record the result.

Google's current guidance places sitemap submission/monitoring in the Sitemaps
report and individual crawl requests in URL Inspection:

- [Add a website or platform property](https://support.google.com/webmasters/answer/34592?hl=en)
- [Top tasks for Search Console users](https://support.google.com/webmasters/answer/10351509?hl=en)
