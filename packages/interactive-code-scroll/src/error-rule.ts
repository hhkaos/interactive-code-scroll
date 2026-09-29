import { JsonNumber, type JsonValue } from "./client/json-tree-values.ts";

/** Path of the error rule, relative to `requests/`. */
export const ERROR_RULE_FILE = "errors.json";

export interface ErrorHelp {
  text: string;
  link: string;
}

/**
 * Declarative rule for service errors in response bodies (e.g. ArcGIS REST answers HTTP 200
 * with `{ "error": { "code": 498, "message": "…" } }`). Paths are dot paths from the body root.
 */
export interface ErrorRule {
  object: string;
  code: string;
  message: string;
  /** Code → short explanation and reference link. */
  help: Record<string, ErrorHelp>;
  /** Link shown for codes without help. */
  fallbackLink?: string;
}

/** A response body that matches the rule. */
export interface ServiceError {
  code?: string;
  message?: string;
  help?: ErrorHelp;
  /** `fallbackLink` when the code has no help. */
  link?: string;
}

const KEYS = new Set(["object", "code", "message", "help", "fallbackLink"]);
const EXAMPLE_PATHS = { object: "error", code: "error.code", message: "error.message" };
const DOT_PATH = /^[^.\s]+(?:\.[^.\s]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** 1-based line of the first `"key"` in `source` (1 when not found). */
function keyLine(source: string, key: string): number {
  const index = source.indexOf(JSON.stringify(key));
  return index === -1 ? 1 : source.slice(0, index).split("\n").length;
}

/** 1-based line of a `JSON.parse` error, from the position or line V8 reports. */
function parseErrorLine(source: string, message: string): number {
  const line = /\bline (\d+)/.exec(message);
  if (line) return Number(line[1]);
  const position = /\bposition (\d+)/.exec(message);
  return position ? source.slice(0, Number(position[1])).split("\n").length : 1;
}

/** Reads `requests/errors.json`; `errors` are positioned by line. */
export function readErrorRule(source: string): { rule?: ErrorRule; errors: { line: number; message: string }[] } {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { errors: [{ line: parseErrorLine(source, message), message: `invalid JSON: ${message}` }] };
  }
  if (!isRecord(data)) return { errors: [{ line: 1, message: "must be a JSON object" }] };

  const errors: { line: number; message: string }[] = [];
  const report = (key: string, message: string) => errors.push({ line: keyLine(source, key), message });
  for (const key of Object.keys(data)) {
    if (!KEYS.has(key)) report(key, `unknown key "${key}"; expected ${[...KEYS].join(", ")}`);
  }
  for (const key of ["object", "code", "message"] as const) {
    const value = data[key];
    if (value === undefined) errors.push({ line: 1, message: `"${key}" is required: a dot path such as "${EXAMPLE_PATHS[key]}"` });
    else if (typeof value !== "string" || !DOT_PATH.test(value)) report(key, `"${key}" must be a dot path such as "${EXAMPLE_PATHS[key]}"`);
  }
  const help: Record<string, ErrorHelp> = {};
  if (data.help !== undefined && !isRecord(data.help)) report("help", '"help" must map codes to { "text", "link" }');
  else if (data.help) {
    for (const [code, entry] of Object.entries(data.help)) {
      if (!isRecord(entry) || typeof entry.text !== "string" || entry.text.trim() === "") {
        report(code, `help "${code}" needs a non-empty "text"`);
      } else if (!isHttpUrl(entry.link)) {
        report(code, `help "${code}" needs a "link" with an http(s) URL`);
      } else help[code] = { text: entry.text, link: entry.link };
    }
  }
  if (data.fallbackLink !== undefined && !isHttpUrl(data.fallbackLink)) report("fallbackLink", '"fallbackLink" must be an http(s) URL');
  if (errors.length > 0) return { errors };
  return {
    rule: {
      object: data.object as string,
      code: data.code as string,
      message: data.message as string,
      help,
      ...(data.fallbackLink !== undefined && { fallbackLink: data.fallbackLink as string }),
    },
    errors,
  };
}

/** Value at a dot path through objects; `undefined` when a segment is missing. */
export function valueAt(value: JsonValue, path: string): JsonValue | undefined {
  let current: JsonValue | undefined = value;
  for (const segment of path.split(".")) {
    if (!isRecord(current) || current instanceof JsonNumber || !Object.hasOwn(current, segment)) return undefined;
    current = (current as Record<string, JsonValue>)[segment];
  }
  return current;
}

const scalarText = (value: JsonValue | undefined): string | undefined => {
  if (value instanceof JsonNumber) return value.source;
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  return undefined;
};

/** The service error a parsed body holds, if the rule's error object is present. */
export function matchError(rule: ErrorRule, body: JsonValue): ServiceError | undefined {
  const object = valueAt(body, rule.object);
  if (!isRecord(object) || object instanceof JsonNumber) return undefined;
  const code = scalarText(valueAt(body, rule.code));
  const message = scalarText(valueAt(body, rule.message));
  const help = code === undefined ? undefined : Object.hasOwn(rule.help, code) ? rule.help[code] : undefined;
  return {
    ...(code !== undefined && { code }),
    ...(message !== undefined && { message }),
    ...(help ? { help } : rule.fallbackLink !== undefined && { link: rule.fallbackLink }),
  };
}
