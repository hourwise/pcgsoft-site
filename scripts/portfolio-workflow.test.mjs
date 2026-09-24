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

test("2-3. one fixed branch through create-pull-request: an open PR is reused, never duplicated", () => {
  assert.equal(code.match(/uses: peter-evans\/create-pull-request@v7/g).length, 1);
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

test("9. the workflow has no recurring schedule", () => {
  assert.deepEqual(block("on"), ["workflow_dispatch:"]);
  assert.doesNotMatch(code, /schedule:|cron:/);
});

test("10. no automated merge path exists", () => {
  assert.doesNotMatch(code, /gh pr merge|automerge|auto-merge|enable-pull-request-automerge|merge-method|\/merge\b/i);
});

test("11. no automated approval step exists", () => {
  assert.doesNotMatch(code, /gh pr review|--approve|APPROVE|auto-approve|\/reviews\b/);
});

test("the workflow reconciles main and never checks out a project repository", () => {
  assert.equal(code.match(/uses: actions\/checkout@v4/g).length, 1);
  assert.match(code, /^\s+ref: main$/m);
  assert.doesNotMatch(code, /repository: /);
});
