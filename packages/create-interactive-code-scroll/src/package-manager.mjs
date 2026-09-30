// @ts-check
import { spawnSync } from "node:child_process";

/**
 * The package manager that launched the command (`npm create` / `pnpm create`), from npm_config_user_agent.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ pm: "npm" | "pnpm"; pnpm?: string }}
 */
export function detectPackageManager(env = process.env) {
  const match = /^pnpm\/(\d+\.\d+\.\d+)/.exec(env.npm_config_user_agent ?? "");
  return match ? { pm: "pnpm", pnpm: match[1] } : { pm: "npm" };
}

/**
 * The pnpm version for `packageManager`: the launching pnpm, else the one on PATH.
 * @param {string | undefined} detected
 * @returns {string | undefined}
 */
export function pnpmVersion(detected) {
  if (detected) return detected;
  const run = spawnSync("pnpm", ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  const version = run.status === 0 ? run.stdout.trim() : "";
  return /^\d+\.\d+\.\d+$/.test(version) ? version : undefined;
}

/**
 * Commands shown to the author.
 * @param {"npm" | "pnpm"} pm
 */
export function commands(pm) {
  return pm === "pnpm"
    ? { install: "pnpm install", run: (/** @type {string} */ script) => `pnpm ${script}`, exec: (/** @type {string} */ args) => `pnpm exec interactive-code-scroll ${args}` }
    : { install: "npm install", run: (/** @type {string} */ script) => `npm run ${script}`, exec: (/** @type {string} */ args) => `npx interactive-code-scroll ${args}` };
}
