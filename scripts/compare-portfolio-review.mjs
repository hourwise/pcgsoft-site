#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { reviewDecision } from "./portfolio-review-evidence.mjs";

export const REVIEW_BRANCH = "automation/portfolio-sync";
const FILES = { snapshot: "data/generated/github-portfolio-snapshot.json", report: "data/generated/portfolio-sync-report.json" };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Only GETs against this site's own PR metadata and evidence at an exact commit.
export async function readReviewBaseline({ repository, token, fetchImpl = globalThis.fetch }) {
  if (repository !== "hourwise/pcgsoft-site") throw new Error("unexpected delivery repository");
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` };
  const base = `https://api.github.com/repos/${repository}`;
  const get = async (url, raw = false) => {
    const response = await fetchImpl(url, { headers: { ...headers, Accept: raw ? "application/vnd.github.raw+json" : headers.Accept }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`review baseline read failed: HTTP ${response.status}`);
    return response.json();
  };
  const pulls = await get(`${base}/pulls?state=open&base=main&head=hourwise%3A${encodeURIComponent(REVIEW_BRANCH)}&per_page=100`);
  if (!Array.isArray(pulls) || pulls.length > 1) throw new Error("ambiguous review PR baseline");
  if (!pulls.length) return { previous: null, number: null, head: null };
  const pull = pulls[0];
  if (pull.head?.ref !== REVIEW_BRANCH || pull.base?.ref !== "main" || pull.head?.repo?.full_name !== repository ||
      !/^[0-9a-f]{40}$/.test(pull.head.sha) || !Number.isSafeInteger(pull.number)) throw new Error("invalid review PR baseline");
  const previous = {};
  for (const [key, file] of Object.entries(FILES)) previous[key] = await get(`${base}/contents/${file}?ref=${pull.head.sha}`, true);
  return { previous, number: pull.number, head: pull.head.sha };
}

export async function compareReview({ directory = root, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is required for the read-only review comparison");
  const current = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"))]));
  const baseline = await readReviewBaseline({ repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN, fetchImpl });
  const decision = reviewDecision(current, baseline.previous);
  // Artifact-only comparison view. The existing four add-paths remain unchanged.
  fs.writeFileSync(path.join(directory, "data/generated/portfolio-review-evidence.json"), decision.evidence);
  const summary = { ...decision, evidence: undefined, number: baseline.number, head: baseline.head };
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `changed=${decision.changed}\nnumber=${baseline.number || ""}\nhead=${baseline.head || ""}\nhash=${decision.hash}\n`);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY,
    `\n## Material review comparison\n- ${decision.reason}\n- stable evidence SHA-256: ${decision.hash}\n- previous SHA-256: ${decision.previousHash || "none"}\n- Raw observations: this run's portfolio-sync-report artifact (90-day retention).\n`);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  compareReview().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(`review comparison failed: ${error.message}`);
    process.exitCode = 1;
  });
}
