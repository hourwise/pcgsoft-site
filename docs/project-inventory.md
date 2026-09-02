# PCGsoft project inventory

Reviewed 31 August 2026 from the authenticated `hourwise` GitHub inventory and the
public PCGsoft site. This is a local working record for publication decisions; it is
not a promise that every public repository belongs on the PCGsoft site.

## Starting site and deployment evidence

| Field | Verified value |
| --- | --- |
| Website source repository | `hourwise/pcgsoft-site` |
| Repository visibility | Public |
| Default branch | `main` |
| Starting local SHA | `b95a42796a03ac4305218993b3dc262b4919948e` |
| Cloudflare Pages project | `pcgsoft-site` |
| Pages domains | `pcgsoft-site.pages.dev`, `pcgsoft.co.uk`, `www.pcgsoft.co.uk` |
| Production branch | `main` |
| Latest production source | `b95a427` |
| Latest production deployment | `e0654b23-d9ba-4ef7-9571-41171228cf73` |
| Latest deployment URL | `https://e0654b23.pcgsoft-site.pages.dev` |
| Package/build baseline | Dependency-free static HTML; no build command was present in the source repository |

## Public repositories reviewed

The account inventory contained 27 repositories: 22 public and 5 private. The public
repositories below were checked for identity, visibility, top-level evidence and
current fit. The registry intentionally includes only projects with a clear public
description and a useful PCGsoft route.

| Public repository | Registry decision | Current public evidence / classification |
| --- | --- | --- |
| `Project-Fates-Integration` | Included as The Fates | Public control repository; provisional, inspection-only integration; open source |
| `Project-Moirae-Code` | Included | Public README documents Stage-A inspection-only host; open source |
| `The-Trace-Manifest` | Included | Public Astro/Cloudflare project and live platform; product/open source |
| `PlainSpeak-Next` | Included as PlainSpeak | Public MIT successor; deterministic presentation and review engine with layered document/integrity architecture; open source |
| `Moirae-Console` | Included | Public Apache-2.0 completed WebMCP hackathon reference implementation; open source |
| `Whilom` | Included | Public web MVP and heritage platform documentation; product |
| `Project-Horae` | Included | Public TypeScript discovery and supervision runtime; open source |
| `Project-Mnemosyne` | Included | Public TypeScript governed memory runtime; open source |
| `Project-Ananke` | Included | Public MIT governance runtime; open source |
| `Project-Adrasteia` | Included as Runtime Contracts | Public MIT contracts-only package; open source |
| `HourWiseEU_Fleet_Portal` | Included | Public fleet portal with a Vercel homepage; product |
| `Relief` | Included | Public MIT mobile prototype; product |
| `Relief-WebApp` | Combined into Relief page | Public companion website source; product surface |
| `Project-PlainSpeak` | Not a separate page | Public upstream/earlier PlainSpeak lineage; represented by `PlainSpeak-Next` |
| `teamsphere` | Omitted pending review | Public repository, but no clear current PCGsoft canonical classification was established |
| `AI-Agent-Robot-Battle-Wars` | Omitted pending review | Public repository, but outside the current canonical service/product/open-source taxonomy |
| `HourWiseEUVer4` | Not linked as current source | Public repository exists, but the current HourWise EU implementation association is not confirmed |
| `Trace-Capture-App` | Omitted pending review | Public repository; README evidence was insufficient for a canonical page |
| `Riff-Wilde-and-the-Sold-Out-Saga` | Included | Public Godot/GDScript prototype; creative |
| `Reticle-systems` | Included | Public product with a deterministic planning core evidenced on the Phoenix branch; planned domain coming soon |
| `pcgsoft-site` | Source repository | Current website source; not a project card |
| `The-Gilded-Bazaar` | Omitted pending review | Public repository, but no clear current PCGsoft canonical classification was established |

## Excluded from the public registry

Five account repositories were private at review time. They are excluded from the
registry and from all public links. No private repository URL, source content or
implementation detail is recorded in the public site.

The candidate **Akuma Velocity** did not appear in the 27-repository inventory and was
not given a new page. Any future page needs an explicit public source or operator
approval for a public description.

Other candidate projects backed only by private repositories were not published.
Their names, URLs and implementation details are intentionally omitted from this
publication-facing working tree.

## Included registry routes

The canonical local registry is `data/projects.json`. It currently contains product,
open-source and creative records for the following routes:

- `/products/hourwise-eu/`
- `/products/hourwise-fleet/`
- `/products/atlas-ai/`
- `/products/reticle/`
- `/products/relief/`
- `/products/whilom/`
- `/products/the-trace-manifest/`
- `/open-source/fates/`
- `/open-source/ananke/`
- `/open-source/mnemosyne/`
- `/open-source/horae/`
- `/open-source/runtime-contracts/`
- `/open-source/moirae-console/`
- `/open-source/moirae-code/`
- `/open-source/plain-speak/`
- `/creative/read-me-a-story/`
- `/creative/riff-wilde/`
