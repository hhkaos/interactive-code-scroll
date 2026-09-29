/** A JSON number kept as its source text, so big integers (e.g. object ids over 2^53) are not rounded. */
export class JsonNumber {
  constructor(readonly source: string) {}
}

export type JsonValue = string | JsonNumber | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonContainer = JsonValue[] | { [key: string]: JsonValue };

/** Containers down to this depth (the root is 0) start expanded; deeper ones start collapsed. */
export const EXPANDED_DEPTH = 2;
/** Entries shown per container before (and per) "Show more". */
export const PAGE = 100;

/**
 * Parses untrusted JSON text. Numbers keep their source text when the browser passes it to
 * the reviver (JSON.parse source text access); otherwise their shortest string form.
 */
export function parseJson(text: string): { ok: true; value: JsonValue } | { ok: false } {
  try {
    const reviver = (_key: string, value: unknown, context?: { source?: string }) =>
      typeof value === "number" ? new JsonNumber(context?.source ?? String(value)) : value;
    return { ok: true, value: JSON.parse(text, reviver as (key: string, value: unknown) => unknown) as JsonValue };
  } catch {
    return { ok: false };
  }
}

export function isContainer(value: JsonValue): value is JsonContainer {
  return typeof value === "object" && value !== null && !(value instanceof JsonNumber);
}

/** A container's entries: `[key, value]` for objects, `[undefined, value]` for arrays (items have no label). */
export function entries(value: JsonContainer): [string | undefined, JsonValue][] {
  return Array.isArray(value) ? value.map((item) => [undefined, item]) : Object.entries(value);
}

export function startsExpanded(depth: number): boolean {
  return depth <= EXPANDED_DEPTH;
}

/** What a collapsed container holds: "2 keys", "1 item". */
export function summary(value: JsonContainer): string {
  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  const noun = Array.isArray(value) ? "item" : "key";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** How many of `total` entries to show after "Show more" when `shown` are visible. */
export function nextShown(total: number, shown: number): number {
  return Math.min(total, shown + PAGE);
}

/** A scalar as JSON source: strings quoted with their escapes visible. */
export function literal(value: Exclude<JsonValue, JsonContainer>): string {
  if (value instanceof JsonNumber) return value.source;
  return JSON.stringify(value);
}

export type TreeAction = "next" | "prev" | "first" | "last" | "expand" | "collapse" | "child" | "parent" | "toggle" | "none";

/** WAI-ARIA tree pattern: what a key does on an item that may be `expandable` and `expanded`. */
export function treeKey(key: string, { expandable, expanded }: { expandable: boolean; expanded: boolean }): TreeAction {
  switch (key) {
    case "ArrowDown":
      return "next";
    case "ArrowUp":
      return "prev";
    case "Home":
      return "first";
    case "End":
      return "last";
    case "ArrowRight":
      return !expandable ? "none" : expanded ? "child" : "expand";
    case "ArrowLeft":
      return expandable && expanded ? "collapse" : "parent";
    case "Enter":
    case " ":
      return expandable ? "toggle" : "none";
    default:
      return "none";
  }
}
