import { entries, isContainer, literal, type JsonContainer, type JsonValue } from "./json-tree-values.ts";

/** Compact DevTools-style preview, bounded independently of the expanded tree. */
export function consoleSummary(value: JsonContainer): string {
  const array = Array.isArray(value);
  const preview = (child: JsonValue) => isContainer(child) ? (Array.isArray(child) ? "[…]" : "{…}") : literal(child);
  const all = entries(value);
  const parts = all.slice(0, 3).map(([key, child]) => `${key === undefined ? "" : `${key}: `}${preview(child)}`);
  if (all.length > 3) parts.push("…");
  const text = `${array ? "[" : "{"}${parts.join(", ")}${array ? "]" : "}"}`;
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}
