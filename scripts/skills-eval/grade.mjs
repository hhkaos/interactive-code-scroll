// @ts-check
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../../packages/interactive-code-scroll/bin/interactive-code-scroll.mjs", import.meta.url));

/**
 * What a task expects of the project after the agent ran. Paths are relative to the project root.
 * - `check`: `interactive-code-scroll check` reports no error.
 * - `exists`: the file exists.
 * - `matches`: the file matches `pattern` (a regular expression, flags `m`).
 * - `count`: `pattern` occurs at least `min` times in the file (global, flags `gm`).
 * - `grows`: `pattern` occurs at least `by` more times than in the starting project.
 * - `unchanged`: the file is byte for byte the starting one.
 * @typedef {{ type: "check" }
 *   | { type: "exists"; path: string }
 *   | { type: "matches"; path: string; pattern: string }
 *   | { type: "count"; path: string; pattern: string; min: number }
 *   | { type: "grows"; path: string; pattern: string; by: number }
 *   | { type: "unchanged"; path: string }} Assertion
 */

export const ASSERTION_TYPES = ["check", "exists", "matches", "count", "grows", "unchanged"];

/**
 * `interactive-code-scroll check --json` on a project: its problems, or the reason it could not run.
 * @param {string} root
 * @returns {{ ok: boolean; errors: number; detail: string }}
 */
export function runCheck(root) {
  const run = spawnSync(process.execPath, [BIN, "check", "--json", "--root", root], { encoding: "utf8" });
  try {
    const result = JSON.parse(run.stdout);
    const errors = result.problems.filter((/** @type {{ severity: string }} */ p) => p.severity === "error");
    return { ok: result.ok, errors: result.errors, detail: errors.map((/** @type {{ message: string }} */ p) => p.message).join("; ") };
  } catch {
    return { ok: false, errors: -1, detail: (run.stderr || run.stdout).trim().slice(0, 500) };
  }
}

/** @param {string} path */
const text = (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);
/** @param {string | undefined} source @param {string} pattern */
const occurrences = (source, pattern) => (source === undefined ? 0 : [...source.matchAll(new RegExp(pattern, "gm"))].length);

/**
 * Grades a project against a task's assertions; `start` is the project as the agent got it.
 * @param {string} root
 * @param {string} start
 * @param {Assertion[]} assertions
 * @param {(root: string) => { ok: boolean; detail: string }} [check]
 * @returns {{ assertion: Assertion; pass: boolean; detail: string }[]}
 */
export function grade(root, start, assertions, check = runCheck) {
  return assertions.map((assertion) => {
    if (assertion.type === "check") {
      const result = check(root);
      return { assertion, pass: result.ok, detail: result.ok ? "no errors" : result.detail };
    }
    const now = text(join(root, assertion.path));
    switch (assertion.type) {
      case "exists":
        return { assertion, pass: now !== undefined, detail: now === undefined ? "missing" : "present" };
      case "matches": {
        const pass = now !== undefined && new RegExp(assertion.pattern, "m").test(now);
        return { assertion, pass, detail: now === undefined ? "missing" : pass ? "matches" : "no match" };
      }
      case "count": {
        const found = occurrences(now, assertion.pattern);
        return { assertion, pass: found >= assertion.min, detail: `${found} found, ${assertion.min} needed` };
      }
      case "grows": {
        const before = occurrences(text(join(start, assertion.path)), assertion.pattern);
        const after = occurrences(now, assertion.pattern);
        return { assertion, pass: after - before >= assertion.by, detail: `${before} → ${after}, +${assertion.by} needed` };
      }
      case "unchanged": {
        const pass = now !== undefined && now === text(join(start, assertion.path));
        return { assertion, pass, detail: pass ? "unchanged" : "changed or missing" };
      }
      default:
        return { assertion, pass: false, detail: `unknown assertion type ${JSON.stringify(/** @type {{ type: unknown }} */ (assertion).type)}` };
    }
  });
}
