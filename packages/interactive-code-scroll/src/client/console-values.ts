import { entries, isContainer, JsonNumber, literal, type JsonContainer, type JsonValue } from "./json-tree-values.ts";

export interface ConsoleToken {
  kind: "jt-p" | "jt-key" | "jt-str" | "jt-num" | "jt-lit";
  text: string;
}

/** Compact property previews keep their scalar colors without parsing generated HTML. */
export function consoleSummaryTokens(value: JsonContainer): ConsoleToken[] {
  const array = Array.isArray(value);
  const tokens: ConsoleToken[] = [{ kind: "jt-p", text: array ? "[" : "{" }];
  const all = entries(value);
  for (const [index, [key, child]] of all.slice(0, 3).entries()) {
    if (index) tokens.push({ kind: "jt-p", text: ", " });
    if (key !== undefined) tokens.push({ kind: "jt-key", text: key }, { kind: "jt-p", text: ": " });
    if (isContainer(child)) tokens.push({ kind: "jt-p", text: Array.isArray(child) ? "[…]" : "{…}" });
    else tokens.push({ kind: typeof child === "string" ? "jt-str" : child instanceof JsonNumber ? "jt-num" : "jt-lit", text: literal(child) });
  }
  if (all.length > 3) tokens.push({ kind: "jt-p", text: ", …" });
  tokens.push({ kind: "jt-p", text: array ? "]" : "}" });
  let remaining = 177;
  const clipped: ConsoleToken[] = [];
  for (const token of tokens) {
    if (token.text.length > remaining) {
      clipped.push({ ...token, text: `${token.text.slice(0, remaining)}…` });
      return clipped;
    }
    clipped.push(token);
    remaining -= token.text.length;
  }
  return tokens;
}

export const consoleSummary = (value: JsonContainer): string => consoleSummaryTokens(value).map((token) => token.text).join("");
