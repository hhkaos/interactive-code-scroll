#!/usr/bin/env node
// @ts-check
/**
 * Skill evals: runs a coding agent on each task of tasks.json in a fresh project with the skills installed, then
 * grades the result (grade.mjs). Billed and slow: run by hand, not in CI.
 *
 *   pnpm eval:skills                     every task
 *   pnpm eval:skills -- --task review    one or more tasks (comma-separated)
 *   pnpm eval:skills -- --keep           keep the projects (kept anyway when a task fails)
 *
 * The agent command is ICS_EVAL_AGENT (a shell command; the prompt is in $ICS_EVAL_PROMPT, the project is the
 * working directory). Default: Claude Code in headless mode, allowed to edit files and run `npm run check`.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { complete, defaults } from "../../packages/create-interactive-code-scroll/src/options.mjs";
import { agentsMd, planProject } from "../../packages/create-interactive-code-scroll/src/plan.mjs";
import { installSkills } from "../../packages/interactive-code-scroll/bin/interactive-code-scroll.mjs";
import { grade } from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BIN = fileURLToPath(new URL("../../packages/interactive-code-scroll/bin/interactive-code-scroll.mjs", import.meta.url));
const AGENT =
  process.env.ICS_EVAL_AGENT ??
  'claude -p "$ICS_EVAL_PROMPT" --permission-mode acceptEdits --allowedTools Read Edit Write Glob Grep "Bash(npm run check*)"';

/** @typedef {{ id: string; starter: "web" | "empty"; files?: string; prompt: string; assertions: import("./grade.mjs").Assertion[] }} Task */

/** @returns {{ suffix: string; tasks: Task[] }} */
export function readTasks() {
  return JSON.parse(readFileSync(join(here, "tasks.json"), "utf8"));
}

/**
 * Writes the task's starting project: the wizard's web tutorial (or nothing), the task files, scripts that run
 * this repository's CLI, AGENTS.md / CLAUDE.md and the skills in .claude/skills/.
 * @param {Task} task
 * @param {string} root
 */
export function setUp(task, root) {
  const answers = complete({ dir: "demo", pages: false, agents: ["claude"] }, defaults("npm"));
  const files = task.starter === "web" ? planProject(answers, { version: "0.0.0", astro: "7" }) : new Map();
  files.set("AGENTS.md", agentsMd(answers));
  files.set("CLAUDE.md", "@AGENTS.md\n");
  const cli = (/** @type {string} */ args) => `node ${JSON.stringify(BIN)} ${args}`;
  files.set("package.json", `${JSON.stringify({ private: true, type: "module", scripts: { check: cli("check"), skills: cli("skills install --agent claude") } }, null, 2)}\n`);
  for (const [path, content] of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  if (task.files) cpSync(join(here, "files", task.files), root, { recursive: true });
  installSkills(root, "claude");
}

function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--task") ? args[args.indexOf("--task") + 1]?.split(",") : undefined;
  const keep = args.includes("--keep");
  const { suffix, tasks } = readTasks();
  const selected = tasks.filter((task) => !only || only.includes(task.id));
  if (selected.length === 0) throw new Error(`No task matches ${only?.join(", ")}. Tasks: ${tasks.map((t) => t.id).join(", ")}`);
  let failures = 0;
  for (const task of selected) {
    const root = mkdtempSync(join(tmpdir(), `ics-eval-${task.id}-`));
    const start = `${root}-start`;
    setUp(task, root);
    cpSync(root, start, { recursive: true });
    console.log(`\n▶ ${task.id} (${root})`);
    const run = spawnSync(AGENT, { cwd: root, shell: true, stdio: "inherit", timeout: 15 * 60_000, env: { ...process.env, ICS_EVAL_PROMPT: `${task.prompt}\n\n${suffix}` } });
    if (run.status !== 0) console.log(`  agent exited with ${run.status ?? run.signal}`);
    const results = grade(root, start, task.assertions);
    for (const { assertion, pass, detail } of results) {
      console.log(`  ${pass ? "✓" : "✗"} ${assertion.type}${"path" in assertion ? ` ${assertion.path}` : ""}${"pattern" in assertion ? ` /${assertion.pattern}/` : ""}: ${detail}`);
    }
    const failed = results.some((r) => !r.pass);
    if (failed) failures += 1;
    if (failed || keep) console.log(`  project kept at ${root}`);
    else {
      rmSync(root, { recursive: true, force: true });
      rmSync(start, { recursive: true, force: true });
    }
  }
  console.log(`\n${selected.length - failures}/${selected.length} tasks passed.`);
  process.exitCode = failures > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
