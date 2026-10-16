/** Built-in AI assistants of the selection toolbar: URL prefill with `{prompt}` (unofficial parameters). */
export const BUILT_IN_ASSISTANTS = {
  chatgpt: { label: "ChatGPT", url: "https://chatgpt.com/?q={prompt}" },
  claude: { label: "Claude", url: "https://claude.ai/new?q={prompt}" },
} as const;

type BuiltIn = keyof typeof BUILT_IN_ASSISTANTS;

/** An `ask` entry: the author (`feedbackUrl`), a built-in assistant, or a custom `{ label, url }` one. */
export type AskEntry = "author" | BuiltIn | { label: string; url: string };

/** An AI destination as the browser gets it; without `{prompt}` in `url`, the page opens as is. */
export interface Assistant {
  label: string;
  url: string;
}

/** What the selection toolbar offers: the author link template (`{context}`, `{selection}`, `{url}` left in) and the assistants. */
export interface AskConfig {
  author?: string;
  assistants: Assistant[];
}

export const DEFAULT_ASK: readonly AskEntry[] = ["author", "chatgpt", "claude"];

/** `feedbackUrl` placeholders filled from a selection; the closing panel's link fills them empty. */
export const SELECTION_PLACEHOLDERS = ["{context}", "{selection}", "{url}"] as const;

const SHAPE = '"ask" must be false or a list of author, chatgpt, claude and { label, url } entries, e.g. [author, chatgpt]';

/** Validates frontmatter `ask`; returns the message of the first problem, if any (frontmatter.ts wraps it). */
export function askProblem(value: unknown): string | undefined {
  if (value === undefined || value === false) return undefined;
  if (!Array.isArray(value)) return SHAPE;
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string") {
      if (entry !== "author" && !(entry in BUILT_IN_ASSISTANTS)) return `"ask" entry "${entry}" is unknown (use author, chatgpt, claude or { label, url })`;
      if (seen.has(entry)) return `"ask" lists "${entry}" twice`;
      seen.add(entry);
      continue;
    }
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return SHAPE;
    const { label, url, ...rest } = entry as Record<string, unknown>;
    const extra = Object.keys(rest)[0];
    if (extra !== undefined) return `"ask" entry has an unknown field "${extra}" (use label, url)`;
    if (typeof label !== "string" || label.trim() === "") return '"ask" custom entries need a non-empty "label"';
    if (typeof url !== "string" || !/^https:\/\/\S+$/i.test(url)) {
      return `"ask" entry "${label}": "url" must be an https:// URL, with {prompt} where the assistant takes the question (e.g. https://example.com/chat?q={prompt})`;
    }
  }
  return undefined;
}

/**
 * The toolbar's actions for a tutorial: its `ask` (else the series', else the default) with `feedbackUrl`
 * (`{slug}`/`{title}` already filled). The default skips `author` without a feedback URL; an explicit one throws.
 */
export function resolveAsk(ask: readonly AskEntry[] | false | undefined, feedback: string | undefined): AskConfig {
  if (ask === false) return { assistants: [] };
  const entries = ask ?? DEFAULT_ASK;
  if (ask !== undefined && entries.includes("author") && feedback === undefined) {
    throw new Error('"ask" lists author, but the tutorial has no feedbackUrl (set one, or drop author)');
  }
  const assistants = entries.flatMap((entry): Assistant[] => {
    if (entry === "author") return [];
    return [typeof entry === "string" ? { ...BUILT_IN_ASSISTANTS[entry] } : { label: entry.label.trim(), url: entry.url }];
  });
  return { ...(entries.includes("author") && feedback !== undefined && { author: feedback }), assistants };
}

/** The closing panel's feedback link: the selection placeholders filled empty. */
export function withoutSelection(feedback: string): string {
  return SELECTION_PLACEHOLDERS.reduce((url, placeholder) => url.replaceAll(placeholder, ""), feedback);
}
