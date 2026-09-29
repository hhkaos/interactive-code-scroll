import { isKnownLanguage } from "./highlight.ts";

export const PREVIEW_MODES = ["off", "iframe", "tab", "both"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

/** The tutorial's default mode; `auto` follows the OS. The viewer's toggle always wins. */
export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** What readers of another variant see for a step limited with `only=`. */
export const OTHER_VARIANT_STEPS = ["notice", "hide"] as const;
export type OtherVariantSteps = (typeof OTHER_VARIANT_STEPS)[number];

/** A programming-language version of the tutorial's code, under `code/<dir>/`. */
export interface Variant {
  id: string;
  label: string;
  /** Folder relative to `code/`, without leading `./` or trailing `/`. */
  dir: string;
  /** Default file, relative to `dir`. */
  entry: string;
  /** Ordered globs (relative to `dir`) choosing the files that get tabs; all text files when absent. */
  files?: string[];
}

export interface TutorialConfig {
  title: string;
  preview: PreviewMode;
  theme: Theme;
  codeWrap: boolean;
  /** Image in `images/` shown in the header and used as favicon. */
  logo?: string;
  /** File extension (no dot) → Shiki language, overriding the built-in map. */
  languages: Record<string, string>;
  /** Ordered globs (relative to `code/`) choosing the files that get tabs; all text files when absent. */
  files?: string[];
  /** Code variants; absent for a single-project tutorial. */
  variants?: Variant[];
  otherVariantSteps: OtherVariantSteps;
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

function readFiles(value: unknown, key = "files", name = '"files"', base = "code/"): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === "string" && v.trim() !== "")) {
    throw new FrontmatterError(key, `${name} must be a non-empty list of paths or globs relative to ${base}, e.g. ["index.html", "src/*.js"]`);
  }
  return value as string[];
}

const VARIANT_ID = /^[a-z0-9][a-z0-9-]*$/;

/** A relative path inside `code/`: no leading `/`, no `.` or `..` segments. */
function relativePath(value: string): string | undefined {
  const path = value.replace(/^\.\//, "").replace(/\/+$/, "");
  const segments = path.split("/");
  if (path === "" || path.startsWith("/") || segments.some((s) => s === "" || s === "." || s === "..")) return undefined;
  return path;
}

function readVariants(value: unknown): Variant[] | undefined {
  if (value === undefined) return undefined;
  const fail = (detail: string): never => {
    throw new FrontmatterError("variants", detail);
  };
  if (!Array.isArray(value) || value.length === 0) {
    fail('"variants" must be a non-empty list of { id, label, dir, entry }');
  }
  const variants: Variant[] = [];
  for (const [index, item] of (value as unknown[]).entries()) {
    const at = `"variants[${index}]"`;
    if (typeof item !== "object" || item === null || Array.isArray(item)) fail(`${at} must be an object with id, label, dir and entry`);
    const { id, label, dir, entry, files } = item as Record<string, unknown>;
    if (typeof id !== "string" || !VARIANT_ID.test(id)) fail(`${at}.id must be lowercase letters, digits and dashes`);
    if (typeof label !== "string" || label.trim() === "") fail(`${at}.label must be a non-empty string`);
    const folder = typeof dir === "string" ? relativePath(dir) : undefined;
    if (folder === undefined) fail(`${at}.dir must be a folder relative to code/, e.g. "python"`);
    const file = typeof entry === "string" ? relativePath(entry) : undefined;
    if (file === undefined) fail(`${at}.entry must be a file path relative to the variant folder`);
    const variant: Variant = { id: id as string, label: label as string, dir: folder!, entry: file! };
    const globs = readFiles(files, "variants", `${at}.files`, `code/${folder}/`);
    if (globs !== undefined) variant.files = globs;
    variants.push(variant);
  }
  for (const [index, variant] of variants.entries()) {
    const earlier = variants.slice(0, index);
    if (earlier.some((v) => v.id === variant.id)) fail(`"variants" id "${variant.id}" is used twice`);
    const overlap = earlier.find((v) => v.dir === variant.dir || v.dir.startsWith(`${variant.dir}/`) || variant.dir.startsWith(`${v.dir}/`));
    if (overlap) fail(`"variants" folders must not overlap: "${overlap.dir}" (${overlap.id}) and "${variant.dir}" (${variant.id})`);
  }
  return variants;
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[]): T {
  if (allowed.includes(value as T)) return value as T;
  throw new FrontmatterError(name, `"${name}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`);
}

/** Validates tutorial.mdx frontmatter; defaults: title "Tutorial", preview `both`, theme `auto`. */
export function readTutorialConfig(frontmatter: Record<string, unknown>): TutorialConfig {
  const { title = "Tutorial", preview = "both", theme = "auto", codeWrap = false, logo, languages, files, variants, otherVariantSteps = "notice" } =
    frontmatter;
  if (typeof title !== "string") throw new FrontmatterError("title", '"title" must be a string');
  if (typeof codeWrap !== "boolean") throw new FrontmatterError("codeWrap", '"codeWrap" must be a boolean');
  if (logo !== undefined && typeof logo !== "string") throw new FrontmatterError("logo", '"logo" must be a string');
  const variantList = readVariants(variants);
  if (variantList !== undefined && files !== undefined) {
    throw new FrontmatterError("files", '"files" cannot be used with "variants"; set "files" on each variant instead');
  }
  return {
    title,
    preview: oneOf("preview", preview, PREVIEW_MODES),
    theme: oneOf("theme", theme, THEMES),
    codeWrap,
    languages: readLanguages(languages),
    ...(logo === undefined ? {} : { logo }),
    ...(files === undefined ? {} : { files: readFiles(files) }),
    ...(variantList === undefined ? {} : { variants: variantList }),
    otherVariantSteps: oneOf("otherVariantSteps", otherVariantSteps, OTHER_VARIANT_STEPS),
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
