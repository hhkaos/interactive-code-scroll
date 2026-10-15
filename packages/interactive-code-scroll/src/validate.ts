import { resolveEmbed } from "./embed.ts";
import { ERROR_RULE_FILE, readErrorRule } from "./error-rule.ts";
import { FrontmatterError, isRemoteLogo, readIndexConfig, readTutorialConfig, type TutorialConfig, type Variant } from "./frontmatter.ts";
import { CHOICE_TYPES, FIELD_TYPES, parseStaticLiteral, resolveOptions } from "./field-options.ts";
import { extensionOf } from "./file-types.ts";
import { isJsonRegion, locateJsonRegion, locateJsonValue, parseJsonTarget, type JsonVar } from "./json-vars.ts";
import { formValue, parseSource, varKind, type ParsedSource, type VarKind } from "./markers.ts";
import { OUTPUT_EXTENSIONS, outputKind, resolveOutput } from "./output.ts";
import { PREVIEW_ENTRY } from "./preview/build-html.ts";
import { parseHttpFile, requestIndex, type HttpFile } from "./requests.ts";
import { variantVisible } from "./variants.ts";
import { globToRegExp, selectVisible } from "./visible-files.ts";
import type { IgnoredPath, SourceFile } from "./tutorial-files.ts";

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
  /** Paths under `code/` with a segment starting with `.` (what frontmatter `include` can match). */
  hiddenCode?: string[];
  /** Paths under `code/` that a `.gitignore` excludes (what frontmatter `include` can also match). */
  ignoredCode?: IgnoredPath[];
  images: string[];
  /** Files under `embeds/`. */
  embeds?: string[];
  /** Captured outputs, relative to `output/`. */
  outputs?: string[];
  /** Text files under `requests/`. */
  requests?: SourceFile[];
  /** Binary files under `requests/`. */
  requestBinaries?: string[];
  /** JSON option lists under `field-options/`. */
  fieldOptions?: SourceFile[];
  /** Parsed frontmatter of the MDX file (empty when it has none). */
  frontmatter?: Record<string, unknown>;
  /** 1-based line of each frontmatter key, to position frontmatter errors. */
  frontmatterLines?: Readonly<Record<string, number>>;
}

const STEP_ID = /^[a-z0-9][a-z0-9-]*$/;
const HINT_ID = /^[a-z0-9][a-z0-9-]*$/;
const PREVIEW_STATES = new Set(["expanded", "collapsed", "keep"]);
const MAXIMIZE_STATES = new Set(["code", "preview", "none"]);
/** The intro comes before any step: the pane state and media, no code focus or result. */
const INTRO_PROPS = ["preview", "maximize", "images", "embed"];
const STRING_ARRAY = /^\s*\[\s*(?:(?:"[^"\\]*"|'[^'\\]*')\s*(?:,\s*(?:"[^"\\]*"|'[^'\\]*')\s*)*,?\s*)?\]\s*$/;

/** Reads `images={["a.png", 'b.png']}`: only static string arrays are allowed. */
export function parseStringArray(expression: string): string[] | undefined {
  if (!STRING_ARRAY.test(expression)) return undefined;
  return [...expression.matchAll(/"([^"\\]*)"|'([^'\\]*)'/g)].map((m) => m[1] ?? m[2]!);
}

/**
 * `<VarField json="file#/pointer">` targets (a string, or a static array for several files) by
 * `code/` path. Targets with problems are left out, so parsing never fails on them.
 */
export function jsonVarTargets(
  mdxFile: string,
  uses: readonly ComponentUse[],
  files: readonly SourceFile[],
): { jsonVars: Record<string, JsonVar[]>; errors: string[] } {
  const jsonVars: Record<string, JsonVar[]> = {};
  const errors: string[] = [];
  for (const use of uses) {
    const value = use.attributes.json;
    const name = use.attributes.name;
    if (use.name !== "VarField" || value === undefined || typeof name !== "string") continue;
    const report = (message: string) => errors.push(`${mdxFile}:${use.line}:${use.column} <VarField> ${message}`);
    const targets = typeof value === "string" ? [value] : value === true ? undefined : parseStringArray(value.expression);
    if (!targets) {
      report('"json" must be "<file>#<pointer>" or a static array of them');
      continue;
    }
    for (const target of targets) {
      const parsed = parseJsonTarget(target);
      if (typeof parsed === "string") {
        report(`json ${parsed}`);
        continue;
      }
      const file = files.find((f) => f.path === parsed.file);
      if (!file) {
        report(`json file "${parsed.file}" not found in code/`);
        continue;
      }
      const span = locateJsonValue(file.source, parsed.pointer);
      if (typeof span === "string") report(`json code/${parsed.file}: ${span}`);
      else if (span.kind !== "string" && span.kind !== "number" && span.kind !== "boolean") {
        report(`json "${target}" is ${span.kind === "null" ? "null" : `an ${span.kind}`}; only strings, numbers and booleans can be vars`);
      } else if (jsonVars[parsed.file]?.some((v) => v.name === name)) report(`json "${parsed.file}" is listed twice for "${name}"`);
      else (jsonVars[parsed.file] ??= []).push({ name, pointer: parsed.pointer });
    }
  }
  return { jsonVars, errors };
}

/**
 * `<Step file="x.json" region="/pointer">` targets by `code/` path (`file` is relative to each covered
 * variant folder with `variants`). Missing files and `only` problems are left to the step checks.
 */
export function jsonRegionTargets(
  mdxFile: string,
  uses: readonly ComponentUse[],
  files: readonly SourceFile[],
  variants?: readonly Pick<Variant, "id" | "dir">[],
): { jsonRegions: Record<string, string[]>; errors: string[] } {
  const jsonRegions: Record<string, string[]> = {};
  const errors: string[] = [];
  for (const use of uses) {
    const { file, region, only } = use.attributes;
    if (use.name !== "Step" || typeof region !== "string" || !isJsonRegion(region) || typeof file !== "string") continue;
    const report = (message: string) => errors.push(`${mdxFile}:${use.line}:${use.column} <Step> ${message}`);
    const ids = typeof only === "string" ? only.split(/\s+/).filter(Boolean) : undefined;
    const paths = variants ? variants.filter((v) => !ids || ids.includes(v.id)).map((v) => `${v.dir}/${file}`) : [file];
    for (const path of paths) {
      const source = files.find((f) => f.path === path);
      if (!source) continue;
      if (extensionOf(path) !== "json") {
        report(`region "${region}" is a JSON Pointer, but code/${path} is not a .json file; mark the region with #region comments`);
        continue;
      }
      let code: string;
      try {
        code = parseSource(source.source, `code/${path}`).code;
      } catch {
        continue; // Marker errors are reported with the file.
      }
      const span = locateJsonRegion(code, region);
      if (typeof span !== "string") {
        if (!jsonRegions[path]?.includes(region)) (jsonRegions[path] ??= []).push(region);
      } else if (span === `pointer "${region}" not found`) report(`region "${region}" not found in code/${path}`);
      else report(`region "${region}": code/${path}: ${span}`);
    }
  }
  return { jsonRegions, errors };
}

/**
 * One form field feeds every file that marks the same var, so all of them must agree on its default.
 * `parsed` is keyed by the path shown in errors (`code/…`, `requests/…`).
 */
function inconsistentDefaults(parsed: ReadonlyMap<string, ParsedSource>): string[] {
  const byName = new Map<string, { path: string; kind: VarKind; value: string; literal: string }[]>();
  for (const [path, source] of parsed) {
    for (const v of source.vars) {
      const uses = byName.get(v.name) ?? [];
      uses.push({ path, kind: varKind(v), value: formValue(v), literal: v.defaultValue });
      byName.set(v.name, uses);
    }
  }
  const errors: string[] = [];
  for (const [name, uses] of byName) {
    if (new Set(uses.map((u) => u.kind)).size > 1) {
      const listed = uses.map((u) => `${u.path} ${u.kind}`).join(", ");
      errors.push(`@var "${name}" must have the same type in every file: ${listed}`);
    } else if (new Set(uses.map((u) => u.value)).size > 1) {
      const listed = uses.map((u) => `${u.path} ${u.kind === "string" ? JSON.stringify(u.literal) : u.literal}`).join(", ");
      errors.push(`@var "${name}" must have the same default in every file: ${listed}`);
    }
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
  ignoredMatches: (pattern: string) => string[] = () => [],
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
      const gitignored = ignoredMatches(`${variant.dir}/${pattern}`);
      reportFrontmatter(
        "variants",
        gitignored.length > 0
          ? `${label} files "${pattern}" matches only gitignored files, which are not published (${gitignored.join(", ")}); add them to frontmatter "include" to publish them`
          : `${label} files "${pattern}" matches no text file in code/${variant.dir}/`,
      );
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
  hiddenCode = [],
  ignoredCode = [],
  images,
  embeds = [],
  outputs = [],
  requests = [],
  fieldOptions = [],
  requestBinaries = [],
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
  for (const pattern of config?.include ?? []) {
    const regex = globToRegExp(pattern);
    if (!hiddenCode.some((path) => regex.test(path)) && !ignoredCode.some(({ path }) => regex.test(path))) {
      reportFrontmatter("include", `include "${pattern}" matches no path in code/ starting with "." or gitignored (generated folders such as node_modules are never published)`);
    }
  }
  if (config?.logo !== undefined && !isRemoteLogo(config.logo) && !images.includes(config.logo)) {
    reportFrontmatter("logo", `logo "${config.logo}" not found in images/ (or use an https:// URL)`);
  }
  for (const [index, variant] of (config?.variants ?? []).entries()) {
    if (variant.logo !== undefined && !isRemoteLogo(variant.logo) && !images.includes(variant.logo)) {
      reportFrontmatter("variants", `variants[${index}].logo "${variant.logo}" not found in images/ (or use an https:// URL)`);
    }
  }
  // With variants, the Preview applies to web variants only, so no variant is required to have it.
  if (config && !config.variants && config.preview !== "off" && !files.some((f) => f.path === PREVIEW_ENTRY)) {
    reportFrontmatter("preview", `preview "${config.preview}" needs code/${PREVIEW_ENTRY} (or set preview: off)`);
  }

  // Gitignored paths that `include` does not publish: references to them get a specific message.
  const ignored = new Map(ignoredCode.filter(({ path }) => !files.some((f) => f.path === path) && !binaries.includes(path)).map(({ path, by }) => [path, by]));
  const ignoredMatches = (pattern: string) => {
    const regex = globToRegExp(pattern);
    return [...ignored].filter(([path]) => regex.test(path)).map(([path, by]) => `code/${path} by ${by}`);
  };

  const { jsonVars, errors: jsonErrors } = jsonVarTargets(mdxFile, uses, files);
  errors.push(...jsonErrors);
  const parsed = new Map<string, ParsedSource>();
  for (const file of files) {
    try {
      parsed.set(file.path, parseSource(file.source, `code/${file.path}`, jsonVars[file.path]));
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  // Invalid variants config: skip file and region checks rather than judge them as a single project.
  const skipFileChecks = config === undefined && frontmatter.variants !== undefined;
  const variants = config?.variants && checkVariants(config.variants, files, binaries, parsed, reportFrontmatter, errors, ignoredMatches);
  if (!skipFileChecks) errors.push(...jsonRegionTargets(mdxFile, uses, files, config?.variants).errors);
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
      const gitignored = ignoredMatches(pattern);
      reportFrontmatter(
        "files",
        binaries.some((path) => regex.test(path))
          ? `files "${pattern}" matches only binary files, which cannot be shown as tabs`
          : gitignored.length > 0
            ? `files "${pattern}" matches only gitignored files, which are not published (${gitignored.join(", ")}); add them to frontmatter "include" to publish them`
            : `files "${pattern}" matches no text file in code/`,
      );
    }
    for (const path of visible) visibleSet.add(path);
    embedded.add(PREVIEW_ENTRY);
  }

  // requests/: the runner's sources, zipped next to the project; their file variables are vars too.
  const requestSources = new Map<string, ParsedSource>();
  const httpFiles: HttpFile[] = [];
  for (const path of requestBinaries) errors.push(`requests/${path}: binary files are not allowed in requests/`);
  for (const file of requests) {
    try {
      requestSources.set(`requests/${file.path}`, parseSource(file.source, `requests/${file.path}`));
    } catch (error) {
      errors.push((error as Error).message);
    }
    if (file.path === ERROR_RULE_FILE) {
      for (const { line, message } of readErrorRule(file.source).errors) errors.push(`requests/${file.path}:${line}: ${message}`);
    }
    if (!file.path.endsWith(".http")) continue;
    const http = parseHttpFile(file.source, file.path);
    errors.push(...http.errors);
    httpFiles.push(http.file);
  }
  const requestNames = requestIndex(httpFiles);
  errors.push(...requestNames.errors);
  if (requests.length + requestBinaries.length > 0 && !skipFileChecks) {
    // Every ZIP holds requests/ at its root, next to the project (a variant's folder contents).
    const roots = variants ? variants.map((v) => `${v.dir}/`) : [""];
    for (const root of roots) {
      const clash = [...files.map((f) => f.path), ...binaries].find((path) => path.startsWith(`${root}requests/`));
      if (clash) errors.push(`code/${clash}: code/${root}requests/ would overwrite requests/ in the ZIP; rename the folder`);
    }
  }

  const varRefs = new Map([...parsed.values(), ...requestSources.values()].flatMap((p) => p.vars.map((v) => [v.name, v] as const)));
  // The page embeds only tabbed files (plus the Preview entry); others reach the ZIP unchanged, so they cannot hold vars.
  for (const [path, source] of parsed) {
    if (skipFileChecks || visibleSet.has(path) || embedded.has(path)) continue;
    for (const v of source.vars) {
      const where = variants ? `its variant's "files"` : 'frontmatter "files"';
      errors.push(`code/${path}: @var "${v.name}" is in a file not shown in tabs; add the file to ${where} or remove the marker`);
    }
  }
  errors.push(...inconsistentDefaults(new Map([...[...parsed].map(([path, source]) => [`code/${path}`, source] as const), ...requestSources])));
  const stepIds = new Set<string>();
  const hintIds = new Set<string>();
  // `maximize="preview"` needs a pane under the code: the iframe Preview or the Result pane (a step with a result).
  const hasPane =
    config?.preview === "iframe" ||
    config?.preview === "both" ||
    uses.some((u) => u.name === "Step" && (u.attributes.output !== undefined || u.attributes.request !== undefined));

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
      checkPaneState(text, report);
      const only = text("only");
      const output = text("output");
      if (output !== undefined && !skipFileChecks) checkOutput(output, only, report);
      const request = text("request");
      if (request !== undefined) checkRequest(request, only, report);
      if (variants) {
        checkVariantStep(variants, only, file, region, report);
      } else if (!skipFileChecks) {
        if (only !== undefined) report('"only" requires frontmatter "variants"');
        const source = file === undefined ? undefined : parsed.get(file);
        if (file !== undefined) {
          if (binaries.includes(file)) report(`file "${file}" is binary and cannot be shown`);
          else if (ignored.has(file)) report(`file "${file}" is gitignored (by ${ignored.get(file)}) and not published; add it to frontmatter "include" to publish it`);
          else if (!files.some((f) => f.path === file)) report(`file "${file}" not found in code/`);
          else if (!visibleSet.has(file)) report(`file "${file}" is not shown in tabs; add it to frontmatter "files"`);
        }
        if (region !== undefined) {
          if (file === undefined) report(`region "${region}" requires a "file"`);
          else if (source && !isJsonRegion(region) && !source.regions.some((r) => r.id === region)) {
            report(`region "${region}" not found in code/${file}`);
          }
        }
      }

      checkMedia(use, text, report);
    }

    if (use.name === "Intro") {
      checkPaneState(text, report);
      checkMedia(use, text, report);
      for (const attr of Object.keys(use.attributes)) {
        if (!INTRO_PROPS.includes(attr)) report(`"${attr}" is not available on <Intro> (only ${INTRO_PROPS.join(", ")})`);
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
      else if (!varRefs.has(name) && use.attributes.json === undefined) report(`no "@var ${name}" found in code/`);
      if (!text("label")) report('requires a "label"');
      text("placeholder");
      const ref = name === undefined ? undefined : varRefs.get(name);
      const kind = ref && varKind(ref);
      if (kind !== undefined && kind !== "string") {
        if (use.attributes.secret !== undefined) report(`"secret" needs a string var; "${name}" is a ${kind}`);
        if (kind === "boolean" && use.attributes.placeholder !== undefined) report(`"placeholder" has no effect on a boolean var ("${name}")`);
      }
      checkFieldType(use, text("type"), ref && { kind: kind!, value: formValue(ref) }, report);
      const persist = use.attributes.persist;
      const validPersist =
        persist === undefined || persist === true || persist === "tutorial" || (typeof persist === "object" && /^\s*(?:true|false)\s*$/.test(persist.expression));
      if (!validPersist) report('"persist" must be persist (shared by the site) or persist="tutorial"');
    }
  }
  return errors;

  /** `<VarField type>` and `options` against the var they edit (`undefined` when the var is missing). */
  function checkFieldType(
    use: ComponentUse,
    type: string | undefined, target: { kind: VarKind; value: string } | undefined, report: (message: string) => void): void {
    if (type !== undefined && !(FIELD_TYPES as readonly string[]).includes(type)) {
      report(`"type" must be one of ${FIELD_TYPES.join(", ")}`);
      return;
    }
    const choice = type !== undefined && CHOICE_TYPES.has(type);
    const raw = use.attributes.options;
    if (raw !== undefined && !choice) report(`"options" needs type="select", "radio" or "combobox"`);
    if (choice && raw === undefined) report(`type="${type}" requires "options"`);
    if (type !== undefined && type !== "text" && use.attributes.secret !== undefined) report(`"secret" needs a text field, not type="${type}"`);
    if ((type === "select" || type === "radio") && use.attributes.placeholder !== undefined) report(`"placeholder" has no effect on type="${type}"`);
    if (!target || type === undefined) return;
    const allowed = choice ? ["string", "number"] : ["string"];
    if (!allowed.includes(target.kind)) {
      report(`type="${type}" cannot edit a ${target.kind} var`);
      return;
    }
    if (!choice || raw === undefined || raw === true) return;
    const options = resolveOptions(typeof raw === "string" ? raw : parseStaticLiteral(raw.expression), fieldOptions);
    if (typeof options === "string") {
      report(typeof raw === "string" ? options : `"options" must be a static array of strings, numbers or { value, label } objects`);
      return;
    }
    if (target.kind === "number") {
      const bad = options.find((o) => !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(o.value));
      if (bad) report(`option "${bad.value}" is not a number, but the var is`);
    }
    const optional = type === "combobox" && target.value === "";
    if (!optional && !options.some((o) => o.value === target.value)) {
      report(`the code default ${JSON.stringify(target.value)} is not one of the options`);
    }
  }

  /** `images=` and `embed=` (shown instead of code), shared by <Step> and <Intro>. */
  function checkMedia(use: ComponentUse, text: (attr: string) => string | undefined, report: (message: string) => void): void {
    const imagesAttr = use.attributes.images;
    if (imagesAttr !== undefined) {
      const list = typeof imagesAttr === "object" ? parseStringArray(imagesAttr.expression) : undefined;
      if (!list) report('"images" must be a static array of strings, e.g. images={["a.png"]}');
      for (const image of list ?? []) {
        if (!images.includes(image)) report(`image "${image}" not found in images/`);
      }
    }
    const embed = text("embed");
    if (embed !== undefined) {
      const resolved = resolveEmbed(embed, embeds);
      if ("error" in resolved) report(resolved.error);
      if (imagesAttr !== undefined) report(`"embed" and "images" cannot be combined; use ${use.name === "Intro" ? "one of them" : "one step for each"}`);
    }
  }

  /** `preview=` and `maximize=`, shared by <Step> and <Intro>. */
  function checkPaneState(text: (attr: string) => string | undefined, report: (message: string) => void): void {
    const preview = text("preview");
    if (preview !== undefined && !PREVIEW_STATES.has(preview)) {
      report('"preview" must be one of expanded, collapsed, keep');
    }
    const maximize = text("maximize");
    if (maximize !== undefined && !MAXIMIZE_STATES.has(maximize)) {
      report('"maximize" must be one of code, preview, none');
    } else if (maximize === "preview" && preview === "collapsed") {
      report('maximize="preview" conflicts with preview="collapsed"');
    } else if (maximize === "preview" && config && !hasPane) {
      report('maximize="preview" has no pane to maximize: no iframe Preview (frontmatter "preview") and no step with a result');
    }
  }

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
    for (const variant of resultVariants(variants, only, `output "${output}"`, report)) {
      if (resolveOutput(output, outputs, variant.id) === undefined) {
        report(`output "${output}" not found for variant "${variant.id}" (output/${variant.id}/${output} or output/${output})`);
      }
    }
  }

  /** Non-web variants a step covers: they show its result; reports a step whose variants are all web code. */
  function resultVariants(all: readonly VariantFiles[], only: string | undefined, what: string, report: (message: string) => void): VariantFiles[] {
    const ids = only?.split(/\s+/).filter(Boolean);
    const covered = ids ? all.filter((v) => ids.includes(v.id)) : all;
    const targets = covered.filter((v) => !v.web);
    if (covered.length > 0 && targets.length === 0) {
      report(`${what} has no effect: every variant of the step is web code, which shows the Preview`);
    }
    return targets;
  }

  /** `request="a b"`: named requests of requests/, the first being the default "Run as" choice. */
  function checkRequest(request: string, only: string | undefined, report: (message: string) => void): void {
    const names = request.split(/\s+/).filter(Boolean);
    if (names.length === 0) report('"request" must list request names');
    for (const [index, name] of names.entries()) {
      if (names.indexOf(name) !== index) report(`request "${name}" is listed twice`);
      else if (!requestNames.names.has(name)) report(`request "${name}" not found in requests/ (# @name ${name})`);
    }
    if (names.length === 0 || skipFileChecks) return;
    if (variants) resultVariants(variants, only, `request "${request}"`, report);
    else if (files.some((f) => f.path === PREVIEW_ENTRY)) {
      report(`request "${request}" has no effect: code/${PREVIEW_ENTRY} makes the tutorial web code, which shows the Preview`);
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
    if (file === undefined && region !== undefined && isJsonRegion(region)) {
      report(`region "${region}" requires a "file"`);
      return;
    }
    for (const variant of covered) {
      const label = `variant "${variant.id}"`;
      if (file !== undefined) {
        const path = `${variant.dir}/${file}`;
        if (binaries.includes(path)) report(`file "${file}" is binary in ${label} and cannot be shown`);
        else if (ignored.has(path)) report(`file "${file}" is gitignored in ${label} (code/${path} by ${ignored.get(path)}) and not published; add it to frontmatter "include" to publish it`);
        else if (!files.some((f) => f.path === path)) report(`file "${file}" not found in ${label} (code/${path}); add it or set "only"`);
        else if (!variant.visible.has(path)) report(`file "${file}" is not shown in tabs in ${label}; add it to its "files"`);
        else if (region !== undefined) {
          const source = parsed.get(path);
          if (source && !isJsonRegion(region) && !source.regions.some((r) => r.id === region)) report(`region "${region}" not found in code/${path}`);
        }
      } else if (region !== undefined) {
        const owner = variant.regions.get(region);
        if (owner === undefined) report(`region "${region}" not found in ${label} (code/${variant.dir}/); add it or set "only"`);
        else if (!variant.visible.has(owner)) report(`region "${region}" is in code/${owner}, which is not shown in tabs in ${label}`);
      }
    }
  }
}

export interface SeriesIndexInput {
  mdxFile: string;
  /** Every JSX component in the MDX (not only tutorial components). */
  uses: ComponentUse[];
  /** Files in the series folder's `images/`. */
  images: string[];
  frontmatter?: Record<string, unknown>;
  frontmatterLines?: Readonly<Record<string, number>>;
}

const TUTORIAL_LIST_ATTRIBUTES = new Set(["tags", "level"]);

/** Validates a series `index.mdx`: its frontmatter, logo, `<TutorialList>` uses and one `<TutorialFilter>` and `<TutorialFavorites>` at most (the only components it may use). */
export function validateSeriesIndex({ mdxFile, uses, images, frontmatter = {}, frontmatterLines = {} }: SeriesIndexInput): string[] {
  const errors: string[] = [];
  try {
    const config = readIndexConfig(frontmatter);
    if (config.logo !== undefined && !isRemoteLogo(config.logo) && !images.includes(config.logo)) {
      errors.push(`${mdxFile}:${frontmatterLines.logo ?? 1}:1 frontmatter logo "${config.logo}" not found in images/ (or use an https:// URL)`);
    }
    for (const [tag, logo] of (config.tagGroups ?? []).flatMap((group) => Object.entries(group.logos ?? {}))) {
      if (!isRemoteLogo(logo) && !images.includes(logo)) {
        errors.push(`${mdxFile}:${frontmatterLines.tagGroups ?? 1}:1 frontmatter tagGroups tag "${tag}": logo "${logo}" not found in images/ (or use an https:// URL)`);
      }
    }
  } catch (error) {
    if (!(error instanceof FrontmatterError)) throw error;
    errors.push(`${mdxFile}:${frontmatterLines[error.key] ?? 1}:1 frontmatter ${error.detail}`);
  }
  const singles = new Map([
    ["TutorialFilter", "it filters every list on the page"],
    ["TutorialFavorites", "it lists every favorite"],
  ]);
  const seen = new Set<string>();
  for (const use of uses) {
    const at = `${mdxFile}:${use.line}:${use.column}`;
    const single = singles.get(use.name);
    if (single !== undefined) {
      if (seen.has(use.name)) errors.push(`${at} <${use.name}> can appear only once (${single})`);
      seen.add(use.name);
      for (const name of Object.keys(use.attributes)) errors.push(`${at} <${use.name}> takes no attributes (got "${name}")`);
      continue;
    }
    if (use.name !== "TutorialList") {
      errors.push(`${at} <${use.name}> is not available in index.mdx (use <TutorialList>, <TutorialFilter> or <TutorialFavorites>)`);
      continue;
    }
    for (const [name, value] of Object.entries(use.attributes)) {
      if (!TUTORIAL_LIST_ATTRIBUTES.has(name)) errors.push(`${at} <TutorialList> unknown attribute "${name}" (use tags or level)`);
      else if (typeof value !== "string" || value.trim() === "") errors.push(`${at} <TutorialList> ${name} must be a non-empty string`);
    }
  }
  return errors;
}
