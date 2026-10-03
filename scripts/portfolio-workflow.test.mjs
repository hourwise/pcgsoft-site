// AUTO-04C: static policy checks for the governed portfolio-sync workflow.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PUBLIC_DIRECTORIES, PUBLIC_FILES } from "./build-public.mjs";

const workflow = fs.readFileSync(path.resolve(".github/workflows/portfolio-sync.yml"), "utf8").replace(/\r\n/g, "\n");
const code = workflow.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
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
  assert.equal(code.match(/uses: peter-evans\/create-pull-request@v8\.1\.1/g).length, 1);
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

test("7. workflow permissions are exactly contents and pull-requests write", () => {
  assert.deepEqual(block("permissions"), ["contents: write", "pull-requests: write"]);
  assert.equal(code.match(/^\s*permissions:/gm).length, 1, "no job-level permission overrides");
  assert.doesNotMatch(code, /\b(administration|actions|workflows|issues|packages|checks|statuses|deployments|id-token|security-events): write/);
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
  assert.match(code, /package-manager-cache: false/);
  assert.match(code, /node-version: 22/);
});
