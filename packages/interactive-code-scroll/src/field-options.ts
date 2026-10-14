/** `<VarField type>` values besides the defaults (a text, number or switch field from the var's type). */
export const FIELD_TYPES = ["text", "textarea", "select", "radio", "combobox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Types that pick one of `options`. */
export const CHOICE_TYPES: ReadonlySet<string> = new Set(["select", "radio", "combobox"]);

/** Folder of a tutorial with JSON option lists that `<VarField options="file.json">` names; never published. */
export const OPTIONS_DIR = "field-options";

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * Option list from inline `options={[…]}` or an options file: strings or numbers (label = value),
 * or `{ value, label }` objects. Values are unique.
 */
export function normalizeOptions(raw: unknown): FieldOption[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "must be a non-empty array";
  const options: FieldOption[] = [];
  for (const [index, item] of raw.entries()) {
    const scalar = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : undefined);
    let option: FieldOption | undefined;
    if (scalar(item) !== undefined) option = { value: scalar(item)!, label: scalar(item)! };
    else if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const { value, label, ...rest } = item as Record<string, unknown>;
      if (scalar(value) !== undefined && (label === undefined || typeof label === "string") && Object.keys(rest).length === 0) {
        option = { value: scalar(value)!, label: (label as string | undefined) ?? scalar(value)! };
      }
    }
    if (!option) return `item ${index} must be a string, a number or { value, label }`;
    if (options.some((o) => o.value === option.value)) return `value "${option.value}" is listed twice`;
    options.push(option);
  }
  return options;
}

class LiteralError extends Error {}

/**
 * Reads a static MDX expression such as `[{ value: "a", label: "A" }, "b"]`: arrays, objects with
 * plain or quoted keys, strings, numbers and booleans. `undefined` for anything else (variables,
 * calls, template literals), which validation reports.
 */
export function parseStaticLiteral(expression: string): unknown {
  let i = 0;
  const space = () => {
    while (i < expression.length && /\s/.test(expression[i]!)) i++;
  };
  const fail = (): never => {
    throw new LiteralError();
  };
  const take = (char: string) => {
    space();
    if (expression[i] !== char) fail();
    i++;
  };
  const string = (): string => {
    const quote = expression[i]!;
    let out = "";
    i++;
    while (expression[i] !== quote) {
      if (i >= expression.length || expression[i] === "\n") fail();
      if (expression[i] === "\\") {
        const next = expression[i + 1];
        out += next === "n" ? "\n" : next === "t" ? "\t" : next ?? "";
        i += 2;
      } else out += expression[i++];
    }
    i++;
    return out;
  };
  const value = (): unknown => {
    space();
    const char = expression[i];
    if (char === "[") {
      i++;
      const items: unknown[] = [];
      for (;;) {
        space();
        if (expression[i] === "]") break;
        items.push(value());
        space();
        if (expression[i] === ",") i++;
        else break;
      }
      take("]");
      return items;
    }
    if (char === "{") {
      i++;
      const object: Record<string, unknown> = {};
      for (;;) {
        space();
        if (expression[i] === "}") break;
        let key: string;
        if (expression[i] === '"' || expression[i] === "'") key = string();
        else {
          key = /^[A-Za-z_$][\w$]*/.exec(expression.slice(i))?.[0] ?? fail();
          i += key.length;
        }
        take(":");
        object[key] = value();
        space();
        if (expression[i] === ",") i++;
        else break;
      }
      take("}");
      return object;
    }
    if (char === '"' || char === "'") return string();
    const literal = /^(?:true|false|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![\w$])/.exec(expression.slice(i))?.[0];
    if (literal === undefined) fail();
    i += literal!.length;
    return literal === "true" ? true : literal === "false" ? false : Number(literal);
  };
  try {
    const result = value();
    space();
    return i === expression.length ? result : undefined;
  } catch (error) {
    if (error instanceof LiteralError) return undefined;
    throw error;
  }
}

/** `options` as `<VarField>` gets it (an array, or the name of a JSON file in `field-options/`) → the option list or a problem. */
export function resolveOptions(raw: unknown, files: readonly { path: string; source: string }[]): FieldOption[] | string {
  if (typeof raw !== "string") {
    const options = normalizeOptions(raw);
    return typeof options === "string" ? `"options" ${options}` : options;
  }
  const file = files.find((f) => f.path === raw);
  if (!raw.endsWith(".json")) return `options file "${raw}" must be a .json file in ${OPTIONS_DIR}/`;
  if (!file) return `options file "${raw}" not found in ${OPTIONS_DIR}/`;
  let data: unknown;
  try {
    data = JSON.parse(file.source);
  } catch (error) {
    return `options file ${OPTIONS_DIR}/${raw} is not valid JSON: ${(error as Error).message}`;
  }
  const options = normalizeOptions(data);
  return typeof options === "string" ? `options file ${OPTIONS_DIR}/${raw} ${options}` : options;
}
