#!/usr/bin/env node
// HTTP smoke for the built public artefact. By default it serves ./public with
// Pages-like routing; set SMOKE_ORIGIN to check a deployed origin instead.
// Positive responses are compared with the built artefact byte-for-byte
// (line endings normalised); internal repository paths must return 404.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routeToFile, sitemapRoutes } from "./build-public.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

export const FORBIDDEN_HTTP_PATHS = [
  "/.github/workflows/portfolio-sync.yml",
  "/README.md",
  "/data/generated/github-portfolio-snapshot.json",
  "/data/generated/portfolio-sync-report.json",
  "/docs/portfolio-sync/portfolio-sync-report.md",
  "/docs/portfolio-sync/project-manifest.md",
  "/docs/portfolio-sync/project.example.yml",
  "/docs/project-inventory.md",
  "/package.json",
  "/scripts/sync-portfolio.mjs",
  "/scripts/validate-site.mjs",
  "/tests/fixtures/portfolio-sync/",
];
const EXTRA_PUBLIC_PATHS = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/data/projects.json", "/assets/site.js", "/assets/styles.css", "/assets/mark.svg"];
const CONTENT_TYPES = { ".css": "text/css", ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml" };

function servePublic(directory) {
  const notFound = fs.readFileSync(path.join(directory, "404.html"));
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split(/[?#]/)[0]);
    const file = path.resolve(directory, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
    const inside = file.startsWith(`${directory}${path.sep}`);
    if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) {
      response.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream" });
      response.end(fs.readFileSync(file));
      return;
    }
    response.writeHead(404, { "Content-Type": CONTENT_TYPES[".html"] });
    response.end(notFound);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const normalise = (value) => value.replaceAll("\r\n", "\n");

async function main() {
  if (!fs.existsSync(path.join(publicDir, "index.html"))) throw new Error("public/ has not been built; run npm run build first");
  let server = null;
  let origin = process.env.SMOKE_ORIGIN;
  if (!origin) {
    server = await servePublic(publicDir);
    const { address, port } = server.address();
    origin = `http://${address}:${port}`;
  }
  origin = origin.replace(/\/$/, "");
  const failures = [];
  const positive = [...sitemapRoutes(publicDir), ...EXTRA_PUBLIC_PATHS];
  let contentMatches = 0;
  try {
    for (const route of positive) {
      const response = await fetch(`${origin}${route}`);
      const body = await response.text();
      const expected = fs.readFileSync(path.join(publicDir, routeToFile(route)), "utf8");
      if (response.status !== 200) failures.push({ route, status: response.status, expected: 200 });
      else if (normalise(body) !== normalise(expected)) failures.push({ route, status: response.status, issue: "body differs from built public artefact" });
      else contentMatches += 1;
    }
    const registry = await (await fetch(`${origin}/data/projects.json`)).json();
    if (!Array.isArray(registry) || !registry.length) failures.push({ route: "/data/projects.json", issue: "registry is not a non-empty array" });
    const missing = await fetch(`${origin}/not-a-real-route-auto01r1/`);
    const missingBody = await missing.text();
    if (missing.status !== 404 || !missingBody.includes("Return home")) failures.push({ route: "/not-a-real-route-auto01r1/", status: missing.status, expected: "404 with custom page" });
    const forbidden = [];
    for (const route of FORBIDDEN_HTTP_PATHS) {
      const response = await fetch(`${origin}${route}`);
      await response.text();
      forbidden.push({ route, status: response.status });
      if (response.status !== 404) failures.push({ route, status: response.status, expected: 404 });
    }
    console.log(JSON.stringify({
      ok: failures.length === 0,
      origin: server ? "local public/" : origin,
      sitemapRoutes: sitemapRoutes(publicDir).length,
      positiveChecked: positive.length,
      contentMatches,
      registryRecords: Array.isArray(registry) ? registry.length : null,
      invalidRouteStatus: missing.status,
      forbidden,
      failures,
    }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    server?.close();
  }
}

main().catch((error) => {
  console.error(`public smoke failed: ${error.message}`);
  process.exitCode = 1;
});
