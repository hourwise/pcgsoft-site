# PCGsoft portfolio / repository reconciliation — 31 August 2026

This is the public-safe reconciliation record for the 27-repository inventory
reviewed on 31 August 2026: 22 public and 5 private. The private rows use stable
labels rather than repository names or URLs so this document can travel with a
preview artifact without exposing private source details. The operator handoff
retains the exact private names and decisions separately; none are present in the
public registry, sitemap, `llms.txt` or HTML pages.

## Classification rules

Each repository receives one primary role: `NEW_PROJECT`,
`EXISTING_PROJECT_PRIMARY_SOURCE`, `EXISTING_PROJECT_SUPPORTING_SOURCE`,
`PROJECT_COMPONENT`, `PROJECT_LINEAGE`, `SITE_INFRASTRUCTURE`,
`PRIVATE_PUBLIC_FACING_PROJECT`, `PRIVATE_INTERNAL_EXCLUDE` or `AMBIGUOUS`.

## 27-repository reconciliation

| Inventory entry | Visibility | Primary classification | Registry result |
| --- | --- | --- | --- |
| `AI-Agent-Robot-Battle-Wars` | Public | `NEW_PROJECT` | New public identity `forge-arena` / Forge Arena; public source linked; Prototype 0.1. |
| `HourWiseEU_Fleet_Portal` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Primary source for `hourwise-fleet`; public Vercel surface retained. |
| `HourWiseEUVer4` | Public | `AMBIGUOUS` | Reviewed for source association only; not linked or used as evidence for HourWise EU. |
| `Moirae-Console` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Primary source for `moirae-console`; dedicated page retained. |
| `pcgsoft-site` | Public | `SITE_INFRASTRUCTURE` | Acknowledged as the canonical hub repository; excluded from normal product counts. |
| `PlainSpeak-Next` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Current repository for the single `plain-speak` entity. |
| `Project-Adrasteia` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Public identity for `runtime-contracts`; alternate names expose Project Adrasteia and Runtime Contracts. |
| `Project-Ananke` | Public | `PROJECT_COMPONENT` | Component page `ananke`; policy, approval and execution boundary. |
| `Project-Fates-Integration` | Public | `PROJECT_COMPONENT` | Dedicated `fates-integration` page and integration role under the `fates` umbrella. |
| `Project-Horae` | Public | `PROJECT_COMPONENT` | Component page `horae`; discovery, admission and supervision boundary. |
| `Project-Mnemosyne` | Public | `PROJECT_COMPONENT` | Component page `mnemosyne`; memory and provenance boundary. |
| `Project-Moirae-Code` | Public | `PROJECT_COMPONENT` | Component page `moirae-code`; host-facing early construction surface. |
| `Project-PlainSpeak` | Public | `PROJECT_LINEAGE` | Original repository for the same `plain-speak` entity; labelled Original. |
| `Relief` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Mobile source for the single `relief` entity. |
| `Relief-WebApp` | Public | `EXISTING_PROJECT_SUPPORTING_SOURCE` | Web-app source under the same `relief` entity; no duplicate product page. |
| `Reticle-systems` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Primary source for `reticle`; public demo retained. |
| `Riff-Wilde-and-the-Sold-Out-Saga` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Primary source for `riff-wilde`; prototype status retained. |
| `teamsphere` | Public | `NEW_PROJECT` | New public identity `teamsphere`; Active development. |
| `The-Gilded-Bazaar` | Public | `NEW_PROJECT` | New public identity `gilded-bazaar`; Early development. |
| `The-Trace-Manifest` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Primary source for `the-trace-manifest`; companion graph now includes TRACE Capture. |
| `Trace-Capture-App` | Public | `PROJECT_COMPONENT` | New companion identity `trace-capture`, parented to The Trace Manifest. |
| `Whilom` | Public | `EXISTING_PROJECT_PRIMARY_SOURCE` | Primary source for `whilom`; working web MVP status retained. |
| `PRIVATE_PUBLIC_FACING_PROJECT_01` | Private | `PRIVATE_PUBLIC_FACING_PROJECT` | Public-safe identity `prefixity`; no repository, URL or implementation detail exposed. |
| `PRIVATE_PUBLIC_FACING_PROJECT_02` | Private | `PRIVATE_PUBLIC_FACING_PROJECT` | Public-safe identity `vestigia-new-dawn`; no repository, URL or implementation detail exposed. |
| `PRIVATE_PUBLIC_FACING_PROJECT_03` | Private | `PRIVATE_PUBLIC_FACING_PROJECT` | Existing Read Me a Story page retained; private source remains unlinked. |
| `PRIVATE_INTERNAL_EXCLUDE_01` | Private | `PRIVATE_INTERNAL_EXCLUDE` | Excluded from registry, sitemap, `llms.txt` and public pages. |
| `PRIVATE_INTERNAL_EXCLUDE_02` | Private | `PRIVATE_INTERNAL_EXCLUDE` | Excluded from registry, sitemap, `llms.txt` and public pages. |

## Entity result

The registry grows from 17 to 25 project identities. The eight additions are
Fates Integration, TRACE Capture App, TeamSphere, Forge Arena, The Gilded Bazaar,
Prefixity, Vestigia: New Dawn and Akuma Velocity. PlainSpeak remains one entity
with Original and Current repositories; Relief remains one entity with Mobile and
Web app sources; Fates remains the umbrella with a distinct integration page.

The public registry does not include `pcgsoft-site` as a product card, does not
link the ambiguous HourWise repository, does not mention either private internal
repository and does not publish a private repository URL.

## Validation expectations

The registry validator derives record, public-source and live-surface counts. It
checks unique IDs, slugs, canonical URLs and routes; relationship targets;
repository roles and visibility; private-source absence; public/private mismatch;
duplicate primary source claims; sitemap coverage; metadata and JSON-LD; localhost
URLs; preview canonicals; and hard-coded registry count drift.
