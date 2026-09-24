# PCGsoft project hub

The canonical public explanation and project index for PCGsoft. This repository is
deliberately dependency-free. The static HTML, CSS, JSON and JavaScript are
authored in place; `npm run build` validates them and copies only an explicit
allowlist of public artefacts into the generated `public/` directory, which is
the Cloudflare Pages build output. Internal files (`docs/`, `scripts/`, `tests/`,
`.github/`, `data/generated/`) are never deployed. `public/` is gitignored and
must not be edited by hand.

## Local checks

```text
npm run validate
npm run build          # validate, then build the public/ artefact
npm run public:test    # deployment-boundary tests
npm run public:smoke   # HTTP smoke against public/ (or SMOKE_ORIGIN)
npm run portfolio:test
```

The project registry lives in `data/projects.json`. Project cards and related-project
links are rendered from that registry by `assets/site.js`; detail pages keep their
core explanations in HTML so they remain useful without JavaScript.

The site is currently being prepared on the local-only branch
`codex/pcgsoft-aeo-hub`. No deployment is part of this change.
