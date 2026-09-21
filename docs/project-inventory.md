# PCGsoft project inventory

Reviewed 21 September 2026 for `PCGSOFT-REFRESH-02`. This document records the
public PCGsoft identity layer and its source boundaries. It is not a complete
inventory of the operator's private repositories or local worktrees.

## Current site baseline

| Field | Verified value |
| --- | --- |
| Website source repository | `hourwise/pcgsoft-site` |
| Production branch | `main` |
| Production source SHA at refresh start | `29f8f028af86893f09ba2c2162decf3cc9ffeead` |
| Registry records after candidate update | 29 |
| Categories | Products; Open source; Creative; Web & Client Work |
| Category counts | Products 10; Open source 11; Creative 6; Web & Client Work 2 |
| Canonical origin | `https://pcgsoft.co.uk/` |

## Public project identities

The registry contains 29 public project identities. A project identity may be
source-linked, live-surface-linked, private-source, or intentionally source-free.

### Products — 10

HourWise EU; HourWise Fleet Portal; Atlas AI; Reticle Systems; Relief; Whilom;
The Trace Manifest; TRACE Capture App; TeamSphere; Prefixity.

### Open source — 11

The Fates; Project Ananke; Project Mnemosyne; Project Horae; Runtime Contracts /
Project Adrasteia; Moirae Console; Project Moirae Code; PlainSpeak; Fates
Integration; Moirae Protocol; Moirae Accord.

### Creative — 6

Read Me a Story; Riff Wilde and the Sold Out Saga; Forge Arena; The Gilded
Bazaar; Vestigia: New Dawn; Akuma Velocity.

### Web & Client Work — 2

Anyaparallax; Amped Up Music Promotions.

This category identifies studio-built websites and applications for real people,
organisations or client-facing projects. It does not imply PCGsoft ownership of
those projects as products.

## Source boundaries

| Boundary | Registry treatment |
| --- | --- |
| Public source | Public GitHub or other verified public source may be linked from the project page. |
| Mixed source | Public companion repositories may be linked where the project record distinguishes them. |
| Private source | The project identity may remain public, but no private repository URL, branch, commit, local path or implementation detail is exposed. |
| Unknown / none | The page records only the evidence that has been verified; repository existence is not inferred from a project identity. |
| Pending public launch | A declared domain may be shown as planned or launch-pending; it is not added to `liveUrls` without verified public availability. |

The Gilded Bazaar is intentionally a public creative identity with
`sourceVisibility: private`, no `githubUrl`, no repository entry and no public
source evidence link. Anyaparallax and Amped Up Music Promotions are public
source-linked Web & Client Work records, but their declared domains are not
represented as live surfaces in the registry.

## Evidence notes for the September additions

- **Moirae Protocol** is a submitted Agents for Humans Hackathon build. Its
  public page links the repository, Devpost submission, demo video and
  hackathon. The copy describes the integrated architecture and bounded
  provider/reconciliation experiment without resolving the differing strength
  of GitHub and Devpost claims about live provider characterization.
- **Moirae Accord** records the accepted ACCORD-02 research/specification
  package. The page explicitly separates specification/research from a future
  verifier, runtime, authority provider, settlement owner or completed empirical
  experiment.
- **Anyaparallax** is V1 development with public launch pending. Development
  foundations are described without claiming a public gallery, production
  commerce or payments.
- **Amped Up Music Promotions** is active V1 development with public launch
  pending. Development foundations are described without claiming production
  payments, ticket issuance, QR validation, door scanning, email delivery or
  production database certification.
- **The Trace Manifest** is recorded as a live public surface under controlled
  rollout, distinguishing published public material from governed or gated
  capabilities.

## Public source inventory notes

The authenticated refresh inventory found 25 public GitHub repositories owned by
`hourwise`, plus six private repositories. The PCGsoft registry is intentionally
smaller than that account inventory: some repositories are components, lineage,
site infrastructure, supporting evidence or not yet canonical PCGsoft projects.
`HourWiseEUVer4` remains unassociated with the current HourWise EU product.

The site repository itself is infrastructure, not a project card. Local feature
branches and worktrees may contain newer implementation work, but they do not
override the public default branch for publication claims.
