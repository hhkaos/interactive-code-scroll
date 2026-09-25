import { codeToHtml } from "shiki";
import { parseSource, type ParsedSource } from "../../../shared/markers.ts";

export interface TutorialFile {
  path: string;
  lang: string;
  parsed: ParsedSource;
}

const raw = import.meta.glob<string>("../../../tutorial/code/*", { query: "?raw", import: "default", eager: true });
const images = import.meta.glob<string>("../../../tutorial/images/*", { query: "?url", import: "default", eager: true });

const basename = (p: string) => p.split("/").pop()!;

export const files: TutorialFile[] = Object.entries(raw).map(([p, source]) => {
  const path = basename(p);
  return { path, lang: path.split(".").pop()!, parsed: parseSource(source) };
});

export const imageUrls: Record<string, string> = Object.fromEntries(
  Object.entries(images).map(([p, url]) => [basename(p), url]),
);

/** Build-time highlighting; runtime vars are wrapped in `<span data-var>` for in-place substitution. */
export function highlightFile(file: TutorialFile): Promise<string> {
  const { code, regions, vars } = file.parsed;
  return codeToHtml(code, {
    lang: file.lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    decorations: vars.map((v) => ({
      start: { line: v.line - 1, character: v.fromColumn },
      end: { line: v.line - 1, character: v.toColumn },
      properties: { "data-var": v.name },
    })),
    transformers: [
      {
        line(node, line) {
          const ids = regions.filter((r) => line >= r.fromLine && line <= r.toLine).map((r) => r.id);
          if (ids.length) node.properties["data-regions"] = ids.join(" ");
        },
      },
    ],
  });
}

/** Strict validation: a broken reference fails the build with a clear message. */
export function assertStepRefs(step: { id: string; file?: string; region?: string; images?: string[] }): void {
  const file = step.file && files.find((f) => f.path === step.file);
  if (step.file && !file) throw new Error(`Step "${step.id}": file "${step.file}" not found`);
  if (step.region && !(file && file.parsed.regions.some((r) => r.id === step.region))) {
    throw new Error(`Step "${step.id}": region "${step.region}" not found in ${step.file}`);
  }
  for (const img of step.images ?? []) {
    if (!imageUrls[img]) throw new Error(`Step "${step.id}": image "${img}" not found`);
  }
}
