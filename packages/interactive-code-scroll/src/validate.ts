import { parseSource, type ParsedSource } from "./markers.ts";
import type { SourceFile } from "./tutorial-files.ts";

export type AttributeValue = string | true | { expression: string };

/** A `<Step>` or `<VarField>` found in the MDX, with its source position. */
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
}

const STEP_ID = /^[a-z0-9][a-z0-9-]*$/;
const STRING_ARRAY = /^\s*\[\s*(?:(?:"[^"\\]*"|'[^'\\]*')\s*(?:,\s*(?:"[^"\\]*"|'[^'\\]*')\s*)*,?\s*)?\]\s*$/;

/** Reads `images={["a.png", 'b.png']}`: only static string arrays are allowed. */
export function parseStringArray(expression: string): string[] | undefined {
  if (!STRING_ARRAY.test(expression)) return undefined;
  return [...expression.matchAll(/"([^"\\]*)"|'([^'\\]*)'/g)].map((m) => m[1] ?? m[2]!);
}

/** Returns every broken reference as `file:line:column message`; empty when valid. */
export function validateTutorial({ mdxFile, uses, files, images }: ValidationInput): string[] {
  const errors: string[] = [];
  const parsed = new Map<string, ParsedSource>();
  for (const file of files) {
    try {
      parsed.set(file.path, parseSource(file.source, `code/${file.path}`));
    } catch (error) {
      errors.push((error as Error).message);
    }
  }
  const varNames = new Set([...parsed.values()].flatMap((p) => p.vars.map((v) => v.name)));
  const stepIds = new Set<string>();

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

    if (use.name === "VarField") {
      const name = text("name");
      if (!name) report('requires a "name"');
      else if (!varNames.has(name)) report(`no "@var ${name}" found in code/`);
      if (!text("label")) report('requires a "label"');
    }
  }
  return errors;
}
