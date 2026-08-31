# Search registration baseline - AEO-08

Status: `PARTIAL_REGISTRATION_COMPLETE` is **not** asserted. Current state is
`OPERATOR_ACTION_REMAINING` because no operator Search Console or Bing results
were included for ingestion.

## Registration event

`SEARCH_REGISTRATION_V1` was **not created**. The event requires evidence that
at least one search engine accepted the existing sitemap. No such evidence was
provided in this AEO-08 request.

## Indexing baseline

Keep these layers separate:

- HTTP publication: `31` live routes observed.
- Search discovery: account-level discovery state `UNKNOWN`.
- Search indexing: account-level indexing state `UNKNOWN`.
- AI search/retrieval: `NOT_YET_COLLECTED`.
- AI entity understanding: `NOT_YET_COLLECTED`.

### Google

- Property: `UNKNOWN`
- Sitemap acceptance: `UNKNOWN`
- Indexed routes: `UNKNOWN`
- Discovered but not indexed: `UNKNOWN`
- Not discovered: `UNKNOWN`
- URL Inspection: ten required URLs recorded as `UNKNOWN` / `NOT_RUN`

### Bing

- Property verification: `UNKNOWN`
- Sitemap state: `UNKNOWN`
- Indexed routes: `UNKNOWN`
- Discovered but not indexed: `UNKNOWN`
- Not discovered: `UNKNOWN`

No complete 31-route indexing matrix has been manufactured.

## Next ingestion step

Supply the operator-visible Google and/or Bing observations. Then update the
four state artifacts, create `SEARCH_REGISTRATION_V1` only if sitemap
acceptance is evidenced, and run the exact public-search sample under the
`REGISTRATION_DAY_OBSERVATION` label. Same-day results must remain descriptive;
they are not an AEO improvement claim.
