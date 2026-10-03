// AUTO-04C: static policy checks for the governed portfolio-sync workflow.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PUBLIC_DIRECTORIES, PUBLIC_FILES } from "./build-public.mjs";

const workflow = fs.readFileSync(path.resolve(".github/workflows/portfolio-sync.yml"), "utf8").replace(/\r\n/g, "\n");
const code = workflow.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
const APP_ACTION = "actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1";
const PR_ACTION = "peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1";
const GENERATED = [
  "data/generated/github-portfolio-snapshot.json",
  "data/generated/portfolio-sync-report.json",
  "docs/portfolio-sync/portfolio-sync-report.json",
  "docs/portfolio-sync/portfolio-sync-report.md",
];

function block(key) {
  const lines = code.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^\\s*${key}:\\s*\\|?\\s*$`).test(line));
  assert.ok(start >= 0, `${key} block missing`);
  const indent = lines[start].match(/^\s*/)[0].length;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && line.match(/^\s*/)[0].length <= indent) break;
    if (line.trim()) body.push(line.trim());
  }
  return body;
}

function step(name) {
  const start = code.indexOf(`      - name: ${name}\n`);
  assert.ok(start >= 0, `${name} step missing`);
  const end = code.indexOf("\n      - name: ", start + 1);
  return code.slice(start, end < 0 ? undefined : end);
}

test("1. the review branch is the stable automation branch", () => {
  assert.deepEqual(code.match(/^\s+branch: (.+)$/gm).map((line) => line.trim()), ["branch: automation/portfolio-sync"]);
  assert.doesNotMatch(code, /auto-01-portfolio-sync/);
});

test("main has one human Code Owner for all paths and for the CODEOWNERS file itself", () => {
  const codeowners = fs.readFileSync(path.resolve(".github/CODEOWNERS"), "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  assert.deepEqual(codeowners, ["* @hourwise", "/.github/CODEOWNERS @hourwise"]);
  assert.doesNotMatch(codeowners.join("\n"), /github-actions|\[bot\]|automation/i);
});

test("2-3. one fixed branch through create-pull-request: an open PR is reused, never duplicated", () => {
  assert.equal(code.split(`uses: ${PR_ACTION}`).length - 1, 1);
  assert.match(code, /^\s+delete-branch: false$/m);
  assert.doesNotMatch(code, /gh pr create|gh api [^\n]*\/pulls/);
});

test("4-5. all commits and pushes go through create-pull-request, which skips unchanged output", () => {
  assert.doesNotMatch(code, /git (commit|push)\b/);
  assert.doesNotMatch(code, /force-push|--force/);
});

test("6. only the four generated review files can be committed, and none is public", () => {
  assert.deepEqual(block("add-paths"), GENERATED);
  for (const file of GENERATED) {
    assert.equal(PUBLIC_FILES.includes(file), false, file);
    assert.equal(PUBLIC_DIRECTORIES.some((directory) => file.startsWith(`${directory}/`)), false, file);
  }
});

test("7. native workflow token has only the read permissions needed for discovery and PR comparison", () => {
  assert.deepEqual(block("permissions"), ["contents: read", "pull-requests: read"]);
  assert.equal(code.match(/^\s*permissions:/gm).length, 1, "no job-level permission overrides");
  assert.doesNotMatch(code, /^\s+(?:contents|pull-requests|administration|actions|workflows|issues|packages|checks|statuses|deployments|id-token|security-events): write$/m);
  assert.match(step("Check out PCGsoft site"), /persist-credentials: false/);
});

test("App token is minted only for a material review change and scoped to this repository", () => {
  const token = step("Mint App token for review delivery");
  assert.match(token, /id: app-token\n\s+if: steps\.review-change\.outputs\.changed == 'true'/);
  assert.ok(token.includes(`uses: ${APP_ACTION}`));
  assert.match(token, /app-id: \$\{\{ vars\.PCGSOFT_SYNC_APP_ID \}\}/);
  assert.match(token, /private-key: \$\{\{ secrets\.PCGSOFT_SYNC_APP_PRIVATE_KEY \}\}/);
  assert.match(token, /owner: hourwise\n\s+repositories: pcgsoft-site/);
  assert.match(token, /permission-contents: write\n\s+permission-pull-requests: write/);
  assert.doesNotMatch(token, /permission-(?:administration|actions|workflows|secrets|pages|deployments):/);
  assert.ok(code.indexOf("id: review-change") < code.indexOf("id: app-token"));
  assert.doesNotMatch(code.slice(0, code.indexOf("id: app-token")), /PCGSOFT_SYNC_APP_|steps\.app-token\.outputs\.token/);
});

test("App token is used only for branch and PR delivery with App bot commit attribution", () => {
  const identity = step("Resolve App bot commit identity");
  const delivery = step("Create or update one review PR");
  assert.match(identity, /if: steps\.review-change\.outputs\.changed == 'true'/);
  assert.match(identity, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(identity, /APP_SLUG: \$\{\{ steps\.app-token\.outputs\.app-slug \}\}/);
  assert.match(identity, /\/users\/\$\{APP_SLUG\}\[bot\]/);
  assert.match(identity, /git-identity=%s\[bot\]/);
  assert.match(delivery, /if: steps\.review-change\.outputs\.changed == 'true'/);
  assert.ok(delivery.includes(`uses: ${PR_ACTION}`));
  assert.match(delivery, /token: \$\{\{ steps\.app-token\.outputs\.token \}\}/);
  assert.match(delivery, /branch-token: \$\{\{ steps\.app-token\.outputs\.token \}\}/);
  assert.match(delivery, /author: \$\{\{ steps\.app-bot\.outputs\.git-identity \}\}/);
  assert.match(delivery, /committer: \$\{\{ steps\.app-bot\.outputs\.git-identity \}\}/);
  assert.doesNotMatch(delivery, /token: \$\{\{ github\.token \}\}|author: \$\{\{ github\.actor/);
});

test("changed=false skips both App identity steps and the existing delivery action", () => {
  for (const name of ["Mint App token for review delivery", "Resolve App bot commit identity", "Create or update one review PR"]) {
    assert.match(step(name), /if: steps\.review-change\.outputs\.changed == 'true'/);
  }
  assert.ok(code.indexOf("uses: actions/upload-artifact") < code.indexOf("id: app-token"));
  assert.ok(code.indexOf("id: app-token") < code.indexOf("id: review-pr"));
});

test("8. the PR body describes governed, provenance-bound evidence that needs human approval", () => {
  const body = block("body").join(" ");
  assert.match(body, /manifest proposals pinned to a source repository commit and blob SHA/);
  assert.match(body, /not publication authority/);
  assert.match(body, /eligibility findings/);
  assert.match(body, /A human approval is required before merge/);
  assert.doesNotMatch(body, /AUTO-01/);
});

test("9. triggers are manual dispatch plus exactly the reviewed daily 03:17 UTC schedule", () => {
  assert.deepEqual(block("on"), ["workflow_dispatch:", "schedule:", "- cron: \"17 3 * * *\""]);
  assert.equal(code.match(/cron:/g).length, 1);
  assert.doesNotMatch(code, /^\s*(push|pull_request|pull_request_target|workflow_run|repository_dispatch):/m);
});

test("10. no automated merge path exists", () => {
  assert.doesNotMatch(code, /gh pr merge|automerge|auto-merge|enable-pull-request-automerge|merge-method|\/merge\b/i);
  assert.doesNotMatch(code, /gh api [^\n]*\/(?:merges?|rulesets|branches\/[^\s]+\/protection)\b/i);
});

test("11. no automated approval step exists", () => {
  assert.doesNotMatch(code, /gh pr review|--approve|APPROVE|auto-approve|\/reviews\b/);
});

test("the workflow reconciles main and never checks out a project repository", () => {
  assert.equal(code.match(/uses: actions\/checkout@v7\.0\.1/g).length, 1);
  assert.match(code, /^\s+ref: main$/m);
  assert.doesNotMatch(code, /repository: /);
});

test("HEAD-only no-change skips the PR action and records operation none without a push", () => {
  assert.match(code, /id: review-pr\n\s+if: steps\.review-change\.outputs\.changed == 'true'\n\s+uses: peter-evans\/create-pull-request/);
  assert.match(code, /pull-request-operation \|\| 'none'/);
  assert.match(code, /pull-request-number \|\| steps\.review-change\.outputs\.number/);
  assert.match(code, /pull-request-head-sha \|\| steps\.review-change\.outputs\.head/);
  assert.ok(code.indexOf("run: node scripts/compare-portfolio-review.mjs") < code.indexOf("uses: actions/upload-artifact"));
  assert.ok(code.indexOf("uses: actions/upload-artifact") < code.indexOf("id: review-pr"));
});

test("raw observations and stable comparison evidence are retained even when delivery is skipped", () => {
  const upload = code.slice(code.indexOf("- name: Upload reconciliation report"), code.indexOf("- name: Create or update one review PR"));
  assert.match(upload, /if: always\(\)/);
  assert.match(upload, /retention-days: 90/);
  for (const file of [...GENERATED, "data/generated/portfolio-review-evidence.json"]) assert.ok(upload.includes(file));
  assert.ok(!block("add-paths").includes("data/generated/portfolio-review-evidence.json"));
});

test("reviewed exact action releases use Node 24 without enabling implicit package caching", () => {
  assert.match(code, /uses: actions\/setup-node@v7\.0\.0/);
  assert.match(code, /uses: actions\/upload-artifact@v7\.0\.1/);
  assert.ok(code.includes(`uses: ${APP_ACTION}`));
  assert.ok(code.includes(`uses: ${PR_ACTION}`));
  assert.match(code, /package-manager-cache: false/);
  assert.match(code, /node-version: 22/);
});
