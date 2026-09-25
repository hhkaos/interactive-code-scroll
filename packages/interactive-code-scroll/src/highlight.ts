import { codeToHtml } from "shiki";
import type { ParsedSource } from "./markers.ts";

const LANGS: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  html: "html",
  htm: "html",
  css: "css",
  json: "json",
  md: "markdown",
};

export function langFor(path: string): string {
  return LANGS[path.split(".").pop()!.toLowerCase()] ?? "text";
}

/**
 * Build-time highlighting with light/dark colors as CSS variables. Lines get
 * `data-regions`; each `@var` literal's token gets `data-var` for in-place substitution.
 */
export function highlight({ code, regions, vars }: ParsedSource, path: string): Promise<string> {
  return codeToHtml(code, {
    lang: langFor(path),
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    decorations: vars
      .filter((v) => v.toColumn > v.fromColumn)
      .map((v) => ({
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
