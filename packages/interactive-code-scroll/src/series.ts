import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** A tutorial folder of a series site, published at `/<slug>/`. */
export interface SeriesEntry {
  slug: string;
  dir: string;
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Lists the tutorials of a series folder: every subfolder with `tutorial.mdx`, sorted by slug.
 * Folders starting with `_` or `.` are ignored; other folders without `tutorial.mdx` are skipped
 * with a warning. Throws when a slug is invalid or no tutorial is found.
 */
export function discoverTutorials(seriesDir: string, warn: (message: string) => void = console.warn): SeriesEntry[] {
  if (!existsSync(seriesDir)) throw new Error(`interactive-code-scroll: tutorials folder not found at ${seriesDir}`);
  const entries: SeriesEntry[] = [];
  const invalid: string[] = [];
  for (const entry of readdirSync(seriesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const dir = join(seriesDir, entry.name);
    if (!existsSync(join(dir, "tutorial.mdx"))) {
      warn(`interactive-code-scroll: skipped ${dir}: no tutorial.mdx`);
      continue;
    }
    if (SLUG_PATTERN.test(entry.name)) entries.push({ slug: entry.name, dir });
    else invalid.push(entry.name);
  }
  if (invalid.length > 0) {
    throw new Error(
      `interactive-code-scroll: tutorial folder names are their URLs and must match ${SLUG_PATTERN.source} (lowercase letters, digits and "-"): ${invalid.join(", ")}`,
    );
  }
  if (entries.length === 0) throw new Error(`interactive-code-scroll: no tutorial found in ${seriesDir} (expected <name>/tutorial.mdx)`);
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}
