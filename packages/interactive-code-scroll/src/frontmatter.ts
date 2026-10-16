import { askProblem, type AskEntry } from "./ask.ts";
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
  /** Image in `images/` (or an `https://` URL) shown next to the label in the switcher, as the tutorial `logo`. */
  logo?: string;
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
  /** Globs (relative to `code/`) opting in paths that start with `.` (e.g. `.github/**`), which are not published otherwise. */
  include?: string[];
  /** Code variants; absent for a single-project tutorial. */
  variants?: Variant[];
  otherVariantSteps: OtherVariantSteps;
  /** Series metadata (optional everywhere): shown on the index cards; `description` is also the page's meta description. */
  description?: string;
  tags: string[];
  level?: string;
  duration?: string;
  /** Last content update (`YYYY-MM-DD`), shown on the index card and atop the explanations. */
  updated?: string;
  /** Index position: lower first; tutorials without it come after, by title. */
  order?: number;
  /** Sibling tutorials: same `family` on a series site, told apart by `familyLabel` in the header switcher. */
  family?: { id: string; label: string };
  /** The closing panel after the last step ("Finish"); default true. */
  completion: boolean;
  /** Next tutorial in the closing panel: a series slug, or `false` for none; absent: the next one in series order. */
  next?: string | false;
  /** Feedback link in the closing panel (overrides the series `index.mdx` one); `{slug}` and `{title}` are filled in. */
  feedbackUrl?: string;
  /** Public URL of the tutorial for the closing slide's QR code (overrides the series one); `{slug}` is filled in. */
  presentationUrl?: string;
  /** Selection toolbar actions (replaces the series list); `false` for none; absent: the series', else the default. */
  ask?: AskEntry[] | false;
}

/** Frontmatter of a series site's optional `index.mdx`. */
export interface IndexConfig {
  title: string;
  description?: string;
  /** Image in the series folder's `images/` (or an `https://` URL), shown in the header and used as favicon. */
  logo?: string;
  theme: Theme;
  /** Tag families, in display order: group the filter's tags and set their colors and matching. */
  tagGroups?: TagGroup[];
  /** Default feedback link of every tutorial's closing panel (see `TutorialConfig.feedbackUrl`). */
  feedbackUrl?: string;
  /** Default QR code URL of every tutorial's closing slide (see `TutorialConfig.presentationUrl`). */
  presentationUrl?: string;
  /** Default selection toolbar actions of every tutorial (see `TutorialConfig.ask`). */
  ask?: AskEntry[] | false;
}

/** A tag family of the series filter (`tagGroups` in `index.mdx`). */
export interface TagGroup {
  name: string;
  tags: string[];
  /** Tag → logo (an image in the series folder's `images/` or an `https://` URL): shown with the tag and its variant link on cards. */
  logos?: Record<string, string>;
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
    const { id, label, dir, entry, files, logo } = item as Record<string, unknown>;
    if (typeof id !== "string" || !VARIANT_ID.test(id)) fail(`${at}.id must be lowercase letters, digits and dashes`);
    if (typeof label !== "string" || label.trim() === "") fail(`${at}.label must be a non-empty string`);
    const folder = typeof dir === "string" ? relativePath(dir) : undefined;
    if (folder === undefined) fail(`${at}.dir must be a folder relative to code/, e.g. "python"`);
    const file = typeof entry === "string" ? relativePath(entry) : undefined;
    if (file === undefined) fail(`${at}.entry must be a file path relative to the variant folder`);
    if (logo !== undefined && typeof logo !== "string") fail(`${at}.logo must be a string`);
    const variant: Variant = { id: id as string, label: label as string, dir: folder!, entry: file! };
    const globs = readFiles(files, "variants", `${at}.files`, `code/${folder}/`);
    if (globs !== undefined) variant.files = globs;
    if (logo !== undefined) variant.logo = logo as string;
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
    include,
    variants,
    otherVariantSteps = "notice",
    description,
    tags,
    level,
    duration,
    updated,
    order,
    family,
    familyLabel,
    completion = true,
    next,
    feedbackUrl,
    presentationUrl,
    ask,
  } = frontmatter;
  if (typeof title !== "string") throw new FrontmatterError("title", '"title" must be a string');
  if (typeof codeWrap !== "boolean") throw new FrontmatterError("codeWrap", '"codeWrap" must be a boolean');
  if (logo !== undefined && typeof logo !== "string") throw new FrontmatterError("logo", '"logo" must be a string');
  if (order !== undefined && (typeof order !== "number" || !Number.isFinite(order))) throw new FrontmatterError("order", '"order" must be a number');
  if (typeof completion !== "boolean") throw new FrontmatterError("completion", '"completion" must be a boolean');
  if (next !== undefined && next !== false && (typeof next !== "string" || !TUTORIAL_SLUG.test(next))) {
    throw new FrontmatterError("next", '"next" must be the slug (folder name) of a tutorial of the series, or false');
  }
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
    ...(include === undefined ? {} : { include: readFiles(include, "include", '"include"') }),
    ...(variantList === undefined ? {} : { variants: variantList }),
    otherVariantSteps: oneOf("otherVariantSteps", otherVariantSteps, OTHER_VARIANT_STEPS),
    ...optionalEntry("description", optionalText("description", description)),
    tags: readTags(tags),
    ...optionalEntry("level", optionalText("level", level)),
    ...optionalEntry("duration", optionalText("duration", duration)),
    ...optionalEntry("updated", readUpdated(updated)),
    ...(order === undefined ? {} : { order: order as number }),
    ...readFamily(family, familyLabel),
    completion,
    ...(next === undefined ? {} : { next: next as string | false }),
    ...optionalEntry("feedbackUrl", readFeedbackUrl(feedbackUrl)),
    ...optionalEntry("presentationUrl", readPresentationUrl(presentationUrl)),
    ...readAsk(ask),
  };
}

function readAsk(value: unknown): Pick<TutorialConfig, "ask"> {
  const problem = askProblem(value);
  if (problem !== undefined) throw new FrontmatterError("ask", problem);
  return value === undefined ? {} : { ask: value as AskEntry[] | false };
}

/**
 * `updated`: a calendar date as `YYYY-MM-DD`. YAML reads an unquoted date as a `Date` at midnight UTC
 * (MDX compile time), and the MDX module's exported frontmatter holds it as JSON, its ISO text (page
 * render time); every form is accepted and the result is always the `YYYY-MM-DD` text.
 */
function readUpdated(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const day = (date: Date) => (Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10));
  const text = value instanceof Date ? day(value) : typeof value === "string" ? value.replace(/^(\d{4}-\d{2}-\d{2})T00:00:00\.000Z$/, "$1") : value;
  // Round trip: refuses impossible days (2026-02-30), which Date would roll over.
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text) || day(new Date(`${text}T00:00:00Z`)) !== text) {
    throw new FrontmatterError("updated", '"updated" must be a date as YYYY-MM-DD, e.g. 2026-10-16');
  }
  return text;
}

/** An `updated` date as readers see it, e.g. "Oct 16, 2026" (in UTC: the date never shifts a day). */
export function formatUpdated(date: string): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

/** Same rule as series folder names (series.ts `SLUG_PATTERN`). */
const TUTORIAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** `feedbackUrl`: an `https://` or `mailto:` URL. */
function readFeedbackUrl(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^(https:\/\/|mailto:)\S+$/i.test(value)) {
    throw new FrontmatterError("feedbackUrl", '"feedbackUrl" must be an https:// or mailto: URL, e.g. https://github.com/owner/repo/issues/new?title={title}');
  }
  return value;
}

/** `presentationUrl`: an `http(s)://` URL (a public copy, or a local network address for the room). */
function readPresentationUrl(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^https?:\/\/\S+$/i.test(value)) {
    throw new FrontmatterError("presentationUrl", '"presentationUrl" must be an http:// or https:// URL, e.g. https://owner.github.io/tutorials/{slug}/');
  }
  return value;
}

function readFamily(family: unknown, familyLabel: unknown): Pick<TutorialConfig, "family"> {
  const id = optionalText("family", family);
  const label = optionalText("familyLabel", familyLabel);
  if (id === undefined && label === undefined) return {};
  if (id === undefined) throw new FrontmatterError("familyLabel", '"familyLabel" needs "family" (the name shared by sibling tutorials)');
  if (label === undefined) throw new FrontmatterError("family", '"family" needs "familyLabel" (this tutorial\'s name in the switcher, e.g. Python)');
  return { family: { id, label } };
}

function optionalEntry<K extends string>(key: K, value: string | undefined): Partial<Record<K, string>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, string>);
}

const INDEX_KEYS = new Set(["title", "description", "logo", "theme", "tagGroups", "feedbackUrl", "presentationUrl", "ask"]);

const TAG_GROUPS_SHAPE = '"tagGroups" must map each family name to a list of tags, e.g. { Language: [Python, JavaScript] }';

const isTagName = (tag: unknown): tag is string => typeof tag === "string" && tag.trim() !== "" && !tag.includes(",");

/** A `tagGroups` entry: a tag name, or `{ name, logo }` when `withLogos`. */
function readGroupEntry(entry: unknown, family: string, withLogos: boolean): { tag: string; logo?: string } {
  if (isTagName(entry)) return { tag: entry.trim() };
  if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
    if (!withLogos) {
      throw new FrontmatterError("tagGroups", `"tagGroups" family "${family}": tag logos are set in index.mdx only (custom index pages show variant logos)`);
    }
    const { name, logo, ...rest } = entry as Record<string, unknown>;
    const extra = Object.keys(rest)[0];
    if (extra !== undefined) throw new FrontmatterError("tagGroups", `"tagGroups" family "${family}": unknown tag field "${extra}" (use name, logo)`);
    if (!isTagName(name)) throw new FrontmatterError("tagGroups", `"tagGroups" family "${family}": a tag object needs a "name" without commas`);
    if (logo !== undefined && (typeof logo !== "string" || logo.trim() === "")) {
      throw new FrontmatterError("tagGroups", `"tagGroups" tag "${name}": "logo" must be a non-empty string`);
    }
    return { tag: name.trim(), ...(logo === undefined ? {} : { logo: logo as string }) };
  }
  throw listShapeError(family, withLogos);
}

const listShapeError = (family: string, withLogos: boolean) =>
  new FrontmatterError("tagGroups", `"tagGroups" family "${family}" must be a list of non-empty tags${withLogos ? " (or { name, logo })" : ""} without commas`);

/**
 * `tagGroups`: family name → non-empty tag list, in display order; a tag belongs to one family at most.
 * Entries may be `{ name, logo }` (tag logos on cards); `withLogos: false` refuses them (custom index pages).
 */
export function readTagGroups(value: unknown, { withLogos = true }: { withLogos?: boolean } = {}): TagGroup[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new FrontmatterError("tagGroups", TAG_GROUPS_SHAPE);
  const groups: TagGroup[] = [];
  const familyOf = new Map<string, string>();
  for (const [name, entries] of Object.entries(value)) {
    if (name.trim() === "") throw new FrontmatterError("tagGroups", '"tagGroups" family names must be non-empty');
    if (!Array.isArray(entries)) throw listShapeError(name, withLogos);
    if (entries.length === 0) throw new FrontmatterError("tagGroups", `"tagGroups" family "${name}" has no tags`);
    const group: TagGroup = { name, tags: [] };
    for (const entry of entries) {
      const { tag, logo } = readGroupEntry(entry, name, withLogos);
      const other = familyOf.get(tag);
      if (other !== undefined && other !== name) throw new FrontmatterError("tagGroups", `"tagGroups" tag "${tag}" is in two families ("${other}" and "${name}")`);
      if (other === undefined) group.tags.push(tag);
      familyOf.set(tag, name);
      if (logo !== undefined) group.logos = { ...group.logos, [tag]: logo };
    }
    groups.push(group);
  }
  return groups;
}

/** Validates a series `index.mdx` frontmatter; defaults: title "Tutorials", theme `auto`. */
export function readIndexConfig(frontmatter: Record<string, unknown>): IndexConfig {
  const { title = "Tutorials", description, logo, theme = "auto", tagGroups, feedbackUrl, presentationUrl, ask } = frontmatter;
  const unknown = Object.keys(frontmatter).find((key) => !INDEX_KEYS.has(key));
  if (unknown !== undefined) throw new FrontmatterError(unknown, `"${unknown}" is not an index.mdx field (use title, description, logo, theme, tagGroups, feedbackUrl, presentationUrl, ask)`);
  if (typeof title !== "string" || title.trim() === "") throw new FrontmatterError("title", '"title" must be a non-empty string');
  return {
    title,
    ...optionalEntry("description", optionalText("description", description)),
    ...optionalEntry("logo", optionalText("logo", logo)),
    theme: oneOf("theme", theme, THEMES),
    ...(tagGroups === undefined ? {} : { tagGroups: readTagGroups(tagGroups) }),
    ...optionalEntry("feedbackUrl", readFeedbackUrl(feedbackUrl)),
    ...optionalEntry("presentationUrl", readPresentationUrl(presentationUrl)),
    ...readAsk(ask),
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
