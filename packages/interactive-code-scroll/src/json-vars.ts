/**
 * JSON has no comments for `@var`, so `<VarField json="config.json#/a/b">` names the value by
 * JSON Pointer (RFC 6901). The MDX validation collects those targets and hands them to every
 * place that parses `code/` (see {@link JSON_VARS_KEY}).
 */

/** A `json=` target of one `<VarField>`: which var a value of `code/<file>` is. */
export interface JsonVar {
  name: string;
  pointer: string;
}

/** `code/` path → JSON vars, as the MDX validation stores them in the tutorial's frontmatter. */
export type JsonVars = Readonly<Record<string, readonly JsonVar[]>>;

/** Frontmatter key the MDX validation fills with the tutorial's {@link JsonVars}. */
export const JSON_VARS_KEY = "interactiveCodeScrollJsonVars";

export function jsonVarsOf(frontmatter: Readonly<Record<string, unknown>>): JsonVars {
  return (frontmatter[JSON_VARS_KEY] as JsonVars | undefined) ?? {};
}

/**
 * `<Step file="package.json" region="/dependencies">`: a `region` starting with `/` is a JSON Pointer
 * into the step's `.json` file (marker region ids never start with `/`).
 */
export function isJsonRegion(region: string): boolean {
  return region.startsWith("/");
}

/** The id a pointer region gets in `data-regions` (a space-separated list): whitespace and `%` are percent-encoded. */
export function jsonRegionId(pointer: string): string {
  return pointer.replace(/[%\s]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

/** `code/` path → pointers that steps highlight, as the MDX validation stores them in the tutorial's frontmatter. */
export type JsonRegions = Readonly<Record<string, readonly string[]>>;

/** Frontmatter key the MDX validation fills with the tutorial's {@link JsonRegions}. */
export const JSON_REGIONS_KEY = "interactiveCodeScrollJsonRegions";

export function jsonRegionsOf(frontmatter: Readonly<Record<string, unknown>>): JsonRegions {
  return (frontmatter[JSON_REGIONS_KEY] as JsonRegions | undefined) ?? {};
}

/** Splits `config.json#/a/b` into the file (relative to `code/`) and the pointer. */
export function parseJsonTarget(target: string): { file: string; pointer: string } | string {
  const hash = target.indexOf("#");
  if (hash <= 0) return `"${target}" must be <file>#<pointer>, e.g. config.json#/expiration`;
  const file = target.slice(0, hash);
  const pointer = target.slice(hash + 1);
  if (!file.endsWith(".json")) return `"${file}" is not a .json file`;
  if (pointer !== "" && !pointer.startsWith("/")) return `pointer "${pointer}" must start with "/"`;
  return { file, pointer };
}

/** Where a JSON value is: 0-based offsets of the value (string quotes excluded) and its kind. */
export interface JsonValueSpan {
  kind: "string" | "number" | "boolean" | "null" | "array" | "object";
  start: number;
  end: number;
}

/** `keyStart`: offset of the member's key when the value is in an object. */
type Node = { start: number; end: number; keyStart?: number } & (
  | { kind: "object"; entries: Map<string, Node> }
  | { kind: "array"; items: Node[] }
  | { kind: "string" | "number" | "boolean" | "null" }
);

class JsonSyntaxError extends Error {}

/** Finds the value at `pointer`, or why it cannot. */
export function locateJsonValue(source: string, pointer: string): JsonValueSpan | string {
  const node = findNode(source, pointer);
  if (typeof node === "string") return node;
  return node.kind === "string" ? { kind: "string", start: node.start + 1, end: node.end - 1 } : { kind: node.kind, start: node.start, end: node.end };
}

/** Where the member at `pointer` is: from its key (the value, for an array item) to the end of its value. */
export function locateJsonMember(source: string, pointer: string): { start: number; end: number } | string {
  const node = findNode(source, pointer);
  return typeof node === "string" ? node : { start: node.keyStart ?? node.start, end: node.end };
}

function findNode(source: string, pointer: string): Node | string {
  let root: Node;
  try {
    root = parseJson(source);
  } catch (error) {
    if (error instanceof JsonSyntaxError) return `invalid JSON: ${error.message}`;
    throw error;
  }
  let node = root;
  const tokens = pointer === "" ? [] : pointer.slice(1).split("/").map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
  for (const token of tokens) {
    const next =
      node.kind === "object" ? node.entries.get(token) : node.kind === "array" && /^(?:0|[1-9]\d*)$/.test(token) ? node.items[Number(token)] : undefined;
    if (!next) return `pointer "${pointer}" not found`;
    node = next;
  }
  return node;
}

/** Minimal JSON parser that keeps the offsets of every value. */
function parseJson(source: string): Node {
  let i = 0;
  const fail = (message: string): never => {
    const line = source.slice(0, i).split("\n").length;
    throw new JsonSyntaxError(`${message} at line ${line}`);
  };
  const space = () => {
    while (i < source.length && " \t\r\n".includes(source[i]!)) i++;
  };
  const unexpected = (message: string): never =>
    fail(source.startsWith("//", i) || source.startsWith("/*", i) ? "comments are not allowed (use <VarField json> instead of @var)" : message);
  const expect = (char: string) => {
    if (source[i] !== char) unexpected(`expected "${char}"`);
    i++;
  };
  const string = (): Node => {
    const start = i;
    expect('"');
    while (i < source.length && source[i] !== '"') {
      if (source[i] === "\n") fail("unterminated string");
      i += source[i] === "\\" ? 2 : 1;
    }
    expect('"');
    return { kind: "string", start, end: i };
  };
  const value = (): Node => {
    space();
    const start = i;
    const char = source[i];
    if (char === "{") {
      i++;
      const entries = new Map<string, Node>();
      space();
      if (source[i] === "}") return i++, { kind: "object", start, end: i, entries };
      for (;;) {
        space();
        const key = string();
        const name = JSON.parse(source.slice(key.start, key.end)) as string;
        space();
        expect(":");
        entries.set(name, { ...value(), keyStart: key.start });
        space();
        if (source[i] === ",") i++;
        else break;
      }
      expect("}");
      return { kind: "object", start, end: i, entries };
    }
    if (char === "[") {
      i++;
      const items: Node[] = [];
      space();
      if (source[i] === "]") return i++, { kind: "array", start, end: i, items };
      for (;;) {
        items.push(value());
        space();
        if (source[i] === ",") i++;
        else break;
      }
      expect("]");
      return { kind: "array", start, end: i, items };
    }
    if (char === '"') return string();
    const literal = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(i, i + 64))?.[0];
    if (!literal) unexpected("unexpected token");
    i += literal!.length;
    const kind = literal === "null" ? "null" : literal === "true" || literal === "false" ? "boolean" : "number";
    return { kind, start, end: i };
  };
  const root = value();
  space();
  if (i < source.length) fail("unexpected content after the value");
  return root;
}
