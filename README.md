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

## Deployment boundary

**Primary control: the `public/` artefact.** Cloudflare Pages (project
`pcgsoft-site`, production branch `main`) is configured with:

- Build command: `npm run build`
- Build output directory: `public`

`scripts/build-public.mjs` copies only explicitly approved public artefacts and
fails the build on anything unexpected. `data/projects.json` is intentionally
public because `assets/site.js` loads it at runtime. `data/generated/` is never
public.

**Defence in depth: Cloudflare WAF.** A WAF rule on the public domains blocks
internal repository path families, including `/docs/`, `/scripts/`, `/tests/`,
`/.github/` and `/data/generated/`, plus root repository files such as
`/README.md`, `/package.json` and `/.gitignore`. The rule must **not** block
`/data/projects.json`.

The WAF is a backstop, not a replacement for the `public/` allowlist. Do not:

- revert the Pages output directory to the repository root;
- remove the public build without an equivalent allowlist replacement;
- remove the WAF rule without first checking for stale-cache or internal-path
  exposure on the public domains.

Pages build settings apply to Preview and Production alike.
