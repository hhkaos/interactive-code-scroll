import { FrontmatterError, readTutorialConfig, type TutorialConfig, type Variant } from "./frontmatter.ts";
import { parseSource, type ParsedSource } from "./markers.ts";
import { OUTPUT_EXTENSIONS, outputKind, resolveOutput } from "./output.ts";
import { PREVIEW_ENTRY } from "./preview/build-html.ts";
import { variantVisible } from "./variants.ts";
import { globToRegExp, selectVisible } from "./visible-files.ts";
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
  /** Binary files under `code/`. */
  binaries?: string[];
  images: string[];
  /** Captured outputs, relative to `output/`. */
  outputs?: string[];
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

/** A variant with the paths it owns, all relative to `code/`. */
interface VariantFiles extends Variant {
  /** Text files that get a tab. */
  visible: Set<string>;
  /** Region id → the file that defines it (region ids are unique within a variant). */
  regions: Map<string, string>;
  /** Web code (has `index.html`): shows the Preview, never the Result pane. */
  web: boolean;
}

const inFolder = (dir: string, path: string) => path.startsWith(`${dir}/`);

/** Checks the variant folders and returns what step validation needs; `undefined` without variants. */
function checkVariants(
  variants: readonly Variant[],
  files: readonly SourceFile[],
  binaries: readonly string[],
  parsed: ReadonlyMap<string, ParsedSource>,
  reportFrontmatter: (key: string, detail: string) => void,
  errors: string[],
): VariantFiles[] {
  for (const path of [...files.map((f) => f.path), ...binaries].sort()) {
    if (variants.some((v) => inFolder(v.dir, path))) continue;
    errors.push(`code/${path}: file is outside every variant folder; move it into one of ${variants.map((v) => `code/${v.dir}/`).join(", ")}`);
  }
  return variants.map((variant) => {
    const own = files.map((f) => f.path).filter((path) => inFolder(variant.dir, path));
    const label = `variant "${variant.id}"`;
    if (own.length === 0 && !binaries.some((path) => inFolder(variant.dir, path))) {
      reportFrontmatter("variants", `${label} folder code/${variant.dir}/ has no files`);
    }
    const entry = `${variant.dir}/${variant.entry}`;
    if (binaries.includes(entry)) reportFrontmatter("variants", `${label} entry "${variant.entry}" is binary and cannot be shown`);
    else if (own.length > 0 && !own.includes(entry)) reportFrontmatter("variants", `${label} entry "${variant.entry}" not found in code/${variant.dir}/`);

    const { visible, unmatched } = variantVisible(variant, own);
    for (const pattern of unmatched) {
      reportFrontmatter("variants", `${label} files "${pattern}" matches no text file in code/${variant.dir}/`);
    }
    const visibleSet = new Set(visible);
    if (variant.files !== undefined && own.includes(entry) && !visibleSet.has(entry)) {
      reportFrontmatter("variants", `${label} entry "${variant.entry}" must be one of its "files"`);
    }

    const regions = new Map<string, string>();
    for (const path of own) {
      for (const region of parsed.get(path)?.regions ?? []) {
        const other = regions.get(region.id);
        if (other === undefined) regions.set(region.id, path);
        else errors.push(`code/${path}: region "${region.id}" is also defined in code/${other}; region ids must be unique within ${label}`);
      }
    }
    return { ...variant, visible: visibleSet, regions, web: own.includes(`${variant.dir}/${PREVIEW_ENTRY}`) };
  });
}

/** Returns every broken reference as `file:line:column message`; empty when valid. */
export function validateTutorial({
  mdxFile,
  uses,
  files,
  binaries = [],
  images,
  outputs = [],
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
  // With variants, the Preview applies to web variants only, so no variant is required to have it.
  if (config && !config.variants && config.preview !== "off" && !files.some((f) => f.path === PREVIEW_ENTRY)) {
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

  // Invalid variants config: skip file and region checks rather than judge them as a single project.
  const skipFileChecks = config === undefined && frontmatter.variants !== undefined;
  const variants = config?.variants && checkVariants(config.variants, files, binaries, parsed, reportFrontmatter, errors);
  const visibleSet = new Set<string>();
  const embedded = new Set<string>();
  if (variants) {
    for (const variant of variants) {
      for (const path of variant.visible) visibleSet.add(path);
      embedded.add(`${variant.dir}/${PREVIEW_ENTRY}`);
    }
  } else if (!skipFileChecks) {
    const { visible, unmatched } = selectVisible(
      files.map((f) => f.path),
      config?.files,
    );
    for (const pattern of unmatched) {
      const regex = globToRegExp(pattern);
      reportFrontmatter(
        "files",
        binaries.some((path) => regex.test(path))
          ? `files "${pattern}" matches only binary files, which cannot be shown as tabs`
          : `files "${pattern}" matches no text file in code/`,
      );
    }
    for (const path of visible) visibleSet.add(path);
    embedded.add(PREVIEW_ENTRY);
  }

  const varNames = new Set([...parsed.values()].flatMap((p) => p.vars.map((v) => v.name)));
  // The page embeds only tabbed files (plus the Preview entry); others reach the ZIP unchanged, so they cannot hold vars.
  for (const [path, source] of parsed) {
    if (skipFileChecks || visibleSet.has(path) || embedded.has(path)) continue;
    for (const v of source.vars) {
      const where = variants ? `its variant's "files"` : 'frontmatter "files"';
      errors.push(`code/${path}: @var "${v.name}" is in a file not shown in tabs; add the file to ${where} or remove the marker`);
    }
  }
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
      const only = text("only");
      const output = text("output");
      if (output !== undefined && !skipFileChecks) checkOutput(output, only, report);
      if (variants) {
        checkVariantStep(variants, only, file, region, report);
      } else if (!skipFileChecks) {
        if (only !== undefined) report('"only" requires frontmatter "variants"');
        const source = file === undefined ? undefined : parsed.get(file);
        if (file !== undefined) {
          if (binaries.includes(file)) report(`file "${file}" is binary and cannot be shown`);
          else if (!files.some((f) => f.path === file)) report(`file "${file}" not found in code/`);
          else if (!visibleSet.has(file)) report(`file "${file}" is not shown in tabs; add it to frontmatter "files"`);
        }
        if (region !== undefined) {
          if (file === undefined) report(`region "${region}" requires a "file"`);
          else if (source && !source.regions.some((r) => r.id === region)) {
            report(`region "${region}" not found in code/${file}`);
          }
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

  /** Web code shows the Preview, so only the non-web variants a step covers must resolve its output. */
  function checkOutput(output: string, only: string | undefined, report: (message: string) => void): void {
    if (!outputKind(output)) {
      report(`output "${output}" must be a ${OUTPUT_EXTENSIONS.map((ext) => `.${ext}`).join(", ")} file`);
      return;
    }
    if (!variants) {
      if (files.some((f) => f.path === PREVIEW_ENTRY)) {
        report(`output "${output}" has no effect: code/${PREVIEW_ENTRY} makes the tutorial web code, which shows the Preview`);
      } else if (!outputs.includes(output)) report(`output "${output}" not found in output/`);
      return;
    }
    const ids = only?.split(/\s+/).filter(Boolean);
    const covered = ids ? variants.filter((v) => ids.includes(v.id)) : variants;
    const targets = covered.filter((v) => !v.web);
    if (covered.length > 0 && targets.length === 0) {
      report(`output "${output}" has no effect: every variant of the step is web code, which shows the Preview`);
    }
    for (const variant of targets) {
      if (resolveOutput(output, outputs, variant.id) === undefined) {
        report(`output "${output}" not found for variant "${variant.id}" (output/${variant.id}/${output} or output/${output})`);
      }
    }
  }

  function checkVariantStep(
    all: readonly VariantFiles[],
    only: string | undefined,
    file: string | undefined,
    region: string | undefined,
    report: (message: string) => void,
  ): void {
    let covered = all;
    if (only !== undefined) {
      const ids = only.split(/\s+/).filter(Boolean);
      if (ids.length === 0) report('"only" must list variant ids');
      for (const id of ids) {
        if (!all.some((v) => v.id === id)) report(`only "${id}" is not a variant id (${all.map((v) => v.id).join(", ")})`);
      }
      covered = all.filter((v) => ids.includes(v.id));
    }
    for (const variant of covered) {
      const label = `variant "${variant.id}"`;
      if (file !== undefined) {
        const path = `${variant.dir}/${file}`;
        if (binaries.includes(path)) report(`file "${file}" is binary in ${label} and cannot be shown`);
        else if (!files.some((f) => f.path === path)) report(`file "${file}" not found in ${label} (code/${path}); add it or set "only"`);
        else if (!variant.visible.has(path)) report(`file "${file}" is not shown in tabs in ${label}; add it to its "files"`);
        else if (region !== undefined) {
          const source = parsed.get(path);
          if (source && !source.regions.some((r) => r.id === region)) report(`region "${region}" not found in code/${path}`);
        }
      } else if (region !== undefined) {
        const owner = variant.regions.get(region);
        if (owner === undefined) report(`region "${region}" not found in ${label} (code/${variant.dir}/); add it or set "only"`);
        else if (!variant.visible.has(owner)) report(`region "${region}" is in code/${owner}, which is not shown in tabs in ${label}`);
      }
    }
  }
}
