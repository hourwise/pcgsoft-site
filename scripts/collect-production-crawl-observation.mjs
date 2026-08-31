import { readFile, writeFile } from "node:fs/promises";

const origin = "https://pcgsoft.co.uk";
const productionSha = "ca1d7c4d16256d34e998d5f75d4653c5ddb50c40";
const productionDeployment = "a4222e92-5985-490c-aaca-6d9781e68fd2";
const sitemapUrl = `${origin}/sitemap.xml`;
const observedAtUtc = process.argv[2] || new Date().toISOString();
const outputPath = "docs/ai-discovery/t0-crawl-observations.json";

const absoluteUrl = (href, base) => {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};

const firstMatch = (html, pattern) => html.match(pattern)?.[1]?.trim() || null;
const stripMarkup = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ")
  .trim();

const responseBody = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "PCGsoft-AEO-observation/1.0" },
      redirect: "follow",
    });
    return { response, body: await response.text() };
  } catch (error) {
    return { response: null, body: "", error: String(error) };
  }
};

const { response: sitemapResponse, body: sitemapBody, error: sitemapError } = await responseBody(sitemapUrl);
const urls = [...sitemapBody.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());

const routes = [];
for (const url of urls) {
  const { response, body, error } = await responseBody(url);
  const canonical = firstMatch(body, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || firstMatch(body, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const robots = firstMatch(body, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    || firstMatch(body, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  const title = firstMatch(body, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = firstMatch(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const text = stripMarkup(body);
  const internalLinkCount = [...body.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
    .map((match) => absoluteUrl(match[1], url))
    .filter((href) => href?.startsWith(origin)).length;

  routes.push({
    url,
    httpStatus: response?.status ?? null,
    finalUrl: response?.url || null,
    contentType: response?.headers.get("content-type") || null,
    title,
    canonical,
    robots,
    h1: h1 ? stripMarkup(h1) : null,
    textAvailable: text.length > 0,
    textLengthApprox: text.length,
    jsonLdPresent: /<script[^>]+type=["']application\/ld\+json["']/i.test(body),
    internalLinkCount,
    error: error || null,
  });
}

const report = {
  observationId: "PCGSOFT_AEO_T0",
  classification: "FIRST_POST_LAUNCH_OBSERVATION",
  observedAt: {
    utc: observedAtUtc,
    europeLondon: "2026-08-31T13:21:10.1128129+01:00",
  },
  production: {
    canonical: `${origin}/`,
    gitSha: productionSha,
    deploymentId: productionDeployment,
    deploymentUrl: `https://${productionDeployment.slice(0, 8)}.pcgsoft-site.pages.dev`,
    environment: "Production",
    branch: "main",
  },
  sitemap: {
    url: sitemapUrl,
    httpStatus: sitemapResponse?.status ?? null,
    finalUrl: sitemapResponse?.url || null,
    urlCount: urls.length,
    error: sitemapError || null,
  },
  preLaunchMeasurements: "NOT_COLLECTED",
  method: "Anonymous HTTP GETs to the public production sitemap and each URL listed in it.",
  routes,
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, urlCount: urls.length, statuses: routes.reduce((acc, route) => {
  const key = String(route.httpStatus);
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {}) }, null, 2));
