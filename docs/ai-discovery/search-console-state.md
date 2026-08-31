# Google Search Console state — AEO-06

Status: `OPERATOR_VERIFICATION_REQUIRED`

Recorded 2026-08-31. The in-app browser was unavailable in this session, and
no Search Console account state can be inferred from HTTP responses or from the
repository. The repository contains no `google-site-verification` evidence and
the existing AEO records state that Search Console was not connected.

## Exact operator action

1. Open [Google Search Console](https://search.google.com/search-console) and
   sign in with the account that owns `pcgsoft.co.uk`.
2. Select or add the Domain property `pcgsoft.co.uk` (the Domain property is
   preferred because it covers protocols and subdomains).
3. If Google requests DNS TXT verification, stop at that point and provide the
   exact TXT record for separate operator approval. Do not add or change DNS
   from this workstream.
4. Once the property is verified, submit exactly:
   `https://pcgsoft.co.uk/sitemap.xml`
5. Record the visible sitemap status, last-read time, discovered URL count,
   and any errors or warnings. A submitted sitemap is not an indexing claim.
6. Use URL Inspection for this bounded priority set, at most once per URL in
   this setup run:

   - `https://pcgsoft.co.uk/`
   - `https://pcgsoft.co.uk/open-source/`
   - `https://pcgsoft.co.uk/open-source/fates/`
   - `https://pcgsoft.co.uk/open-source/mnemosyne/`
   - `https://pcgsoft.co.uk/open-source/moirae-console/`
   - `https://pcgsoft.co.uk/products/trace-capture/`
   - `https://pcgsoft.co.uk/creative/akuma-velocity/`

   If the UI offers **Request indexing**, the operator may use it once for a
   priority URL and must record the resulting status. Do not resubmit
   repeatedly or claim indexing from a request acknowledgement.

## Evidence fields to return

```text
property: pcgsoft.co.uk / UNKNOWN
verified: OBSERVED | NOT_OBSERVED | UNKNOWN
sitemap: submitted | not submitted | UNKNOWN
sitemapStatus: visible status or UNKNOWN
sitemapLastRead: timestamp or UNKNOWN
discoveredUrlCount: number or UNKNOWN
urlInspection: per-URL status or NOT_RUN
indexingRequests: per-URL status or NOT_RUN
operatorEvidenceReference: reference to the operator's screenshot/export
```

Google's current documentation describes Domain properties as DNS-verified,
the Sitemaps report as the place to submit/monitor a sitemap, and URL
Inspection as the place to request a crawl for an individual page:

- [Add a website or platform property to Search Console](https://support.google.com/webmasters/answer/34592?hl=en)
- [Top tasks for Search Console users](https://support.google.com/webmasters/answer/10351509?hl=en)
