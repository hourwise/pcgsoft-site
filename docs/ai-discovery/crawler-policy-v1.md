# AI crawler policy seal - AEO-07

Captured 2026-08-31. This is a read-only policy classification against the
live robots response and current official vendor documentation. Cloudflare
dashboard controls were not accessible in this session, so they remain
`UNKNOWN`.

## Live policy input

The production response at [`https://pcgsoft.co.uk/robots.txt`](https://pcgsoft.co.uk/robots.txt)
returned HTTP 200 and the following exact content:

```text
# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a Content-Signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a Content-Signal = no, you may not collect content for the corresponding
#      use.
# (c)  If the website operator does not include a Content-Signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via Content-Signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content
#           from the website).
# ai-train: training or fine-tuning AI models.

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CloudflareBrowserRenderingCrawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

# END Cloudflare Managed content

User-agent: *
Allow: /

Sitemap: https://pcgsoft.co.uk/sitemap.xml
```

## Classification matrix

`EXPLICIT_BLOCK` means a named `Disallow: /` was observed. `INHERITED_ALLOW`
means no more-specific group was observed and the wildcard `Allow: /` applies at
the robots layer. `UNKNOWN` means the relevant Cloudflare account control was
not available for inspection.

| Crawler | Purpose classification | Robots state | Public edge check | Cloudflare dashboard state | Effective assessment |
|---|---|---|---|---|---|
| `GPTBot` | `TRAINING` | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Blocked by robots policy; edge enforcement not certified |
| `OAI-SearchBot` | `SEARCH_INDEX` | `INHERITED_ALLOW` | HTTP 200 via Cloudflare | `UNKNOWN` | Public reach observed; authenticated crawler/edge rule state not certified |
| OpenAI user-triggered retrieval token | `USER_RETRIEVAL` | `UNKNOWN` - no separate token identified in reviewed official OpenAI source | Not tested | `UNKNOWN` | No separately documented OpenAI user-retrieval token was identified; do not infer one |
| `ClaudeBot` | `TRAINING` | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Blocked by robots policy; edge enforcement not certified |
| `Claude-SearchBot` | `SEARCH_INDEX` | `INHERITED_ALLOW` | HTTP 200 via Cloudflare | `UNKNOWN` | Public reach observed; authenticated crawler/edge rule state not certified |
| `Claude-User` | `USER_RETRIEVAL` | `INHERITED_ALLOW` | HTTP 200 via Cloudflare | `UNKNOWN` | Public reach observed; authenticated crawler/edge rule state not certified |
| `Googlebot` | `SEARCH_INDEX` | `INHERITED_ALLOW` | HTTP 200 via Cloudflare | `UNKNOWN` | Public reach observed; authenticated crawler/edge rule state not certified |
| `Google-Extended` | `GROUNDING` and `TRAINING` control | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Keep blocked by default; no Google Search impact is expected from this token |
| `Applebot-Extended` | `OTHER` / purpose not reviewed in current official sources | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Keep blocked; no unblock decision made |
| `CCBot` | `OTHER` / purpose not reviewed in current official sources | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Keep blocked; no unblock decision made |
| `Bytespider` | `OTHER` / purpose not reviewed in current official sources | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Keep blocked; no unblock decision made |
| `meta-externalagent` | `OTHER` / purpose not reviewed in current official sources | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Keep blocked; no unblock decision made |
| `Amazonbot` | `OTHER` / purpose not reviewed in current official sources | `EXPLICIT_BLOCK` | Not tested | `UNKNOWN` | Keep blocked; no unblock decision made |

The edge checks used supplied User-Agent strings against `/` and received:

- `OAI-SearchBot`: HTTP 200, `server: cloudflare`, `cf-ray: a33dfedf0a10196c-LHR`
- `Claude-SearchBot`: HTTP 200, `server: cloudflare`, `cf-ray: a33dfee70e28196c-LHR`
- `Claude-User`: HTTP 200, `server: cloudflare`, `cf-ray: a33dfeed2cb2196c-LHR`
- `Googlebot`: HTTP 200, `server: cloudflare`, `cf-ray: a33dfef5f81a196c-LHR`

These are public reachability observations only. They do not prove the request
was an authentic vendor crawler, prove a Cloudflare rule configuration, or
override robots policy.

## Official documentation basis

- [OpenAI Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq): allow `OAI-SearchBot` for ChatGPT search discovery and disallow `GPTBot` when excluding potential training.
- [Anthropic crawler guidance](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): `ClaudeBot` is model-development/training oriented; `Claude-SearchBot` supports search; `Claude-User` supports user-directed retrieval.
- [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers): `Google-Extended` controls eligible Gemini training and grounding uses and does not affect Google Search inclusion or ranking.
- [Cloudflare managed robots.txt and Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/): `search`, `ai-input`, and `ai-train` are separate signals; `use=reference` means index, excerpt, and link back; robots preferences are not technical enforcement by themselves.
- [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/): dashboard visibility and granular AI crawler controls are separate from the robots response.

## Content Signals interpretation

- `search=yes`: search indexing and search-result hyperlinks/excerpts are permitted.
- `ai-train=no`: training or fine-tuning use is reserved against by the signal.
- `ai-input`: not present in the live signal, therefore no explicit allow/block preference is stated for real-time model input or grounding.
- `use=reference`: the current Cloudflare documentation describes this as index, excerpt, and link back; it is not a permission to reproduce the full content.

This is aligned with the stated objective **ALLOW DISCOVERY AND CITATION / DENY
MODEL TRAINING** for search and training. It is incomplete as an AI-input policy
because `ai-input` is omitted, and named crawler blocks still take precedence
for the bots explicitly listed above.

## Google-Extended decision gate

Decision: `KEEP_BLOCKED` - default, because no explicit Option B decision was
provided.

- Benefit of keeping blocked: maintains the current `ai-train=no` posture and
  does not affect ordinary Google Search.
- Cost: may limit Gemini Apps / Vertex Gemini grounding uses covered by
  `Google-Extended`.
- Option B, allowing `Google-Extended`, would permit covered grounding/use but
  could also permit broader Google-Extended uses, including future training
  where Google does not provide a separate grounding-only switch.

No Google-Extended rule was changed. If a future operator chooses to allow it,
that must be a separate policy intervention and a new measurement epoch.

## Cloudflare edge inspection boundary

The following account-level controls remain `UNKNOWN` because no authenticated
Cloudflare dashboard or API session was available:

- AI Crawl Control crawler rules and activity
- Bot Fight / Bot Management rules
- WAF custom rules
- managed robots.txt setting and policy source
- crawler-specific allow/block settings
- request logs or AI Audit evidence for the four tested agents

The four HTTP 200 checks show that the public edge did not reject those supplied
user-agent strings at the time of testing. They do not certify vendor identity
or rule state. The operator should inspect AI Crawl Control, Bot Management, and
WAF before treating edge accessibility as certified.

## Explicit search-bot rules

Classification: `EXPLICIT_RULES_NOT_REQUIRED` for this slice. The live wildcard
allow already gives `OAI-SearchBot`, `Claude-SearchBot`, `Claude-User`, and
`Googlebot` an inherited allow at the robots layer, and the public edge checks
returned 200. Explicit rules may be proposed later only if dashboard evidence
shows a real ambiguity or enforcement conflict.

No production robots or Cloudflare setting was changed.
