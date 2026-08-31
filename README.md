# PCGsoft project hub

The canonical public explanation and project index for PCGsoft. This repository is
deliberately dependency-free: Cloudflare Pages serves the static HTML, CSS, JSON,
and JavaScript directly from the repository root.

## Local checks

```text
npm run validate
npm run build
```

The project registry lives in `data/projects.json`. Project cards and related-project
links are rendered from that registry by `assets/site.js`; detail pages keep their
core explanations in HTML so they remain useful without JavaScript.

The site is currently being prepared on the local-only branch
`codex/pcgsoft-aeo-hub`. No deployment is part of this change.
