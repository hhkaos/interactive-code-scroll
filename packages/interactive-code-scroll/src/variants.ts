import type { Variant } from "./frontmatter.ts";
import { parseSource, type ParsedSource } from "./markers.ts";
import type { SourceFile } from "./tutorial-files.ts";
import { selectVisible } from "./visible-files.ts";

const parsedCache = new WeakMap<readonly SourceFile[], Map<string, ParsedSource>>();

/** Every text file parsed once per build (components render once per step). Validation already reported marker errors. */
export function parsedFiles(files: readonly SourceFile[]): Map<string, ParsedSource> {
  let parsed = parsedCache.get(files);
  if (!parsed) {
    parsed = new Map(files.map((f) => [f.path, parseSource(f.source, `code/${f.path}`)]));
    parsedCache.set(files, parsed);
  }
  return parsed;
}

/** Text files of `variant` that get a tab, as paths relative to `code/`, plus its unmatched `files` patterns. */
export function variantVisible(variant: Variant, textPaths: readonly string[]): { visible: string[]; unmatched: string[] } {
  const prefix = `${variant.dir}/`;
  const own = textPaths.filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length));
  const { visible, unmatched } = selectVisible(own, variant.files);
  return { visible: visible.map((path) => prefix + path), unmatched };
}

/** Variant id → file (relative to `code/`) a step shows; variants the step does not cover are left out. */
export function stepFiles(
  variants: readonly Variant[],
  parsed: ReadonlyMap<string, ParsedSource>,
  { file, region, only }: { file?: string; region?: string; only?: string },
): Record<string, string> {
  const ids = only?.split(/\s+/).filter(Boolean);
  const out: Record<string, string> = {};
  for (const variant of variants) {
    if (ids && !ids.includes(variant.id)) continue;
    if (file !== undefined) {
      out[variant.id] = `${variant.dir}/${file}`;
      continue;
    }
    if (region === undefined) continue;
    for (const [path, source] of parsed) {
      if (path.startsWith(`${variant.dir}/`) && source.regions.some((r) => r.id === region)) {
        out[variant.id] = path;
        break;
      }
    }
  }
  return out;
}
