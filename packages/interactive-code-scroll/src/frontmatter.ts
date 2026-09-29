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
  /** Image in `images/` (or an `https://` URL) shown in the header and used as favicon. */
  logo?: string;
  /** File extension (no dot) → Shiki language, overriding the built-in map. */
  languages: Record<string, string>;
  /** Ordered globs (relative to `code/`) choosing the files that get tabs; all text files when absent. */
  files?: string[];
  /** Code variants; absent for a single-project tutorial. */
  variants?: Variant[];
  otherVariantSteps: OtherVariantSteps;
  /** Series metadata (optional everywhere): shown on the index cards; `description` is also the page's meta description. */
  description?: string;
  tags: string[];
  level?: string;
  duration?: string;
  /** Index position: lower first; tutorials without it come after, by title. */
  order?: number;
}

/** Frontmatter of a series site's optional `index.mdx`. */
export interface IndexConfig {
  title: string;
  description?: string;
  /** Image in the series folder's `images/` (or an `https://` URL), shown in the header and used as favicon. */
  logo?: string;
  theme: Theme;
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

/** A `logo` given as an absolute `https://` URL is used as is; any other value is a path in `images/`. */
export const isRemoteLogo = (logo: string) => /^https:\/\/\S+$/i.test(logo);

/** URL of a logo: remote as is, local through the image map (undefined when missing). */
export function logoUrl(logo: string | undefined, images: Readonly<Record<string, string>>): string | undefined {
  if (logo === undefined) return undefined;
  return isRemoteLogo(logo) ? logo : images[logo];
}

function optionalText(name: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new FrontmatterError(name, `"${name}" must be a non-empty string`);
  return value;
}

function readTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string" && v.trim() !== "" && !v.includes(","))) {
    throw new FrontmatterError("tags", '"tags" must be a list of non-empty strings without commas, e.g. [REST, Python]');
  }
  return [...new Set(value.map((v: string) => v.trim()))];
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[]): T {
  if (allowed.includes(value as T)) return value as T;
  throw new FrontmatterError(name, `"${name}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`);
}

/** Validates tutorial.mdx frontmatter; defaults: title "Tutorial", preview `both`, theme `auto`. */
export function readTutorialConfig(frontmatter: Record<string, unknown>): TutorialConfig {
  const {
    title = "Tutorial",
    preview = "both",
    theme = "auto",
    codeWrap = false,
    logo,
    languages,
    files,
    variants,
    otherVariantSteps = "notice",
    description,
    tags,
    level,
    duration,
    order,
  } = frontmatter;
  if (typeof title !== "string") throw new FrontmatterError("title", '"title" must be a string');
  if (typeof codeWrap !== "boolean") throw new FrontmatterError("codeWrap", '"codeWrap" must be a boolean');
  if (logo !== undefined && typeof logo !== "string") throw new FrontmatterError("logo", '"logo" must be a string');
  if (order !== undefined && (typeof order !== "number" || !Number.isFinite(order))) throw new FrontmatterError("order", '"order" must be a number');
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
    ...optionalEntry("description", optionalText("description", description)),
    tags: readTags(tags),
    ...optionalEntry("level", optionalText("level", level)),
    ...optionalEntry("duration", optionalText("duration", duration)),
    ...(order === undefined ? {} : { order: order as number }),
  };
}

function optionalEntry<K extends string>(key: K, value: string | undefined): Partial<Record<K, string>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, string>);
}

const INDEX_KEYS = new Set(["title", "description", "logo", "theme"]);

/** Validates a series `index.mdx` frontmatter; defaults: title "Tutorials", theme `auto`. */
export function readIndexConfig(frontmatter: Record<string, unknown>): IndexConfig {
  const { title = "Tutorials", description, logo, theme = "auto" } = frontmatter;
  const unknown = Object.keys(frontmatter).find((key) => !INDEX_KEYS.has(key));
  if (unknown !== undefined) throw new FrontmatterError(unknown, `"${unknown}" is not an index.mdx field (use title, description, logo, theme)`);
  if (typeof title !== "string" || title.trim() === "") throw new FrontmatterError("title", '"title" must be a non-empty string');
  return {
    title,
    ...optionalEntry("description", optionalText("description", description)),
    ...optionalEntry("logo", optionalText("logo", logo)),
    theme: oneOf("theme", theme, THEMES),
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
