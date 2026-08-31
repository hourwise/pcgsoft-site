# Manual AI and public-search test procedure

Use this procedure for later observation runs. It is intentionally manual and
read-only: do not scrape model UIs, create paid API calls or infer an answer that
was not visible to the reviewer.

## Before the run

1. Copy the run ID, UTC and Europe/London time, public canonical, production SHA,
   deployment ID, query-set ID and query count into the run record.
2. Load `query-set-v1.json`; do not rewrite, optimise or substitute the sealed text.
3. Record the public search interface, locale and visible product/model version.
4. Confirm that the run is not using private repositories, private pages or
   unpublished implementation material as evidence.

## Search-interface pass

Run the exact public-search queries in `t0-search-observations.json` plus the 35
sealed questions where the interface supports natural-language search. For every
result, record:

- exact query and interface;
- whether PCGsoft is mentioned;
- the surfaced PCGsoft URL, if any;
- whether the URL is the correct canonical entity page;
- public repository URL, if one is cited;
- visible position/order and a short factual note;
- `OBSERVED`, `NOT_OBSERVED` or `UNKNOWN` for each field.

“Not returned in this result set” is `NOT_OBSERVED`, not “not indexed”. Do not use a
single search result as evidence of authority, ranking or model knowledge.

## AI-answer pass

For each selected query and each approved public model interface, paste only the
sealed question. Save the visible answer and source links in the operator’s
restricted evidence store, then put only the structured result in the repository:

```json
{
  "runId": "AEO_DISCOVERY_RUN_YYYY-MM-DD",
  "queryId": "Q27",
  "queryText": "What is The Fates in the PCGsoft project ecosystem?",
  "system": "manual-interface-name",
  "modelOrVersion": "visible-version-or-UNKNOWN",
  "locale": "en-GB",
  "mentioned": "OBSERVED",
  "canonicalCitation": "OBSERVED",
  "githubEvidence": "OBSERVED",
  "entityAccuracy": "OBSERVED",
  "projectDiscovery": "OBSERVED",
  "position": null,
  "competingProjects": [],
  "privateMaterialExposed": "NOT_OBSERVED",
  "notes": "The answer distinguishes discovery from authority and execution.",
  "evidenceReference": "restricted-review-record"
}
```

Use `NOT_OBSERVED` only when the reviewer checked and did not see the item. Use
`UNKNOWN` when the interface did not expose enough information. Never fill a gap
with a plausible citation or an assumed model response.

## Review rubric

Check identity, aliases, status, repository role, parent/companion relationship,
source visibility and the distinction between capability discovery, policy,
approval and execution. Mark a factual correction when the answer claims a private
source, finished release, public API, live demo or relationship not supported by the
current public registry.

## Stop conditions

Stop the run if the interface requests an account upgrade or paid API, if private
material appears, if a model UI would need scraping, or if the operator cannot
preserve exact query wording. Report the limitation as `UNKNOWN`.
