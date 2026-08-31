# Manual AI measurement workflow — AEO_DISCOVERY_BASELINE_V1

Status: `READY_FOR_OPERATOR_RUN`; observations: `NOT_YET_COLLECTED`.

This document prepares the manual measurement pass without using a paid API,
scraping a protected model UI, or fabricating an answer. The sealed query set
remains in [`query-set-v1.json`](./query-set-v1.json), with 35 questions and
wording fixed on 2026-08-31.

## Approved systems

Run the same sealed questions manually in these public interfaces, if the
operator has access and the interface visibly identifies the model/version:

- ChatGPT
- Claude
- Gemini
- Perplexity

If a system requests a paid upgrade, exposes private material, requires UI
automation/scraping, or does not preserve the exact question wording, stop and
record the affected field as `UNKNOWN`.

## Run header

Record before the first question:

```text
runId: AEO_DISCOVERY_RUN_YYYY-MM-DD
utcTime: ISO-8601
europeLondonTime: ISO-8601
productionSha: 989a09ecf4b96e26a128d7b531fbc2f0a880602d
deploymentId: 87dee485-e51f-475b-8743-ab80730c7ce2
canonicalOrigin: https://pcgsoft.co.uk/
querySetId: AEO_DISCOVERY_QUERY_SET_V1
queryCount: 35
locale: en-GB or UNKNOWN
interfaceAndVisibleModelVersion: record exactly or UNKNOWN
```

## Per-question fields

For each of the 35 questions in each approved system, record only what was
visible in that run:

```json
{
  "runId": "AEO_DISCOVERY_RUN_YYYY-MM-DD",
  "queryId": "Q27",
  "queryText": "What is The Fates in the PCGsoft project ecosystem?",
  "system": "ChatGPT|Claude|Gemini|Perplexity",
  "modelOrVersion": "visible-version-or-UNKNOWN",
  "locale": "en-GB|UNKNOWN",
  "mentioned": "OBSERVED|NOT_OBSERVED|UNKNOWN",
  "canonicalCitation": "OBSERVED|NOT_OBSERVED|UNKNOWN",
  "githubEvidence": "OBSERVED|NOT_OBSERVED|UNKNOWN",
  "entityAccuracy": "OBSERVED|NOT_OBSERVED|UNKNOWN",
  "projectDiscovery": "OBSERVED|NOT_OBSERVED|UNKNOWN",
  "position": null,
  "competingProjects": [],
  "privateMaterialExposed": "OBSERVED|NOT_OBSERVED|UNKNOWN",
  "notes": "Short factual note only.",
  "evidenceReference": "restricted-review-record"
}
```

Do not convert “not returned in this answer” into “not indexed.” Keep separate
metrics for mention, canonical citation, repository evidence, entity accuracy,
project discovery, and private-material exposure. Do not calculate a composite
visibility score.

## Review rubric

Check whether an answer gets the public identity, aliases, project status,
repository role, parent/companion relationship, and source visibility right.
Also check the distinction between capability discovery, authorisation,
approval, policy, and execution. Record a factual correction when an answer
claims a private source, finished release, public API, live demo, or unsupported
relationship.

The existing [`manual-test-procedure.md`](./manual-test-procedure.md) remains
the governing read-only procedure for later runs.
