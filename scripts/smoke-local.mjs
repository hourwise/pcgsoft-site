const routes = [
  "/", "/projects/", "/products/", "/open-source/", "/open-source/fates/",
  "/open-source/ananke/", "/open-source/mnemosyne/", "/open-source/horae/",
  "/open-source/runtime-contracts/", "/open-source/moirae-console/",
  "/open-source/moirae-code/", "/open-source/moirae-protocol/", "/open-source/moirae-accord/", "/open-source/plain-speak/", "/open-source/fates-integration/",
  "/products/atlas-ai/", "/products/hourwise-eu/", "/products/hourwise-fleet/", "/products/reticle/",
  "/products/relief/", "/products/whilom/", "/products/the-trace-manifest/", "/products/trace-capture/", "/products/teamsphere/", "/products/prefixity/",
  "/creative/", "/creative/read-me-a-story/", "/creative/riff-wilde/", "/creative/forge-arena/", "/creative/gilded-bazaar/", "/creative/vestigia-new-dawn/", "/creative/akuma-velocity/", "/web-client-work/", "/web-client-work/anyaparallax/", "/web-client-work/amped-up-music-promotions/", "/engineering/",
  "/robots.txt", "/sitemap.xml"
];
const origin = process.env.LOCAL_ORIGIN;
if (!origin) throw new Error("Set LOCAL_ORIGIN to the local server origin before running this smoke check.");
const results = [];
for (const route of routes) {
  const response = await fetch(`${origin}${route}`);
  const body = await response.text();
  results.push({ route, status: response.status, hasTitle: !route.endsWith("/") || /<title>/i.test(body), hasH1: !route.endsWith("/") || /<h1\b/i.test(body) });
}
const missing = await fetch(`${origin}/not-a-real-route/`);
const custom404 = await fetch(`${origin}/404.html`);
const custom404Body = await custom404.text();
const homeBody = await (await fetch(`${origin}/`)).text();
const siteScript = await (await fetch(`${origin}/assets/site.js`)).text();
const failures = results.filter((result) => result.status !== 200 || !result.hasTitle || !result.hasH1);
if (missing.status !== 404) failures.push({ route: "/not-a-real-route/", status: missing.status });
if (custom404.status !== 200 || !custom404Body.includes("Return home")) failures.push({ route: "/404.html", status: custom404.status });
if (!homeBody.includes("data-menu-toggle") || !siteScript.includes("function setMenu")) failures.push({ route: "mobile-navigation", status: "not wired" });
console.log(JSON.stringify({ ok: failures.length === 0, results, missingRouteStatus: missing.status, custom404Status: custom404.status, custom404HasReturnLink: custom404Body.includes("Return home"), mobileNavWired: homeBody.includes("data-menu-toggle") && siteScript.includes("function setMenu") }, null, 2));
if (failures.length) process.exitCode = 1;
