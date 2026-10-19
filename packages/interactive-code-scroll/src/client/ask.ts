import type { Assistant } from "../ask.ts";
import { askPrompt, assistantUrl, authorUrl, barPosition, linkBack, longEnough, markdownUrl, type AskContext } from "./ask-values.ts";

type Linkable = HTMLElement & { href: string };

/** Where a selection was made: the explanations or one code file. */
type Area = { kind: "docs" } | { kind: "code"; pane: HTMLElement };

/** Selections in these places are not questions about the tutorial's content. */
const NOT_CONTENT = ".var-field, .step-file, .completion-actions, .completion-share, .docs-code-copy";

/** A pause after a keyboard selection before the toolbar shows. */
const KEYBOARD_DELAY = 500;

/**
 * Selection toolbar: selecting text in the explanations or the code panel offers "Ask the author"
 * (`feedbackUrl` with the selection's context) and "Ask AI" (assistant URLs with a prompt, which is
 * also copied). Links are filled when the toolbar shows, so a plain click opens them.
 */
export function startAsk({
  title,
  author,
  assistants,
  markdown,
  variant,
}: {
  title: string;
  author?: string;
  assistants: Assistant[];
  /** Path of the tutorial's Markdown for LLMs without `.md` (`<base>tutorial`); absent with `llms: false`. */
  markdown?: string;
  /** The active code variant's id, with variants. */
  variant?: () => string;
}): void {
  const bar = document.querySelector<HTMLElement>("#ask-bar");
  const status = document.querySelector<HTMLElement>("#ask-status");
  if (!bar || !status) return;
  const authorLink = bar.querySelector<Linkable>("#ask-author");
  const aiLinks = [...bar.querySelectorAll<Linkable>("[data-assistant]")];
  const menu = bar.querySelector<HTMLElement & { open: boolean }>("#ask-ai-menu");
  const body = document.body;
  let prompt = "";
  let pointerType = "mouse";
  let pointerDown = false;
  let keyboardTimer: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;

  const hide = () => {
    if (bar.hidden) return;
    bar.hidden = true;
    if (menu) menu.open = false;
  };

  const show = () => {
    const selection = getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return hide();
    if (pointerType === "touch" || body.hasAttribute("data-presenting")) return hide();
    const range = selection.getRangeAt(0);
    const area = areaOf(range);
    if (!area) return hide();
    const text = area.kind === "code" ? codeText(range) : selection.toString();
    if (!longEnough(text, area.kind === "code")) return hide();
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return hide();

    const context = contextOf(range, area, text, title);
    prompt = askPrompt(context, markdown === undefined ? undefined : markdownUrl(markdown, variant?.(), location.href));
    if (authorLink && author) authorLink.href = authorUrl(author, context);
    for (const link of aiLinks) link.href = assistantUrl(assistants[Number(link.dataset.assistant)]!.url, prompt);

    bar.hidden = false;
    const header = document.querySelector(".app-header")?.getBoundingClientRect().bottom ?? 0;
    const { top, left } = barPosition(rect, bar.getBoundingClientRect(), { width: innerWidth, height: innerHeight }, header);
    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;
  };

  // Clicks inside the toolbar must not clear the selection (which would hide it).
  bar.addEventListener("mousedown", (event) => event.preventDefault());
  addEventListener(
    "pointerdown",
    (event) => {
      if (bar.contains(event.target as Node)) return;
      pointerType = event.pointerType;
      pointerDown = true;
      hide();
    },
    { capture: true },
  );
  addEventListener("pointerup", (event) => {
    if (!pointerDown) return;
    pointerDown = false;
    pointerType = event.pointerType;
    // A double or triple click settles the selection after pointerup.
    setTimeout(show);
  });
  document.addEventListener("selectionchange", () => {
    clearTimeout(keyboardTimer);
    if (getSelection()?.isCollapsed) return hide();
    // Mouse selections show on pointerup; keyboard ones after a pause.
    if (!pointerDown) keyboardTimer = setTimeout(show, KEYBOARD_DELAY);
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Shift") return;
    if (event.key === "Escape" && !bar.hidden) {
      hide();
      event.stopPropagation();
      return;
    }
    // A keyboard selection after a mouse one: the toolbar may show again.
    pointerType = "keyboard";
  }, { capture: true });
  addEventListener("scroll", (event) => {
    if (!bar.contains(event.target as Node)) hide();
  }, { capture: true });
  addEventListener("resize", hide);

  const announce = (message: string) => {
    status.textContent = message;
    status.hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status.hidden = true), 5000);
  };
  for (const link of aiLinks) {
    link.addEventListener("click", () => {
      const prefilled = assistants[Number(link.dataset.assistant)]!.url.includes("{prompt}");
      // Prefill parameters are unofficial: the prompt is on the clipboard either way.
      navigator.clipboard.writeText(prompt).then(
        () => announce(prefilled ? "Prompt copied, in case the chat opens empty." : "Prompt copied. Paste it into the assistant."),
        () => {
          if (!prefilled) announce("Could not copy the prompt.");
        },
      );
      hide();
    });
  }
  authorLink?.addEventListener("click", hide);
}

function areaOf(range: Range): Area | undefined {
  const node = range.commonAncestorContainer;
  const element = node instanceof Element ? node : node.parentElement;
  if (!element || element.closest(NOT_CONTENT)) return undefined;
  const pane = element.closest<HTMLElement>(".code[data-file]");
  if (pane) return { kind: "code", pane };
  return element.closest("main.docs") ? { kind: "docs" } : undefined;
}

/** The selected code with secret values masked (also when revealed: the text leaves the page). */
function codeText(range: Range): string {
  const secrets = new Set([...document.querySelectorAll<HTMLElement>("[data-secret][data-var]")].map((field) => field.dataset.var));
  const fragment = range.cloneContents();
  for (const token of fragment.querySelectorAll<HTMLElement>("[data-var]")) {
    if (secrets.has(token.dataset.var)) token.textContent = "•••";
  }
  return fragment.textContent ?? "";
}

/** A step's heading text without its file chip, else its id. */
function stepLabel(step: HTMLElement): string {
  const heading = step.querySelector("h2, h3, h4")?.cloneNode(true) as HTMLElement | undefined;
  heading?.querySelector(".step-file")?.remove();
  return heading?.textContent?.trim() || step.id;
}

function contextOf(range: Range, area: Area, text: string, title: string): AskContext {
  const start = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
  // Code belongs to the active step; prose to the step it is in.
  const step =
    area.kind === "code" ? document.querySelector<HTMLElement>("section.step[data-active]") : start?.closest<HTMLElement>("section.step");
  const page = `${location.origin}${location.pathname}${location.search}`;
  const url = linkBack(page, step?.id, area.kind === "docs" ? text : undefined);
  const base = { title, url, selection: text, ...(step && { step: stepLabel(step) }) };
  if (area.kind === "docs") return base;
  const line = (node: Node) => Number((node instanceof Element ? node : node.parentElement)?.closest("[data-line]")?.getAttribute("data-line") ?? 0);
  const first = line(range.startContainer) || 1;
  // A selection ending at the start of a line (triple click) does not include that line.
  const endLine = line(range.endContainer) || first;
  const last = range.endOffset === 0 && endLine > first ? endLine - 1 : endLine;
  return { ...base, code: { file: area.pane.dataset.file!, lines: [first, last] } };
}
