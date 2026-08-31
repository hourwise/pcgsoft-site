# Bing Webmaster Tools state — AEO-06

Status: `OPERATOR_VERIFICATION_REQUIRED`

Recorded 2026-08-31. The in-app browser was unavailable in this session, so no
Bing account, property, sitemap, URL Inspection, or IndexNow submission state
was asserted. No Bing verification token or Webmaster configuration is
present in the repository evidence.

## Exact operator action

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters/) and sign in.
2. Add or select the domain property `https://pcgsoft.co.uk/` / `pcgsoft.co.uk`.
3. If the property is already verified in Google Search Console, the operator
   may use Bing's **Import from Google Search Console** flow after reviewing
   and authorising the requested account access.
4. Otherwise, choose a normal Bing ownership-verification method. If a DNS
   record is required, stop and provide the exact record for separate operator
   approval; do not edit DNS here.
5. Submit exactly:
   `https://pcgsoft.co.uk/sitemap.xml`
6. Record the visible processing status, submission/discovered dates, URL
   count, and warnings/errors. A sitemap submission is not an indexing claim.
7. Use Bing URL Inspection only if the verified property exposes it, and keep
   any requests bounded to the same seven priority URLs listed in
   `search-console-state.md`.

## Evidence fields to return

```text
property: pcgsoft.co.uk / UNKNOWN
verified: OBSERVED | NOT_OBSERVED | UNKNOWN
verificationMethod: import | HTML | DNS | meta | UNKNOWN
sitemap: submitted | not submitted | UNKNOWN
sitemapStatus: visible status or UNKNOWN
discoveredUrlCount: number or UNKNOWN
urlInspection: per-URL status or NOT_RUN
indexnow: configured | not configured | UNKNOWN
operatorEvidenceReference: reference to the operator's screenshot/export
```

Bing's current documentation says verified sites can be imported from Google
Search Console, sites can also be added manually, and the Sitemaps tool records
processing status and discovered URLs:

- [Add and Verify site](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)
- [Sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)
