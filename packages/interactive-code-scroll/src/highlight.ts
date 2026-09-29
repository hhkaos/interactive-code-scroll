import { bundledLanguages, codeToHtml } from "shiki";
import { extensionOf } from "./file-types.ts";
import type { ParsedSource } from "./markers.ts";

const LANGS: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  vue: "vue",
  html: "html",
  htm: "html",
  css: "css",
  json: "json",
  geojson: "json",
  md: "markdown",
  mdx: "markdown",
  sh: "bash",
  bash: "bash",
  ps1: "powershell",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  http: "http",
  py: "python",
  kt: "kotlin",
  kts: "kotlin",
  gradle: "groovy",
  swift: "swift",
  java: "java",
  cs: "csharp",
  xaml: "xml",
  xml: "xml",
  cpp: "cpp",
  h: "cpp",
  hpp: "cpp",
  qml: "qml",
  dart: "dart",
  sql: "sql",
  lua: "lua",
};

/** `text` (no highlighting) or a language Shiki bundles. */
export function isKnownLanguage(lang: string): boolean {
  return lang === "text" || lang in bundledLanguages;
}

/** Shiki language for a file; `overrides` (frontmatter `languages`) win over the built-in map. */
export function langFor(path: string, overrides: Readonly<Record<string, string>> = {}): string {
  const ext = extensionOf(path);
  return overrides[ext] ?? LANGS[ext] ?? "text";
}

/**
 * Build-time highlighting with light/dark colors as CSS variables. Lines get
 * `data-line` and `data-regions`; each `@var` literal's token gets `data-var`
 * for in-place substitution.
 */
export function highlight(
  { code, regions, vars }: ParsedSource,
  path: string,
  languages: Readonly<Record<string, string>> = {},
): Promise<string> {
  return codeToHtml(code, {
    lang: langFor(path, languages),
    themes: { light: "github-light-default", dark: "github-dark-default" },
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
          node.properties["data-line"] = String(line);
          const ids = regions.filter((r) => line >= r.fromLine && line <= r.toLine).map((r) => r.id);
          if (ids.length) node.properties["data-regions"] = ids.join(" ");
        },
      },
    ],
  });
}
