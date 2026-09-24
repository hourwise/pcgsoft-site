import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildPublic, checkPublicArtefact, routeToFile, sitemapRoutes } from "./build-public.mjs";

const root = path.resolve(".");
const tempDir = (label) => fs.mkdtempSync(path.join(os.tmpdir(), `pcgsoft-${label}-`));
const walk = (directory, base = directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(absolute, base) : [path.relative(base, absolute).split(path.sep).join("/")];
});

function built() {
  const outDir = path.join(tempDir("public"), "public");
  return { outDir, result: buildPublic({ root, outDir }) };
}

test("public build contains the required public artefacts", () => {
  const { outDir, result } = built();
  for (const file of ["index.html", "404.html", "assets/site.js", "data/projects.json", "robots.txt", "sitemap.xml", "llms.txt"]) {
    assert.ok(fs.existsSync(path.join(outDir, file)), `${file} should be public`);
  }
  assert.deepEqual(result.failures, []);
  const registry = JSON.parse(fs.readFileSync(path.join(outDir, "data/projects.json"), "utf8"));
  assert.deepEqual(registry, JSON.parse(fs.readFileSync(path.join(root, "data/projects.json"), "utf8")));
});

test("every sitemap route resolves inside the public build", () => {
  const { outDir, result } = built();
  const routes = sitemapRoutes(outDir);
  assert.ok(routes.length > 0);
  for (const route of routes) assert.ok(fs.existsSync(path.join(outDir, routeToFile(route))), `${route} should resolve`);
  assert.equal(result.htmlPages, routes.length);
  assert.equal(result.sitemapUrls, routes.length);
});

test("internal repository paths are absent from the public build", () => {
  const { outDir } = built();
  for (const forbidden of [
    ".github", "docs", "scripts", "tests", "package.json", "package-lock.json", ".gitignore", "README.md", "data/generated",
    "docs/portfolio-sync/project.example.yml", ".github/workflows/portfolio-sync.yml", "scripts/sync-portfolio.mjs", "tests/fixtures/portfolio-sync",
  ]) assert.equal(fs.existsSync(path.join(outDir, forbidden)), false, `${forbidden} must not be public`);
  assert.deepEqual(fs.readdirSync(path.join(outDir, "data")), ["projects.json"]);
  assert.equal(walk(outDir).some((file) => /\.(?:mjs|md|ya?ml)$/.test(file)), false);
});

test("generated sync artefacts in the repository never reach the public build", () => {
  const fakeRoot = tempDir("root");
  for (const file of ["404.html", "index.html", "llms.txt", "robots.txt", "data/projects.json", "assets/site.js",
    "data/generated/portfolio-sync-report.json", "docs/portfolio-sync/portfolio-sync-report.md"]) {
    fs.mkdirSync(path.dirname(path.join(fakeRoot, file)), { recursive: true });
    fs.writeFileSync(path.join(fakeRoot, file), file.endsWith(".json") ? "[]" : "<title>x</title>");
  }
  fs.writeFileSync(path.join(fakeRoot, "sitemap.xml"), '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://pcgsoft.co.uk/</loc></url></urlset>');
  for (const directory of ["creative", "engineering", "open-source", "products", "projects", "web-client-work"]) fs.mkdirSync(path.join(fakeRoot, directory));
  const outDir = path.join(tempDir("fake-out"), "public");
  buildPublic({ root: fakeRoot, outDir });
  assert.equal(fs.existsSync(path.join(outDir, "data/generated")), false);
  assert.equal(fs.existsSync(path.join(outDir, "docs")), false);
});

test("public build fails closed on unapproved files and unsafe output paths", () => {
  const fakeRoot = tempDir("unsafe");
  const skipped = new Set([".git", ".kilo", ".wrangler", "public", "node_modules"]);
  fs.cpSync(root, fakeRoot, { recursive: true, filter: (source) => !skipped.has(path.relative(root, source).split(path.sep)[0]) });
  fs.writeFileSync(path.join(fakeRoot, "products", "notes.md"), "internal");
  assert.throws(() => buildPublic({ root: fakeRoot, outDir: path.join(tempDir("unsafe-out"), "public") }), /unapproved file type/);
  assert.throws(() => buildPublic({ root, outDir: root }), /contains the repository/);
  assert.throws(() => buildPublic({ root, outDir: path.dirname(root) }), /contains the repository/);
  assert.throws(() => buildPublic({ root, outDir: path.join(root, "docs") }), /must be \.\/public/);
});

test("boundary check reports stray internal files in an output directory", () => {
  const { outDir } = built();
  fs.mkdirSync(path.join(outDir, "scripts"));
  fs.writeFileSync(path.join(outDir, "scripts", "sync-portfolio.mjs"), "internal");
  const check = checkPublicArtefact(outDir);
  assert.ok(check.failures.some((failure) => /unapproved file in public output: scripts\/sync-portfolio\.mjs/.test(failure)));
  assert.ok(check.failures.some((failure) => /internal path present in public output: scripts$/.test(failure)));
});

test("public build is deterministic", () => {
  const first = built().outDir;
  const second = built().outDir;
  const files = walk(first).sort();
  assert.deepEqual(walk(second).sort(), files);
  for (const file of files) assert.ok(fs.readFileSync(path.join(first, file)).equals(fs.readFileSync(path.join(second, file))), `${file} should be byte-identical`);
});
