# PCGsoft AEO-02 preview certification record

Prepared 31 August 2026 for the controlled preview of the PCGsoft project hub.
This is an evidence record for the candidate branch and does not authorize
production publication.

## Content decisions

### HourWise EU source association

HOURWISE_EU_SOURCE_ASSOCIATION: UNVERIFIED

The public product surface at `https://www.hourwiseeu.co.uk` is retained as the
current evidence link. The public `HourWiseEU_Fleet_Portal` repository documents a
fleet compliance and operations portal, not the main HourWise EU product source.
The older public `HourWiseEUVer4` repository is identifiable by name but has no
positive source linkage in the inspected metadata or current candidate history.
Neither repository is labelled as the current HourWise EU source. The registry
therefore keeps `githubUrl` empty for HourWise EU until a positive association is
verified.

### Atlas AI

ATLAS_AI_PAGE: ACCEPTED

The page is intentionally evidence-light. It describes Atlas AI as an in-development
operational-assistant direction, provides no fabricated source link, makes no user,
adoption, production-readiness or open-source claim, and explicitly states that no
public implementation or API is currently recorded.

### Omitted repositories

The curated omission of other public repositories is accepted for this slice. The
PCGsoft hub is not an automatic GitHub index; later classification requires a clear
public description and a useful canonical route.

## Baseline

- Query set: `docs/ai-discovery-baseline.md`
- Query count: 35 stable questions
- Baseline generation: current production site before AEO hub publication
- Baseline candidate: `PCGSOFT-AEO-01`
- State: `BASELINE QUERY SET SEALED`
- Measurements: `MEASUREMENTS NOT YET COLLECTED`

## Publication boundary

This certification permits a preview from the feature branch only. Production branch,
custom domains, DNS, repository visibility, Cloudflare project configuration and
production deployments remain out of scope.

## AEO-03 production publication event

This section is a local, post-publication evidence note. It is intentionally not
included in the production source commit and must not be pushed without a new
bounded review.

```text
AEO HUB PRODUCTION PUBLICATION DATE: 31 August 2026
PREVIOUS_PRODUCTION_GIT_SHA: b95a42796a03ac4305218993b3dc262b4919948e
PREVIOUS_CLOUDFLARE_DEPLOYMENT: e0654b23-d9ba-4ef7-9571-41171228cf73
CERTIFIED_CANDIDATE_SHA: ca1d7c4d16256d34e998d5f75d4653c5ddb50c40
PRODUCTION_CANDIDATE_SHA: ca1d7c4d16256d34e998d5f75d4653c5ddb50c40
PRODUCTION_DEPLOYMENT_ID: a4222e92-5985-490c-aaca-6d9781e68fd2
PRODUCTION_DEPLOYMENT_ENVIRONMENT: Production
PRODUCTION_DEPLOYMENT_BRANCH: main
PRODUCTION_DEPLOYMENT_SOURCE: ca1d7c4
PRODUCTION_DEPLOYMENT_URL: https://a4222e92.pcgsoft-site.pages.dev
PRODUCTION_CANONICAL_IDENTITY: https://pcgsoft.co.uk/
PRE-LAUNCH AI DISCOVERY QUERY SET: 35 queries
PRE-LAUNCH MEASUREMENTS: NOT COLLECTED
AUTOMATIC_GIT_DEPLOYMENT: CONFIRMED
```

The sealed query wording remains unchanged. No before/after AI discovery or
ranking measurement is claimed by this note.
