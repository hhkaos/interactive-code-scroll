import type { TutorialConfig, Variant } from "./frontmatter.ts";
import { langFor } from "./highlight.ts";
import { isJsonRegion, jsonRegionId, jsonRegionsOf, jsonVarsOf } from "./json-vars.ts";
import { applyVars, parseSource } from "./markers.ts";
import type { SourceFile } from "./tutorial-files.ts";
import { parseStringArray, type AttributeValue } from "./validate.ts";
import { stepFiles, variantVisible } from "./variants.ts";
import { selectVisible, stepFilesOf } from "./visible-files.ts";

/**
 * A tutorial's MDX as the Markdown export renders it: source text, and the components it turns into
 * Markdown with their attributes and content (see `markdownParts` in `llm-parts.ts`).
 */
export type MarkdownPart = string | { name: string; attributes: Record<string, AttributeValue>; children: MarkdownPart[] };

/** Frontmatter key the MDX validation fills with the tutorial's {@link MarkdownPart}s. */
export const MARKDOWN_PARTS_KEY = "interactiveCodeScrollMarkdown";

export function markdownPartsOf(frontmatter: Readonly<Record<string, unknown>>): MarkdownPart[] {
  return (frontmatter[MARKDOWN_PARTS_KEY] as MarkdownPart[] | undefined) ?? [];
}

/** Base name of a tutorial's Markdown files: `tutorial.md`, `tutorial.<variant>.md`. */
export const MARKDOWN_NAME = "tutorial";

/** File names (without `.md`) a tutorial publishes: `tutorial`, plus one per variant. */
export function markdownNames(variants: readonly Variant[] | undefined): string[] {
  return [MARKDOWN_NAME, ...(variants ?? []).map((v) => `${MARKDOWN_NAME}.${v.id}`)];
}

/** The variant a Markdown file holds: the named one, else the first; undefined without variants. */
export function markdownVariant(variants: readonly Variant[] | undefined, name: string): Variant | undefined {
  if (!variants) return undefined;
  const id = name.slice(MARKDOWN_NAME.length + 1);
  return variants.find((v) => v.id === id) ?? variants[0];
}

export interface MarkdownInput {
  /** `tutorial.mdx` split by {@link markdownParts} at MDX compile time. */
  parts: readonly MarkdownPart[];
  config: TutorialConfig;
  frontmatter: Readonly<Record<string, unknown>>;
  /** Text files under `code/`. */
  files: readonly SourceFile[];
  /** The variant this file holds; undefined without variants. */
  variant?: Variant;
  /** Interactive page URL (for a variant, without `?variant=`). */
  pageUrl: string;
  /** Public URL of a tutorial path (`tutorial.<variant>.md`, `embeds/<path>`) or of a root-relative one (an image). */
  url: (path: string) => string;
  /** `images/` path → public URL. */
  images: Readonly<Record<string, string>>;
}

/** A tutorial as plain Markdown for LLMs: prose, each step's code, then every visible file. */
export function tutorialMarkdown(input: MarkdownInput): string {
  const { parts, config, frontmatter, files, variant, pageUrl, url } = input;
  const jsonVars = jsonVarsOf(frontmatter);
  const jsonRegions = jsonRegionsOf(frontmatter);
  const parsed = new Map(files.map((f) => [f.path, parseSource(f.source, `code/${f.path}`, jsonVars[f.path], jsonRegions[f.path])]));
  const fence = (path: string, code: string, region?: string) => {
    const ticks = "`".repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map((m) => m[0].length + 1)));
    const meta = `title="code/${path}"${region === undefined ? "" : ` region="${region}"`}`;
    return `${ticks}${langFor(path, config.languages)} ${meta}\n${code.replace(/\n+$/, "")}\n${ticks}`;
  };

  const stepCode = (attrs: Record<string, AttributeValue>): string => {
    const file = text(attrs.file);
    const region = text(attrs.region);
    const path = variant ? stepFiles([variant], parsed, { file, region })[variant.id] : file;
    const source = path === undefined ? undefined : parsed.get(path);
    if (path === undefined || !source) return "";
    const code = applyVars(source, {});
    const id = region === undefined ? undefined : isJsonRegion(region) ? jsonRegionId(region) : region;
    const found = source.regions.find((r) => r.id === id);
    if (region === undefined || !found) return fence(path, code);
    return fence(path, dedent(code.split("\n").slice(found.fromLine - 1, found.toLine)).join("\n"), region);
  };

  const media = (attrs: Record<string, AttributeValue>): string => {
    const images = typeof attrs.images === "object" ? (parseStringArray(attrs.images.expression) ?? []) : [];
    const out = images.flatMap((image) => {
      const src = input.images[image];
      if (src === undefined) return [];
      // Small images are inlined as data: URIs: their name says more to an LLM than the bytes.
      return [src.startsWith("data:") ? `*Image: ${image}*` : `![${image}](${url(src)})`];
    });
    const embed = text(attrs.embed);
    if (embed !== undefined) out.push(`[Embedded page](${/^https:\/\//i.test(embed) ? embed : url(`embeds/${embed}`)})`);
    return out.join("\n\n");
  };

  const render = (part: MarkdownPart): string => {
    if (typeof part === "string") return part;
    const { name, attributes: attrs } = part;
    const content = part.children.map(render).join("");
    switch (name) {
      case "Step": {
        const only = text(attrs.only)?.split(/\s+/).filter(Boolean);
        if (variant && only && !only.includes(variant.id)) return "";
        return join(content, attrs.outline === undefined ? stepCode(attrs) : "", media(attrs));
      }
      case "Intro":
        return join(content, media(attrs));
      case "VarField":
        return `- **${text(attrs.label) ?? ""}** (\`${text(attrs.name) ?? ""}\`)`;
      case "Hint": {
        const label = text(attrs.label) ?? "";
        return content.trim() === "" ? label : `${label} (${content.trim()})`;
      }
      default:
        return content.trim();
    }
  };
  const body = parts.map(render).join("");

  const textPaths = files.map((f) => f.path);
  const stepOrder = stepFilesOf(frontmatter);
  const visible = variant ? variantVisible(variant, textPaths, stepOrder).visible : selectVisible(textPaths, config.files, stepOrder).visible;
  const finalCode = visible.flatMap((path) => {
    const source = parsed.get(path);
    return source ? [`### code/${path}\n\n${fence(path, applyVars(source, {}))}`] : [];
  });

  const variants = config.variants ?? [];
  const header = [
    `# ${config.title}`,
    config.description === undefined ? "" : `> ${config.description}`,
    `Interactive version: ${variant ? `${pageUrl}?variant=${encodeURIComponent(variant.id)}` : pageUrl}`,
    variant && variants.length > 1
      ? `Code variant: ${variant.label}. Other variants: ${variants
          .filter((v) => v.id !== variant.id)
          .map((v) => `[${v.label}](${url(`${MARKDOWN_NAME}.${v.id}.md`)})`)
          .join(", ")}.`
      : "",
  ];
  const markdown = join(...header, body, finalCode.length === 0 ? "" : `## Final code\n\n${finalCode.join("\n\n")}`);
  return `${markdown.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n")}\n`;
}

export interface LlmsEntry {
  title: string;
  description?: string;
  /** Markdown file URL. */
  href: string;
  /** Variant files: label and URL. */
  variants?: { label: string; href: string }[];
}

/** `llms.txt` ([llmstxt.org](https://llmstxt.org)): the site title and summary, then a link list. */
export function llmsTxt(title: string, description: string | undefined, entries: readonly LlmsEntry[]): string {
  const items = entries.flatMap((e) => {
    const variants = e.variants && e.variants.length > 1 ? e.variants : undefined;
    const first = `- [${e.title}](${e.href})${e.description === undefined ? "" : `: ${e.description}`}`;
    return variants ? [first, ...variants.map((v) => `- [${e.title} (${v.label})](${v.href})`)] : [first];
  });
  return `${join(`# ${title}`, description === undefined ? "" : `> ${description}`, `## Tutorials\n\n${items.join("\n")}`)}\n`;
}

function text(value: AttributeValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function join(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

/** Removes the indentation every non-blank line shares. */
function dedent(lines: readonly string[]): string[] {
  const indents = lines.filter((line) => line.trim() !== "").map((line) => /^[ \t]*/.exec(line)![0].length);
  const cut = indents.length === 0 ? 0 : Math.min(...indents);
  return lines.map((line) => line.slice(cut));
}
