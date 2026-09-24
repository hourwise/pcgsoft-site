#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Allowlist: only these repository paths are public web artefacts. Everything
// else (docs, scripts, tests, workflows, generated sync data) stays internal.
export const PUBLIC_FILES = [
  "404.html",
  "data/projects.json",
  "index.html",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
];
export const PUBLIC_DIRECTORIES = [
  "assets",
  "creative",
  "engineering",
  "open-source",
  "products",
  "projects",
  "web-client-work",
];
const PUBLIC_DIRECTORY_EXTENSIONS = new Set([".css", ".gif", ".html", ".ico", ".jpeg", ".jpg", ".js", ".png", ".svg", ".webp", ".woff", ".woff2"]);

export const REQUIRED_PUBLIC_FILES = [
  "404.html",
  "assets/site.js",
  "data/projects.json",
  "index.html",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
];
export const FORBIDDEN_PUBLIC_PATHS = [
  ".git",
  ".github",
  ".github/workflows/portfolio-sync.yml",
  ".gitignore",
  ".wrangler",
  "README.md",
  "data/generated",
  "data/generated/github-portfolio-snapshot.json",
  "data/generated/portfolio-sync-report.json",
  "docs",
  "docs/portfolio-sync/portfolio-sync-report.md",
  "docs/portfolio-sync/project.example.yml",
  "node_modules",
  "package-lock.json",
  "package.json",
  "scripts",
  "scripts/sync-portfolio.mjs",
  "tests",
  "tests/fixtures/portfolio-sync",
];

const toPosix = (value) => value.split(path.sep).join("/");

function assertSafeOutDir(root, outDir) {
  const resolvedRoot = path.resolve(root);
  const resolvedOut = path.resolve(outDir);
  const relative = path.relative(resolvedOut, resolvedRoot);
  if (resolvedOut === resolvedRoot || !relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error(`refusing to use ${resolvedOut} as public output: it contains the repository`);
  }
  const insideRoot = path.relative(resolvedRoot, resolvedOut);
  if (!insideRoot.startsWith("..") && !path.isAbsolute(insideRoot) && insideRoot !== "public") {
    throw new Error(`public output inside the repository must be ./public, not ./${toPosix(insideRoot)}`);
  }
  if (fs.existsSync(resolvedOut) && fs.lstatSync(resolvedOut).isSymbolicLink()) throw new Error("public output must not be a symbolic link");
  return resolvedOut;
}

function copyApprovedFile(source, destination, relative) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`public artefact ${relative} must be a regular file`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function listDirectoryFiles(root, directory) {
  const absolute = path.join(root, directory);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`public directory ${directory} must be a real directory`);
  const files = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`public directory contains a symbolic link: ${relative}`);
    if (entry.name.startsWith(".")) throw new Error(`public directory contains a hidden file: ${relative}`);
    if (entry.isDirectory()) files.push(...listDirectoryFiles(root, relative));
    else if (!PUBLIC_DIRECTORY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) throw new Error(`public directory contains an unapproved file type: ${relative}`);
    else files.push(relative);
  }
  return files;
}

export function listPublicSourceFiles(root = repositoryRoot) {
  for (const file of PUBLIC_FILES) if (!fs.existsSync(path.join(root, file))) throw new Error(`required public file is missing: ${file}`);
  return [...PUBLIC_FILES, ...PUBLIC_DIRECTORIES.flatMap((directory) => listDirectoryFiles(root, directory))].sort();
}

function walkOutput(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkOutput(absolute, base) : [toPosix(path.relative(base, absolute))];
  }).sort();
}

export function sitemapRoutes(outDir) {
  const sitemap = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf8");
  return [...sitemap.matchAll(/<loc>https:\/\/pcgsoft\.co\.uk([^<]*)<\/loc>/g)].map(([, route]) => route);
}

export function routeToFile(route) {
  if (route === "/") return "index.html";
  return route.endsWith("/") ? `${route.slice(1)}index.html` : route.slice(1);
}

export function checkPublicArtefact(outDir) {
  const failures = [];
  const files = walkOutput(outDir);
  for (const file of files) {
    const allowed = PUBLIC_FILES.includes(file) || PUBLIC_DIRECTORIES.some((directory) => file.startsWith(`${directory}/`));
    if (!allowed) failures.push(`unapproved file in public output: ${file}`);
  }
  for (const file of REQUIRED_PUBLIC_FILES) if (!fs.existsSync(path.join(outDir, file))) failures.push(`required public file missing: ${file}`);
  for (const forbidden of FORBIDDEN_PUBLIC_PATHS) if (fs.existsSync(path.join(outDir, forbidden))) failures.push(`internal path present in public output: ${forbidden}`);
  const routes = fs.existsSync(path.join(outDir, "sitemap.xml")) ? sitemapRoutes(outDir) : [];
  for (const route of routes) if (!fs.existsSync(path.join(outDir, routeToFile(route)))) failures.push(`sitemap route does not resolve in public output: ${route}`);
  const htmlPages = files.filter((file) => file.endsWith(".html") && file !== "404.html");
  if (htmlPages.length !== routes.length) failures.push(`public output has ${htmlPages.length} indexable HTML pages but sitemap has ${routes.length} routes`);
  return { failures, fileCount: files.length, htmlPages: htmlPages.length, sitemapUrls: routes.length };
}

export function buildPublic({ root = repositoryRoot, outDir = path.join(repositoryRoot, "public") } = {}) {
  const output = assertSafeOutDir(root, outDir);
  const sources = listPublicSourceFiles(root);
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const relative of sources) copyApprovedFile(path.join(root, relative), path.join(output, relative), relative);
  const check = checkPublicArtefact(output);
  if (check.failures.length) throw new Error(`public artefact failed boundary checks:\n- ${check.failures.join("\n- ")}`);
  return { outDir: output, ...check };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = buildPublic();
    console.log(JSON.stringify({ ok: true, outDir: toPosix(path.relative(repositoryRoot, result.outDir)), files: result.fileCount, htmlPages: result.htmlPages, sitemapUrls: result.sitemapUrls }, null, 2));
  } catch (error) {
    console.error(`public build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
