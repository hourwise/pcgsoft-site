import fs from "node:fs";

const origin = "https://pcgsoft.co.uk";
const footer = `<footer class="site-footer"><div class="wrap"><div class="footer-top"><div><a class="brand" href="/"><img class="brand-mark" src="/assets/mark.svg" alt=""><span class="brand-word">PCGsoft</span></a><p class="footer-tagline">Practical software for real-world operations.</p></div><nav class="footer-nav" aria-label="Footer navigation"><a href="/projects/">Projects</a><a href="/products/">Products</a><a href="/open-source/">Open source</a><a href="/creative/">Creative</a><a href="/engineering/">Engineering</a></nav></div><div class="footer-bottom"><div class="footer-meta"><span>© <span data-year="">2026</span> PCGsoft</span><span>United Kingdom</span></div><div class="footer-meta"><a href="mailto:info@pcgsoft.co.uk">info@pcgsoft.co.uk</a><a href="https://github.com/hourwise" target="_blank" rel="noopener noreferrer">GitHub</a></div></div></div></footer>`;

const pages = [
  {
    slug: "fates-integration", section: "open-source", sectionLabel: "Open source", routeLabel: "Open source / integration layer", title: "Fates Integration", type: "SoftwareSourceCode", status: "Inspection-only integration", tone: "green",
    summary: "The public integration and system-validation layer for the Fates runtime ecosystem.",
    description: "Fates Integration is the public control and evidence layer around The Fates, recording compatible checkpoints, integration slices and anti-drift checks.",
    answers: [
      ["What is Fates Integration?", "It is the public integration and system-validation layer for The Fates. It keeps the compatibility picture explicit without pretending to be a runtime."],
      ["What does it contain?", "The repository records exact checkpoints, compatibility data, integration slices and evidence for the cooperating runtime projects."],
      ["How does it relate to The Fates?", "The Fates is the umbrella identity; Fates Integration is the concrete control repository that makes the current relationship inspectable."],
      ["Current status and limits", "The current slice is inspection-only and provisional. It does not replace Ananke, Mnemosyne, Horae, Runtime Contracts or the host-facing surfaces."],
    ],
    evidence: [
      ["View the integration repository", "https://github.com/hourwise/Project-Fates-Integration", "Public control and evidence repository"],
      ["Read integration documentation", "https://github.com/hourwise/Project-Fates-Integration/tree/main/docs", "Verified docs directory"],
      ["Inspect the compatibility lock", "https://github.com/hourwise/Project-Fates-Integration/blob/main/fates-lock.json", "Verified checkpoint file"],
    ],
    related: "fates,runtime-contracts,ananke,mnemosyne,horae,moirae-console,moirae-code",
    relatedCopy: "Follow the component boundaries from the umbrella page.",
  },
  {
    slug: "trace-capture", section: "products", sectionLabel: "Products", routeLabel: "Products / companion application", title: "TRACE Capture App", type: "SoftwareApplication", status: "Early development", tone: "", parent: ["the-trace-manifest", "The Trace Manifest"],
    summary: "A local-first Android companion for capturing URLs and text for later review in The Trace Manifest.",
    description: "TRACE Capture App is a genuine companion project to The Trace Manifest. Its public architecture describes share capture, local storage, explicit save confirmation and a later sync path into the editorial workflow.",
    answers: [
      ["What is TRACE Capture?", "It is a focused Android capture surface for saving URLs and text from the system share menu so they can be reviewed later."],
      ["What is the companion relationship?", "The capture app is a companion to The Trace Manifest: capture happens locally first, while later review and publication belong to the manifest workflow."],
      ["How does it work?", "The public architecture describes a local Room database, capture and inbox modules, an explicit save confirmation and a future sync boundary."],
      ["Current status and limits", "It is early development. The page does not claim a finished release, a completed sync service or production availability."],
    ],
    evidence: [
      ["View the companion repository", "https://github.com/hourwise/Trace-Capture-App", "Public companion application repository"],
      ["Read the architecture", "https://github.com/hourwise/Trace-Capture-App/blob/main/ARCHITECTURE.md", "Verified architecture file"],
    ],
    related: "the-trace-manifest", relatedCopy: "The companion belongs beside the evidence-governed intelligence platform.",
  },
  {
    slug: "teamsphere", section: "products", sectionLabel: "Products", routeLabel: "Products / community operations", title: "TeamSphere", type: "SoftwareApplication", status: "Active development", tone: "",
    summary: "An operational platform for sports clubs and community organisations sharing one connected dataset across web and mobile.",
    description: "TeamSphere is a public project for sports clubs and community organisations. Its repository documents functional authentication, club creation, multi-club membership, roles and permissions, groups, realtime messaging and notifications, with mobile and roadmap work still in progress.",
    answers: [
      ["What is TeamSphere?", "TeamSphere is an operational platform for clubs and community organisations that need shared information across people, groups and activities."],
      ["What is already evidenced?", "The public repository documents authentication, club creation, multi-club membership, roles and permissions, groups, realtime messaging and notifications."],
      ["What is the intended shape?", "The project describes web and mobile surfaces using one connected dataset, so club operations do not have to be split between disconnected tools."],
      ["Current status and limits", "TeamSphere is in active development. Mobile work and the wider roadmap remain in progress; no production-scale availability is claimed here."],
    ],
    evidence: [["View the project repository", "https://github.com/hourwise/teamsphere", "Public project repository"]],
    related: "", relatedCopy: "TeamSphere is currently recorded as a standalone public project.",
  },
  {
    slug: "forge-arena", section: "creative", sectionLabel: "Creative", routeLabel: "Creative / agent game prototype", title: "Forge Arena", type: "VideoGame", status: "Prototype 0.1", tone: "gold", alternate: "AI Agent Robot Battle Wars",
    summary: "A deterministic text-based robot combat arena where AI agents design, build and fight under equal constraints.",
    description: "Forge Arena is the public project identity for AI Agent Robot Battle Wars. The repository describes a deterministic text-based combat prototype with an initial validated pack and a planned next iteration; no finished game or hosted demo is claimed.",
    answers: [
      ["What is Forge Arena?", "Forge Arena is a text-based robot combat arena in which AI agents design, build and fight robots under equal, deterministic constraints."],
      ["What makes the prototype distinct?", "The project focuses on repeatable rules and inspectable outcomes, so the arena can test agent decisions without relying on a hidden or changing simulation."],
      ["What is the source trail?", "The public repository is the source trail for the prototype pack and its build plan. The public identity also records the original project name for clarity."],
      ["Current status and limits", "Prototype 0.1. A later iteration is planned, but this page does not claim a finished game, release, hosted arena or public demo."],
    ],
    evidence: [["View the prototype repository", "https://github.com/hourwise/AI-Agent-Robot-Battle-Wars", "Public prototype source"]],
    related: "", relatedCopy: "Forge Arena is currently recorded as a standalone creative prototype.",
  },
  {
    slug: "gilded-bazaar", section: "creative", sectionLabel: "Creative", routeLabel: "Creative / tabletop campaign companion", title: "The Gilded Bazaar", type: "SoftwareApplication", status: "Early development", tone: "gold",
    summary: "An AI-assisted economy and downtime companion for tabletop RPG campaigns.",
    description: "The Gilded Bazaar is a campaign companion for tabletop RPG groups, with a focus on DM-managed shops, party purchases, approvals and shared campaign economy. Its implementation is private, so this page keeps the project identity and concept high-level without exposing source details.",
    answers: [
      ["What is The Gilded Bazaar?", "It is a tabletop RPG campaign companion focused on shops, party purchases, approvals and the shared economy around downtime."],
      ["Who is it for?", "The project is shaped for campaign groups and Dungeon Masters who want an explicit, shared way to manage purchases and the consequences of an economy."],
      ["What is public?", "The public record is limited to the project identity, concept and early-development status. Implementation details are intentionally not published."],
      ["Current status and limits", "Early development. It is not presented as a character-sheet replacement, finished service or generally available product."],
    ],
    evidence: [],
    related: "", relatedCopy: "The Gilded Bazaar is currently recorded as a standalone creative project.",
  },
  {
    slug: "prefixity", section: "products", sectionLabel: "Products", routeLabel: "Products / private project", title: "Prefixity", type: "SoftwareApplication", status: "Private development", tone: "",
    summary: "A PCGsoft project whose implementation remains private.",
    description: "Prefixity is recorded as a PCGsoft project identity. Its source and implementation details are private, so this page intentionally makes no claims about a public repository, API, maturity or feature set.",
    answers: [
      ["What is public?", "The public record is limited to the project identity and its private-development status."],
      ["What is not public?", "Source, implementation details, API details and maturity evidence are not published on this page."],
      ["Why keep the page?", "A restrained identity page prevents the project from disappearing from the portfolio while respecting the boundary around private implementation."],
      ["Current status and limits", "Private development. No public repository, live surface or release claim is made."],
    ],
    evidence: [], related: "", relatedCopy: "No public source or companion relationship is recorded.",
  },
  {
    slug: "vestigia-new-dawn", section: "creative", sectionLabel: "Creative", routeLabel: "Creative / private game project", title: "Vestigia: New Dawn", type: "VideoGame", status: "Early development", tone: "gold",
    summary: "A creative game project in early development.",
    description: "Vestigia: New Dawn is a PCGsoft creative project. The implementation remains private, so this public page keeps the concept and status high-level without exposing source or claiming a finished release.",
    answers: [
      ["What is public?", "The public record is limited to the project identity and an early-development status."],
      ["What is the project category?", "It is recorded as a creative game project, while the private implementation remains outside this public hub."],
      ["What does this page avoid?", "It avoids private source details, fabricated release dates, unverified screenshots and claims about finished gameplay."],
      ["Current status and limits", "Early development. No public repository, live demo or finished release is claimed."],
    ],
    evidence: [], related: "", relatedCopy: "No public source or companion relationship is recorded.",
  },
  {
    slug: "akuma-velocity", section: "creative", sectionLabel: "Creative", routeLabel: "Creative / prototype direction", title: "Akuma Velocity", type: "VideoGame", status: "Prototype direction", tone: "gold",
    summary: "A fast side-scrolling shooter direction with manga-inspired energy.",
    description: "Akuma Velocity is a high-level creative project direction for a fast side-scrolling shooter with manga-inspired energy. It is recorded as early/prototype work without a claimed public repository, release, demo or screenshot set.",
    answers: [
      ["What is Akuma Velocity?", "It is a creative direction for a fast side-scrolling shooter with manga-inspired energy and a strong sense of movement."],
      ["What is the evidence boundary?", "This page records the project identity and direction only. No public source, finished build, demo or screenshot set is claimed."],
      ["Why is it included?", "The project is part of the creative portfolio and deserves a clear, restrained identity even while the work is still at prototype direction stage."],
      ["Current status and limits", "Prototype direction. This is not a release announcement or a claim of public availability."],
    ],
    evidence: [], related: "", relatedCopy: "Akuma Velocity is currently recorded as a standalone creative direction.",
  },
];

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const page = (data) => {
  const url = `${origin}/${data.section}/${data.slug}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": data.type,
    name: data.title,
    alternateName: data.alternate || undefined,
    description: data.description,
    url,
    creator: { "@type": "Organization", name: "PCGsoft", url: `${origin}/` },
  };
  if (data.type === "SoftwareSourceCode") jsonLd.codeRepository = "https://github.com/hourwise/Project-Fates-Integration";
  const evidence = data.evidence.length
    ? `<ul class="evidence-list">${data.evidence.map(([label, href, note]) => `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${esc(label)}</a><span>${esc(note)}</span></li>`).join("")}</ul>`
    : `<p class="muted">${esc(data.description.includes("private") ? "Implementation details remain private; no public source or live surface is linked." : "No public source or live surface is recorded for this prototype direction.")}</p>`;
  const related = data.related
    ? `<div class="grid-2" data-related-projects="${data.related}"><p class="muted">Loading related projects…</p></div>`
    : `<p class="muted">${esc(data.relatedCopy)}</p>`;
  const parent = data.parent ? `<p class="small">Companion to <a class="text-link" href="/products/${data.parent[0]}/">${esc(data.parent[1])}</a>.</p>` : "";
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(data.title)} — PCGsoft</title><meta name="description" content="${esc(data.description)}"><link rel="canonical" href="${url}"><meta name="theme-color" content="#07111f"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:title" content="${esc(data.title)} — PCGsoft"><meta property="og:description" content="${esc(data.summary)}"><meta property="og:site_name" content="PCGsoft"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(data.title)} — PCGsoft"><meta name="twitter:description" content="${esc(data.summary)}"><link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css"><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="PCGsoft home"><img class="brand-mark" src="/assets/mark.svg" alt=""><span class="brand-word">PCGsoft</span></a><nav class="nav-desktop" aria-label="Primary navigation"><a href="/projects/">Projects</a><a href="/products/"${data.section === "products" ? " aria-current=\"page\"" : ""}>Products</a><a href="/open-source/"${data.section === "open-source" ? " aria-current=\"page\"" : ""}>Open source</a><a href="/creative/"${data.section === "creative" ? " aria-current=\"page\"" : ""}>Creative</a><a href="/engineering/">Engineering</a></nav><a class="button button-primary header-cta" href="mailto:phil@pcgsoft.co.uk">Discuss a project</a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-navigation" data-menu-toggle><svg class="open" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><svg class="close" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="sr-only">Menu</span></button></div><nav class="nav-mobile" id="mobile-navigation" aria-label="Mobile navigation" data-mobile-nav><a href="/projects/">Projects</a><a href="/products/">Products</a><a href="/open-source/">Open source</a><a href="/creative/">Creative</a><a href="/engineering/">Engineering</a><a href="mailto:phil@pcgsoft.co.uk">Discuss a project</a></nav></header>
<main id="main"><section class="page-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/${data.section}/">${esc(data.sectionLabel)}</a><span>${esc(data.title)}</span></nav><p class="route-label">${esc(data.routeLabel)}</p><div class="page-hero-grid"><div><h1>${esc(data.title)}</h1><p class="lead">${esc(data.summary)}</p>${parent}<p class="reviewed">Last reviewed 31 August 2026</p></div><div class="callout${data.tone ? ` ${data.tone}` : ""}"><strong class="status ${data.status.toLowerCase().includes("prototype") || data.status.toLowerCase().includes("development") ? "status-development" : data.status.toLowerCase().includes("inspection") ? "status-research" : "status-neutral"}">${esc(data.status)}</strong><p>${esc(data.description)}</p></div></div></div></section><section class="section"><div class="wrap"><div class="answer-grid">${data.answers.map(([heading, text]) => `<article class="answer"><h2>${esc(heading)}</h2><p>${esc(text)}</p></article>`).join("")}</div></div></section><section class="section section-tint"><div class="wrap grid-2"><div><p class="eyebrow">Source and evidence</p><h2 class="section-title">Keep the trail explicit.</h2>${evidence}</div><div><p class="eyebrow">Portfolio relationship</p><h2 class="section-title">A clear place in the registry.</h2>${related}</div></div></section></main>
${footer}<script type="module" src="/assets/site.js"></script></body></html>
`;
};

for (const data of pages) {
  fs.mkdirSync(`${data.section}/${data.slug}`, { recursive: true });
  fs.writeFileSync(`${data.section}/${data.slug}/index.html`, page(data), "utf8");
}
console.log(`Generated ${pages.length} reconciliation pages.`);
