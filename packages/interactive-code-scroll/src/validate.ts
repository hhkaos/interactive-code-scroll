import { FrontmatterError, readTutorialConfig, type TutorialConfig } from "./frontmatter.ts";
import { parseSource, type ParsedSource } from "./markers.ts";
import { PREVIEW_ENTRY } from "./preview/build-html.ts";
import type { SourceFile } from "./tutorial-files.ts";

export type AttributeValue = string | true | { expression: string };

/** A tutorial component found in the MDX, with its source position. */
export interface ComponentUse {
  name: string;
  attributes: Record<string, AttributeValue>;
  line: number;
  column: number;
}

export interface ValidationInput {
  mdxFile: string;
  uses: ComponentUse[];
  files: SourceFile[];
  images: string[];
  /** Parsed frontmatter of the MDX file (empty when it has none). */
  frontmatter?: Record<string, unknown>;
  /** 1-based line of each frontmatter key, to position frontmatter errors. */
  frontmatterLines?: Readonly<Record<string, number>>;
}

const STEP_ID = /^[a-z0-9][a-z0-9-]*$/;
const HINT_ID = /^[a-z0-9][a-z0-9-]*$/;
const PREVIEW_STATES = new Set(["expanded", "collapsed", "keep"]);
const STRING_ARRAY = /^\s*\[\s*(?:(?:"[^"\\]*"|'[^'\\]*')\s*(?:,\s*(?:"[^"\\]*"|'[^'\\]*')\s*)*,?\s*)?\]\s*$/;

/** Reads `images={["a.png", 'b.png']}`: only static string arrays are allowed. */
export function parseStringArray(expression: string): string[] | undefined {
  if (!STRING_ARRAY.test(expression)) return undefined;
  return [...expression.matchAll(/"([^"\\]*)"|'([^'\\]*)'/g)].map((m) => m[1] ?? m[2]!);
}

/** One form field feeds every file that marks the same var, so all of them must agree on its default. */
function inconsistentDefaults(parsed: ReadonlyMap<string, ParsedSource>): string[] {
  const byName = new Map<string, { path: string; value: string }[]>();
  for (const [path, source] of parsed) {
    for (const v of source.vars) {
      const uses = byName.get(v.name) ?? [];
      uses.push({ path, value: v.defaultValue });
      byName.set(v.name, uses);
    }
  }
  const errors: string[] = [];
  for (const [name, uses] of byName) {
    if (new Set(uses.map((u) => u.value)).size < 2) continue;
    const listed = uses.map((u) => `code/${u.path} ${JSON.stringify(u.value)}`).join(", ");
    errors.push(`@var "${name}" must have the same default in every file: ${listed}`);
  }
  return errors;
}

/** Returns every broken reference as `file:line:column message`; empty when valid. */
export function validateTutorial({
  mdxFile,
  uses,
  files,
  images,
  frontmatter = {},
  frontmatterLines = {},
}: ValidationInput): string[] {
  const errors: string[] = [];
  const reportFrontmatter = (key: string, detail: string) =>
    errors.push(`${mdxFile}:${frontmatterLines[key] ?? 1}:1 frontmatter ${detail}`);
  let config: TutorialConfig | undefined;
  try {
    config = readTutorialConfig(frontmatter);
  } catch (error) {
    if (!(error instanceof FrontmatterError)) throw error;
    reportFrontmatter(error.key, error.detail);
  }
  if (config?.logo !== undefined && !images.includes(config.logo)) {
    reportFrontmatter("logo", `logo "${config.logo}" not found in images/`);
  }
  if (config && config.preview !== "off" && !files.some((f) => f.path === PREVIEW_ENTRY)) {
    reportFrontmatter("preview", `preview "${config.preview}" needs code/${PREVIEW_ENTRY} (or set preview: off)`);
  }

  const parsed = new Map<string, ParsedSource>();
  for (const file of files) {
    try {
      parsed.set(file.path, parseSource(file.source, `code/${file.path}`));
    } catch (error) {
      errors.push((error as Error).message);
    }
  }
  const varNames = new Set([...parsed.values()].flatMap((p) => p.vars.map((v) => v.name)));
  errors.push(...inconsistentDefaults(parsed));
  const stepIds = new Set<string>();
  const hintIds = new Set<string>();

  for (const use of uses) {
    const at = `${mdxFile}:${use.line}:${use.column}`;
    const report = (message: string) => errors.push(`${at} <${use.name}> ${message}`);
    const text = (attr: string): string | undefined => {
      const value = use.attributes[attr];
      if (value === undefined) return undefined;
      if (typeof value === "string") return value;
      report(`"${attr}" must be a string`);
      return undefined;
    };

    if (use.name === "Step") {
      const id = text("id");
      if (!id) report('requires an "id"');
      else if (!STEP_ID.test(id)) report(`id "${id}" must be lowercase letters, digits and dashes`);
      else if (stepIds.has(id)) report(`duplicate id "${id}"`);
      else stepIds.add(id);

      const file = text("file");
      const region = text("region");
      const preview = text("preview");
      if (preview !== undefined && !PREVIEW_STATES.has(preview)) {
        report('"preview" must be one of expanded, collapsed, keep');
      }
      const source = file === undefined ? undefined : parsed.get(file);
      if (file !== undefined && !files.some((f) => f.path === file)) report(`file "${file}" not found in code/`);
      if (region !== undefined) {
        if (file === undefined) report(`region "${region}" requires a "file"`);
        else if (source && !source.regions.some((r) => r.id === region)) {
          report(`region "${region}" not found in code/${file}`);
        }
      }

      const imagesAttr = use.attributes.images;
      if (imagesAttr !== undefined) {
        const list = typeof imagesAttr === "object" ? parseStringArray(imagesAttr.expression) : undefined;
        if (!list) report('"images" must be a static array of strings, e.g. images={["a.png"]}');
        for (const image of list ?? []) {
          if (!images.includes(image)) report(`image "${image}" not found in images/`);
        }
      }
    }

    if (use.name === "Hint") {
      const id = text("id");
      if (!id) report('requires an "id"');
      else if (!HINT_ID.test(id)) report(`id "${id}" must be lowercase letters, digits and dashes`);
      else if (hintIds.has(id)) report(`duplicate id "${id}"`);
      else hintIds.add(id);
      if (!text("label")) report('requires a "label"');
    }

    if (use.name === "VarField") {
      const name = text("name");
      if (!name) report('requires a "name"');
      else if (!varNames.has(name)) report(`no "@var ${name}" found in code/`);
      if (!text("label")) report('requires a "label"');
      text("placeholder");
    }
  }
  return errors;
}
