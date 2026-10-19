/** Longest selection carried into a link or a prompt (URLs have length limits). */
export const MAX_SELECTION = 500;

/** A selection with where it was made. */
export interface AskContext {
  title: string;
  /** Link back to the selection (`linkBack()`). */
  url: string;
  /** The step's heading (or id); absent outside steps. */
  step?: string;
  selection: string;
  /** Code panel selections: the file and its first and last line. */
  code?: { file: string; lines: [number, number] };
}

/** Explanations: two words or more (a double-clicked word is usually not a question). Code: three characters or more. */
export function longEnough(text: string, inCode: boolean): boolean {
  if (inCode) return text.replace(/\s/g, "").length >= 3;
  return text.trim().split(/\s+/).length >= 2;
}

export function truncate(text: string, max = MAX_SELECTION): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max).trimEnd()}…`;
}

/** Text directive values escape `-`, `,` and `&` too (encodeURIComponent leaves `-`). */
const encodeDirective = (text: string) => encodeURIComponent(text).replace(/-/g, "%2D");

/**
 * The page with the step hash and, for explanations, a text fragment (`:~:text=`) that highlights the selection:
 * the whole text when short, else its first and last words (`start,end`). The browser strips the directive from
 * `location.hash`, so the step engine still sees `#step-id`.
 */
export function linkBack(page: string, stepId: string | undefined, selection?: string): string {
  const hash = stepId ? `#${stepId}` : "";
  const words = selection?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return `${page}${hash}`;
  const directive =
    words.join(" ").length <= 80 ? encodeDirective(words.join(" ")) : `${encodeDirective(words.slice(0, 4).join(" "))},${encodeDirective(words.slice(-4).join(" "))}`;
  return `${page}${hash || "#"}:~:text=${directive}`;
}

/** The selection as Markdown: a code block for code (a longer fence when the code holds one), else a quote. */
function selectionBlock({ selection, code }: AskContext): string {
  const text = truncate(selection);
  if (!code) return text.split("\n").map((line) => `> ${line}`.trimEnd()).join("\n");
  const fence = text.includes("```") ? "~~~~" : "```";
  return `${fence}\n${text}\n${fence}`;
}

/** Markdown context for an issue or a prompt: link, step, file and lines, then the selection. */
export function contextMarkdown(context: AskContext): string {
  const { title, url, step, code } = context;
  const lines = [`Tutorial: [${title}](${url})`];
  if (step) lines.push(`Step: ${step}`);
  if (code) {
    const [first, last] = code.lines;
    lines.push(`File: ${code.file}, ${first === last ? `line ${first}` : `lines ${first}-${last}`}`);
  }
  return `${lines.join("\n")}\n\n${selectionBlock(context)}`;
}

/**
 * Self-contained (ChatGPT sends a prefilled prompt at once): it asks for something without a follow-up.
 * `markdown` is the tutorial's Markdown for LLMs (absolute URL), so an assistant that can read it sees the whole tutorial.
 */
export function askPrompt(context: AskContext, markdown?: string): string {
  const whole = markdown === undefined ? "" : `\n\nThe whole tutorial, with its code, is at ${markdown} (Markdown).`;
  return `I'm following this tutorial and selected a part of it.\n\n${contextMarkdown(context)}${whole}\n\nExplain it in the context of the tutorial. If it looks wrong, say so.`;
}

/** Absolute URL of the tutorial's Markdown: `<name>.md`, or `<name>.<variant>.md` for the active code variant. */
export function markdownUrl(name: string, variant: string | undefined, page: string): string {
  return new URL(`${name}${variant === undefined ? "" : `.${variant}`}.md`, page).href;
}

/** `feedbackUrl` (slug and title already filled) with `{context}`, `{selection}` and `{url}`, URL-encoded. */
export function authorUrl(template: string, context: AskContext): string {
  return template
    .replaceAll("{context}", encodeURIComponent(contextMarkdown(context)))
    .replaceAll("{selection}", encodeURIComponent(truncate(context.selection)))
    .replaceAll("{url}", encodeURIComponent(context.url));
}

/** An assistant's URL with `{prompt}` (URL-encoded); without it, the URL as is. */
export function assistantUrl(template: string, prompt: string): string {
  return template.replaceAll("{prompt}", encodeURIComponent(prompt));
}

/**
 * Where the toolbar goes: centered above the selection, below it when there is no room under `minTop`
 * (the page header), kept `margin` inside the viewport.
 */
export function barPosition(
  selection: { top: number; bottom: number; left: number; width: number },
  bar: { width: number; height: number },
  viewport: { width: number; height: number },
  minTop: number,
  margin = 8,
): { top: number; left: number } {
  const above = selection.top - bar.height - margin;
  const top = above >= minTop + margin ? above : Math.min(selection.bottom + margin, viewport.height - bar.height - margin);
  const centered = selection.left + selection.width / 2 - bar.width / 2;
  const left = Math.max(margin, Math.min(centered, viewport.width - bar.width - margin));
  return { top, left };
}
