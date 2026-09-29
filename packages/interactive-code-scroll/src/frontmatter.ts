import { isKnownLanguage } from "./highlight.ts";

export const PREVIEW_MODES = ["off", "iframe", "tab", "both"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

/** The tutorial's default mode; `auto` follows the OS. The viewer's toggle always wins. */
export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export interface TutorialConfig {
  title: string;
  preview: PreviewMode;
  theme: Theme;
  codeWrap: boolean;
  /** Image in `images/` shown in the header and used as favicon. */
  logo?: string;
  /** File extension (no dot) → Shiki language, overriding the built-in map. */
  languages: Record<string, string>;
}

/** An invalid frontmatter field; `key` lets validation point at its line. */
export class FrontmatterError extends Error {
  constructor(
    readonly key: string,
    readonly detail: string,
  ) {
    super(`tutorial.mdx frontmatter: ${detail}`);
    this.name = "FrontmatterError";
  }
}

function readLanguages(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FrontmatterError("languages", '"languages" must map file extensions to languages, e.g. { qmd: markdown }');
  }
  const out: Record<string, string> = {};
  for (const [ext, lang] of Object.entries(value)) {
    if (!/^[a-z0-9]+$/.test(ext)) {
      throw new FrontmatterError("languages", `"languages" key "${ext}" must be a lowercase file extension without the dot`);
    }
    if (typeof lang !== "string" || !isKnownLanguage(lang)) {
      throw new FrontmatterError("languages", `"languages.${ext}" must be a Shiki language id or "text" (got ${JSON.stringify(lang)})`);
    }
    out[ext] = lang;
  }
  return out;
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[]): T {
  if (allowed.includes(value as T)) return value as T;
  throw new FrontmatterError(name, `"${name}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`);
}

/** Validates tutorial.mdx frontmatter; defaults: title "Tutorial", preview `both`, theme `auto`. */
export function readTutorialConfig(frontmatter: Record<string, unknown>): TutorialConfig {
  const { title = "Tutorial", preview = "both", theme = "auto", codeWrap = false, logo, languages } = frontmatter;
  if (typeof title !== "string") throw new FrontmatterError("title", '"title" must be a string');
  if (typeof codeWrap !== "boolean") throw new FrontmatterError("codeWrap", '"codeWrap" must be a boolean');
  if (logo !== undefined && typeof logo !== "string") throw new FrontmatterError("logo", '"logo" must be a string');
  return {
    title,
    preview: oneOf("preview", preview, PREVIEW_MODES),
    theme: oneOf("theme", theme, THEMES),
    codeWrap,
    languages: readLanguages(languages),
    ...(logo === undefined ? {} : { logo }),
  };
}

/** 1-based line of each top-level key in the file's leading `---` block (for error positions). */
export function frontmatterKeyLines(source: string): Record<string, number> {
  const lines = source.split("\n");
  const out: Record<string, number> = {};
  if (lines[0]?.trim() !== "---") return out;
  for (let index = 1; index < lines.length && lines[index]!.trim() !== "---"; index += 1) {
    const key = /^([A-Za-z_][\w-]*)\s*:/.exec(lines[index]!)?.[1];
    if (key !== undefined && !(key in out)) out[key] = index + 1;
  }
  return out;
}
