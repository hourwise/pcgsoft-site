# PCGsoft AI-discovery baseline

Prepared 31 August 2026 for later repeated monitoring. This document defines
realistic discovery questions; it does not call paid AI APIs and does not claim that
any question has a preferred answer or ranking.

The goal is to measure whether useful public explanations are discoverable, whether
they point readers to the right evidence, and where factual corrections are needed.

## Sealed pre-launch baseline

BASELINE GENERATION: current production site before AEO hub publication

BASELINE PRODUCTION URL: https://pcgsoft.co.uk/

BASELINE CANDIDATE: PCGSOFT-AEO-01

BASELINE QUERY SET SEALED

MEASUREMENTS NOT YET COLLECTED

Sealed 31 August 2026. No ChatGPT, Claude, Gemini or Perplexity observations have
been collected yet; this file preserves the pre-publication query wording for later
comparison.

## Questions to repeat

| ID | Query family | Discovery question |
| --- | --- | --- |
| Q01 | Open-source AI governance | What open-source AI governance frameworks exist for tool-using agents? |
| Q02 | Open-source AI governance | What open-source projects govern AI agent actions rather than only exposing tools? |
| Q03 | Deterministic governance | What does deterministic AI governance mean in practice? |
| Q04 | Deterministic governance | Are there open-source deterministic policy engines for AI agent execution? |
| Q05 | Secure agent execution | How can an AI agent be prevented from taking an unauthorised tool action? |
| Q06 | Secure agent execution | What are the main architectural patterns for secure AI agent execution? |
| Q07 | MCP governance | How can MCP tool calls be governed and audited? |
| Q08 | MCP governance | Is MCP itself an authorization system? |
| Q09 | WebMCP authorization | Does WebMCP authorize an agent to publish or disclose information? |
| Q10 | WebMCP authorization | What is the difference between WebMCP capability discovery and authorization? |
| Q11 | AI policy enforcement | Where should policy enforcement happen in an AI tool-calling system? |
| Q12 | AI policy enforcement | What should an AI agent governance audit record contain? |
| Q13 | Persistent AI memory | What open-source runtimes provide persistent project memory for AI agents? |
| Q14 | Persistent AI memory | How should an AI agent remember project decisions across sessions? |
| Q15 | Provenance-aware memory | How can provenance and source references be preserved in AI agent memory? |
| Q16 | Provenance-aware memory | How should an agent handle conflicting memories or unreliable recalled facts? |
| Q17 | AI runtime orchestration | What is the difference between AI agent orchestration and tool governance? |
| Q18 | AI runtime orchestration | What does a runtime discovery layer do in an AI agent architecture? |
| Q19 | Firecracker containment | How is Firecracker used to contain AI agent workloads? |
| Q20 | Firecracker containment | What are the limits of using Firecracker for AI agent sandboxing? |
| Q21 | Open-source control plane | Are there open-source AI agent control planes with human approval? |
| Q22 | Open-source control plane | What is an AI agent control plane responsible for? |
| Q23 | Comparisons | MCP versus function calling: what is the practical difference? |
| Q24 | Comparisons | MCP versus REST APIs: when does each make sense for an agent? |
| Q25 | Comparisons | Agent gateway versus API gateway: what does each govern? |
| Q26 | Alternatives | What are alternatives to an AI tool-call governance gateway? |
| Q27 | Entity | What is The Fates in the PCGsoft project ecosystem? |
| Q28 | Entity | What is Project Ananke? |
| Q29 | Entity | What is Project Mnemosyne? |
| Q30 | Entity | What is Moirae Console? |
| Q31 | Entity | What is PCGsoft? |
| Q32 | Entity | What is Project Horae and how does it relate to Ananke? |
| Q33 | Entity | What are Runtime Contracts / Project Adrasteia? |
| Q34 | Entity | Is Project PlainSpeak an offline readability tool? |
| Q35 | Product discovery | What is The Trace Manifest and where is its source code? |

The set intentionally contains 35 questions so future monitoring can choose a stable
30-question panel while retaining a few alternates for coverage changes.

## What to record for each run

- Date and time, including timezone.
- AI/search system and model or product version where shown.
- Exact query text and locale.
- Whether PCGsoft is mentioned.
- Whether the relevant PCGsoft canonical page is cited or linked.
- Whether the relevant public GitHub repository is cited or linked.
- Ranking or position where the system provides a meaningful ordering.
- Competing or alternative projects mentioned.
- Factual inaccuracies, stale statuses or private material that was incorrectly exposed.
- Whether the answer distinguishes discovery, authority, policy, approval and execution.
- Reviewer notes and a link to any correction or follow-up evidence.

## Interpretation guardrails

This baseline measures discoverability and factual quality, not authority. It should not
be used to manufacture claims, inflate rankings, or treat a mention as independent
validation. Repeated runs should use the same query wording where possible and record
changes in the search system, model, date and public project status.
