// @ts-check
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Whether the folder exists and holds anything.
 * @param {string} dir
 */
export function isNonEmptyDir(dir) {
  return existsSync(dir) && readdirSync(dir).length > 0;
}

/**
 * Writes the planned files under `dir`. Existing files are never overwritten: they are skipped and reported.
 * @param {string} dir
 * @param {Map<string, string>} files
 * @returns {{ written: string[]; skipped: string[] }}
 */
export function writeProject(dir, files) {
  /** @type {string[]} */
  const written = [];
  /** @type {string[]} */
  const skipped = [];
  for (const [path, content] of files) {
    const target = join(dir, path);
    if (existsSync(target)) {
      skipped.push(path);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    written.push(path);
  }
  return { written, skipped };
}
