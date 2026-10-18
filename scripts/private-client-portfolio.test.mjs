import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildPublic, checkPublicArtefact, sitemapRoutes } from "./build-public.mjs";
import { privateSourceIssues } from "./private-source-policy.mjs";
import { discoverPublicGithubRepos, buildApprovedSourceIndex } from "./portfolio-sync-lib.mjs";
import { buildSyncOutputs } from "./portfolio-reconcile.mjs";

const root = path.resolve(".");
const registry = JSON.parse(fs.readFileSync("data/projects.json", "utf8"));
const project = registry.find((item) => item.slug === "lvrc-events");
const { outDir } = buildPublic({ root, outDir: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pcgsoft-client-")), "public") });
const read = (file) => fs.readFileSync(path.join(outDir, file), "utf8");
const privateRepo = "https://github.com/hourwise/Private-Client-Fixture";

test("approved private-source client is live in the canonical web-client registry without source mappings", () => {
  assert.ok(project);
  assert.equal(project.category, "web-client");
  assert.equal(project.sourceVisibility, "private");
  assert.equal(project.openSource, false);
  assert.match(project.status, /^Live/);
  assert.equal(project.websiteState, "live");
  assert.equal(project.githubUrl, null);
  assert.deepEqual(project.repositories, []);
  assert.deepEqual(privateSourceIssues(project), []);
  assert.equal(buildApprovedSourceIndex([project]).byUrl.size, 0);
});

test("private source policy still refuses source, documentation, code-host and unapproved evidence links", () => {
  for (const changed of [
    { githubUrl: privateRepo }, { repositories: [{url:privateRepo,visibility:"private"}] },
    { documentationUrl: privateRepo }, { documentationLinks: [{url:privateRepo}] },
    { evidenceLinks: [{url:privateRepo}] }, { liveUrls:[privateRepo],liveUrl:privateRepo },
    { liveUrls:["https://example.test/?token=private"],liveUrl:null },
    { evidenceLinks:[{url:"https://unapproved.example.test/"}] }, { openSource:true },
    { liveUrl:"https://unapproved.example.test/" },
  ]) assert.ok(privateSourceIssues({...project,...changed}).length, JSON.stringify(changed));
});

test("existing discovery stays public-only and never requests private source or manifests", async () => {
  const calls=[];
  const discovery=await discoverPublicGithubRepos({token:undefined,fetchImpl:async url=>{
    calls.push(url);return {ok:true,json:async()=>new URL(url).pathname==="/users/hourwise/repos"?[
      {name:"Private-Client-Fixture",html_url:privateRepo,visibility:"private",private:true},
      {name:"Public-Fixture",html_url:"https://github.com/hourwise/Public-Fixture",visibility:"public",private:false},
    ]:[]};
  }});
  assert.equal(calls.length,2); // Public listing and the public fixture's commit lookup only.
  assert.equal(new URL(calls[0]).pathname,"/users/hourwise/repos");
  assert.ok(calls.every(url=>!url.includes("Private-Client-Fixture")));
  assert.deepEqual(discovery.repositories.map(r=>r.name),["Public-Fixture"]);
  assert.equal(discovery.privateSeen,1);
  assert.doesNotMatch(JSON.stringify(discovery.repositories),/Private-Client-Fixture/);
});

test("reconciliation preserves the approved private-source live entry without false privacy or lifecycle findings", () => {
  const before=structuredClone(project);
  const {report,snapshot}=buildSyncOutputs({registry:[project],discovery:{complete:true,repositories:[],privateSeen:1,errors:[]},manifestSources:[],source:"test"});
  assert.deepEqual(project,before);
  assert.deepEqual(report.privacyVisibilityWarnings,[]);
  assert.deepEqual(report.canonicalConflicts,[]);
  assert.deepEqual(report.statusAnomalies,[]);
  assert.equal(report.autoDerivedSafeFacts.publicRepositoryCount,0);
  assert.equal(report.result,"NO_CHANGE");
  assert.doesNotMatch(JSON.stringify({report,snapshot}),/Private-Client-Fixture/);
});

test("built detail page is useful without JavaScript and contains exact public links, metadata and no private endpoints", () => {
  const page=read("web-client-work/lvrc-events/index.html");
  const noScripts=page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
  for(const phrase of ["Liverpool Victoria Rowing Club","four-person relay","SumUp","confirmation emails","XLSX","Back to Web &amp; Client Work"]) assert.ok(noScripts.includes(phrase),phrase);
  for(const url of project.liveUrls) assert.ok(noScripts.includes(`href="${url}"`));
  assert.ok(page.includes(`<link rel="canonical" href="${project.canonicalUrl}">`));
  assert.doesNotMatch(page,/codeRepository|lvrceventspayment\.co\.uk\/(?:operator|reports|api)\b|cloudflareaccess\.com|workers\.dev/);
  for(const [,block] of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.equal(JSON.parse(block).url,project.canonicalUrl);
});

test("client index, global fallback navigation, sitemap and llms discover the same canonical route", () => {
  for(const file of ["web-client-work/index.html","projects/index.html"]) assert.ok(read(file).includes(`href="${project.sitePath}"`));
  assert.equal(sitemapRoutes(outDir).filter(route=>route===project.sitePath).length,1);
  assert.ok(read("llms.txt").includes(project.canonicalUrl));
  assert.deepEqual(checkPublicArtefact(outDir).failures,[]);
});

test("final public build excludes internal files, source credentials and client-sensitive data", () => {
  for(const name of ["docs","scripts","tests",".github",".git","data/generated"]) assert.equal(fs.existsSync(path.join(outDir,name)),false);
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  for(const file of walk(outDir)) {
    if(!/\.(?:html|json|js|xml|txt|css)$/.test(file))continue;
    assert.doesNotMatch(fs.readFileSync(file,"utf8"),/github\.com\/hourwise\/LVRC-|Private-Client-Fixture|SUMUP_API_KEY|RESEND_API_KEY|BOOKING_LINK_SECRET|-----BEGIN .*PRIVATE KEY/);
  }
});

test("existing client detail pages are copied byte-for-byte without modifying their content", () => {
  for(const slug of ["anyaparallax","amped-up-music-promotions"]) {
    const file=`web-client-work/${slug}/index.html`;
    assert.equal(read(file),fs.readFileSync(path.join(root,file),"utf8"));
  }
});
