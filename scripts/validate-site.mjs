import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const notes = [];

function fail(message) { failures.push(message); }
function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }
function exists(relative) { return fs.existsSync(path.join(root, relative)); }
function attr(html, selector) {
  const match = html.match(selector);
  return match ? match[1] : null;
}
function htmlPathToRoute(relative) {
  const normalized = relative.replaceAll(path.sep, "/");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) return `/${normalized.slice(0, -"/index.html".length)}/`;
  return `/${normalized}`;
}
function routeToFile(route) {
  if (route === "/") return "index.html";
  if (route.endsWith("/")) return `${route.slice(1)}index.html`;
  return route.slice(1);
}
function internalTargetToFile(target) {
  if (target === "/") return "index.html";
  if (target.endsWith("/")) return `${target.slice(1)}index.html`;
  return target.slice(1);
}

const registry = JSON.parse(read("data/projects.json"));
if (!Array.isArray(registry) || registry.length === 0) fail("data/projects.json must contain project records");
const slugs = registry.map((record) => record.slug);
if (new Set(slugs).size !== slugs.length) fail("project registry contains duplicate slugs");
const sitePaths = registry.map((record) => record.sitePath);
if (new Set(sitePaths).size !== sitePaths.length) fail("project registry contains duplicate sitePath values");
const canonicalUrls = registry.map((record) => record.canonicalUrl);
if (new Set(canonicalUrls).size !== canonicalUrls.length) fail("project registry contains duplicate canonicalUrl values");

const allowedRepositoryRoles = new Set(["primary", "component", "integration", "web-app", "companion", "original", "current", "evidence", "documentation"]);
const allowedVisibility = new Set(["public", "private", "unknown"]);
const allowedCategories = new Set(["products", "open-source", "creative", "web-client"]);
const requiredFields = ["slug", "name", "shortName", "alternateNames", "category", "categoryLabel", "status", "summary", "description", "sitePath", "canonicalUrl", "liveUrls", "repositories", "documentationLinks", "parentProject", "sourceVisibility", "openSource", "licence", "technologies", "lastReviewed", "featured", "relatedProjects", "evidenceLinks"];
const primaryRepositoryClaims = new Map();
for (const record of registry) {
  for (const field of requiredFields) if (!(field in record)) fail(`${record.slug || "unknown"} is missing ${field}`);
  if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(record.sitePath)) fail(`${record.slug} has an unstable sitePath: ${record.sitePath}`);
  if (!/^https:\/\/pcgsoft\.co\.uk\/.+\/$/.test(record.canonicalUrl)) fail(`${record.slug} has an invalid canonicalUrl`);
  if (record.githubUrl && !/^https:\/\/github\.com\/hourwise\/[A-Za-z0-9._-]+$/.test(record.githubUrl)) fail(`${record.slug} has an unexpected GitHub URL`);
  if (!allowedCategories.has(record.category)) fail(`${record.slug} has an unknown category ${record.category}`);
  if (!Array.isArray(record.alternateNames) || !Array.isArray(record.liveUrls) || !Array.isArray(record.repositories) || !Array.isArray(record.documentationLinks) || !Array.isArray(record.technologies)) fail(`${record.slug} has an invalid array field`);
  if (!["public", "private", "mixed", "none", "unknown"].includes(record.sourceVisibility)) fail(`${record.slug} has an invalid sourceVisibility`);
  if (record.parentProject !== null && !slugs.includes(record.parentProject)) fail(`${record.slug} has an unknown parentProject ${record.parentProject}`);
  if (record.parentProject === record.slug) fail(`${record.slug} cannot be its own parentProject`);
  if (record.sourceVisibility === "private" && (record.githubUrl || record.repositories.length || record.liveUrls.length || record.evidenceLinks.length)) fail(`${record.slug} has public links despite private sourceVisibility`);
  for (const liveUrl of record.liveUrls) if (!/^https:\/\//.test(liveUrl)) fail(`${record.slug} has an invalid live URL`);
  for (const item of record.repositories) {
    if (!item || !item.name || !item.url || !allowedRepositoryRoles.has(item.role) || !allowedVisibility.has(item.visibility)) fail(`${record.slug} has an invalid repository entry`);
    if (item.visibility !== "public") fail(`${record.slug} exposes a non-public repository entry`);
    if (!/^https:\/\/github\.com\/hourwise\/[A-Za-z0-9._-]+$/.test(item.url)) fail(`${record.slug} has an unexpected repository URL`);
    if (item.role === "primary") {
      if (primaryRepositoryClaims.has(item.url) && primaryRepositoryClaims.get(item.url) !== record.slug) fail(`repository ${item.url} has duplicate primary claims`);
      primaryRepositoryClaims.set(item.url, record.slug);
    }
  }
  for (const item of record.documentationLinks) if (!item?.label || !/^https:\/\//.test(item.url)) fail(`${record.slug} has an invalid documentation link`);
  for (const related of record.relatedProjects || []) if (!slugs.includes(related)) fail(`${record.slug} relates to unknown project ${related}`);
}

const allFiles = walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const indexableHtmlFiles = htmlFiles.filter((file) => path.basename(file) !== "404.html");
const indexableRoutes = new Set(indexableHtmlFiles.map((file) => htmlPathToRoute(path.relative(root, file))));

for (const file of indexableHtmlFiles) {
  const relative = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  const route = htmlPathToRoute(relative);
  const title = attr(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description = attr(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const canonical = attr(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const ogUrl = attr(html, /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
  if (!title || title.length < 12) fail(`${route} is missing a useful title`);
  if (!description || description.length < 50) fail(`${route} is missing a useful meta description`);
  if (canonical !== `https://pcgsoft.co.uk${route}`) fail(`${route} has canonical ${canonical || "(missing)"}`);
  if (ogUrl !== canonical) fail(`${route} has an Open Graph URL mismatch`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(`${route} must contain exactly one H1`);
  if (/<meta\s+name=["']robots["'][^>]*noindex/i.test(html)) fail(`${route} is accidentally noindex`);
  if (/target=["']_blank["']/i.test(html) && !/rel=["'][^"']*noopener/i.test(html)) fail(`${route} contains a target=_blank link without noopener`);

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) fail(`${route} is missing JSON-LD`);
  for (const [, block] of jsonLdBlocks) {
    try { JSON.parse(block.trim()); } catch { fail(`${route} contains malformed JSON-LD`); }
  }

  for (const [, href] of html.matchAll(/href=["'](\/[^"]*)["']/gi)) {
    const target = href.split("#")[0].split("?")[0];
    if (!target || target.startsWith("//")) continue;
    const targetFile = internalTargetToFile(target);
    if (!exists(targetFile)) fail(`${route} links to missing local target ${target}`);
  }
}

const sitemap = read("sitemap.xml");
const sitemapRoutes = new Set([...sitemap.matchAll(/<loc>https:\/\/pcgsoft\.co\.uk([^<]*)<\/loc>/g)].map(([, route]) => route));
for (const route of indexableRoutes) if (!sitemapRoutes.has(route)) fail(`sitemap.xml is missing ${route}`);
for (const route of sitemapRoutes) if (!indexableRoutes.has(route)) fail(`sitemap.xml contains non-indexable or missing route ${route}`);
if (!sitemap.includes("<urlset") || !sitemap.includes("schemas/sitemap/0.9")) fail("sitemap.xml is not a valid sitemap document");

const robots = read("robots.txt");
if (!/^User-agent: \*\s*$/m.test(robots) || !/^Allow: \/\s*$/m.test(robots)) fail("robots.txt must allow public crawling");
if (!robots.includes("https://pcgsoft.co.uk/sitemap.xml")) fail("robots.txt must point to sitemap.xml");

const inspectedTextFiles = allFiles.filter((file) => /\.(html|css|js|mjs|json|xml|txt)$/.test(file));
for (const file of inspectedTextFiles) {
  const relative = path.relative(root, file);
  const contents = fs.readFileSync(file, "utf8");
  if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(contents)) fail(`${relative} contains a localhost URL`);
  if (/github\.com\/hourwise\/The-Gilded-Bazaar/i.test(contents)) fail(`${relative} exposes the private Gilded Bazaar repository URL`);
}

if (/\b\d+ projects shown\b/i.test(read("projects/index.html"))) fail("projects/index.html contains a hard-coded registry count");
if (/<strong[^>]+data-(?:registry-count|public-source-count|live-count)[^>]*>\s*\d+\s*</i.test(read("index.html"))) fail("index.html contains a hard-coded registry stat");

if (!exists("docs/ai-discovery-baseline.md")) fail("docs/ai-discovery-baseline.md is missing");
if (!exists("llms.txt")) notes.push("llms.txt is present as a registry navigation aid");

if (failures.length) {
  console.error(`PCGsoft validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    htmlPages: indexableRoutes.size,
    registryRecords: registry.length,
    sitemapUrls: sitemapRoutes.size,
    notes
  }, null, 2));
}
