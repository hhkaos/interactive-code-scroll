import { setAction } from "./actions.ts";
import { isEditableTag, isMultilineTag, isPresentChord, presentationShortcut, shortcutHints, type PresentationShortcut } from "./navigation.ts";
import { lowerPane } from "./maximize.ts";
import { MAXIMIZE_EVENT } from "./maximize-values.ts";
import { PANEL_PRESET_EVENT } from "./layout-values.ts";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./preview.ts";

/** Fired on `document` when the explanations panel is shown or hidden. */
export const DOCS_TOGGLE_EVENT = "ics:docs-toggle";

/** Fired on document when entering or leaving presentation mode. */
export const PRESENTATION_EVENT = "ics:presentation";

const setIcon = (selector: string, icon: string, text: string) => setAction(document.querySelector(selector), icon, text);

/** Whether a key press comes from a field (the innermost element: a Calcite field's own <input> or <textarea>). */
function inField(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0];
  return target instanceof HTMLElement && (isEditableTag(target.tagName, target.isContentEditable) || isMultilineTag(target.tagName));
}

/** The presentation-mode shortcut a key press triggers (none in fields, with an open dialog or on auto-repeat). */
export function shortcutFor(event: KeyboardEvent): PresentationShortcut | undefined {
  if (event.defaultPrevented || event.isComposing || event.repeat || document.querySelector("calcite-dialog[open], #shortcut-help:popover-open")) return undefined;
  return presentationShortcut(event.key, {
    presenting: document.body.hasAttribute("data-presenting"),
    editable: inField(event),
    modifier: event.ctrlKey || event.altKey || event.metaKey,
  });
}

/** Keyboard Lock (Chromium only): not in the DOM typings yet. */
type KeyboardLock = { lock(keys?: string[]): Promise<void>; unlock(): void };
const keyboardLock = () => (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;

/**
 * Presentation mode: browser full screen (hides its navigation bar) plus a compact
 * toolbar; and a toggle that hides the explanations so code gets the full width.
 */
export function startPresentation(): void {
  const body = document.body;

  const setPresenting = (on: boolean) => {
    const changed = body.hasAttribute("data-presenting") !== on;
    body.toggleAttribute("data-presenting", on);
    document.querySelector<HTMLElement>("#shortcut-help:popover-open")?.hidePopover();
    if (!on) body.removeAttribute("data-highlight-hidden");
    setIcon("#present-toggle", on ? "presentation-x" : "presentation", on ? "Exit presentation" : "Present");
    // The large step index belongs to presentation mode (the browser may take the Esc that leaves it).
    if (!on) document.querySelector<HTMLElement>("#step-index:popover-open")?.hidePopover();
    if (changed) document.dispatchEvent(new CustomEvent(PRESENTATION_EVENT));
  };

  // Shared by the toolbar action and Alt+P (not `click()`: it would leave the action's tooltip open).
  const togglePresentation = async () => {
    const on = !body.hasAttribute("data-presenting");
    setPresenting(on);
    try {
      if (on && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        // A short Esc then reaches the page, so it goes one level at a time in full screen too
        // (dialog, step index, maximized pane, presentation mode); holding Esc still leaves full screen.
        // Elsewhere (Firefox, Safari) the browser keeps taking the first Esc.
        await keyboardLock()?.lock(["Escape"]);
      }
      if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Full screen or the Esc lock can be refused (policy, embedded page): presentation mode still applies.
    }
  };
  document.querySelector("#present-toggle")?.addEventListener("click", () => void togglePresentation());
  // Alt+P (Option+P): a key press is a user gesture, so full screen is allowed.
  addEventListener("keydown", (event) => {
    if (event.repeat || !isPresentChord(event, inField(event))) return;
    event.preventDefault();
    void togglePresentation();
  });
  startShortcutHint();

  // Leaving browser full screen (the browser's Esc, a held Esc under Keyboard Lock) leaves presentation mode.
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) return;
    keyboardLock()?.unlock();
    setPresenting(false);
  });
  // Where Esc reaches the page (Keyboard Lock in full screen, full screen refused, some embeddings), handle it too.
  // Capture phase: an open dialog (image viewer) takes that Esc before it closes.
  addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !body.hasAttribute("data-presenting")) return;
      // An open dialog or the step index, then a maximized pane (maximize.ts), take Esc first.
      if (document.querySelector("calcite-dialog[open], #step-index:popover-open, #shortcut-help:popover-open, .speech-settings[open]") || body.hasAttribute("data-maximized")) return;
      setPresenting(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
    { capture: true },
  );

  const docsToggle = document.querySelector<HTMLElement>("#docs-toggle");
  const toggleDocs = () => {
    const hidden = !body.hasAttribute("data-docs-hidden");
    body.toggleAttribute("data-docs-hidden", hidden);
    setIcon("#docs-toggle", hidden ? "chevrons-right" : "chevrons-left", hidden ? "Show explanations" : "Hide explanations");
    // The rail is as narrow as the icon: no padding around it.
    docsToggle?.toggleAttribute("compact", hidden);
    document.dispatchEvent(new CustomEvent(DOCS_TOGGLE_EVENT, { detail: { hidden } }));
  };
  docsToggle?.addEventListener("click", toggleDocs);
  // A pointer click leaves no focus behind: no focus ring, and the handle can fade out with the pointer
  // (`:focus-within` keeps it shown). Keyboard activation keeps the focus on it.
  let pointerClick = false;
  docsToggle?.addEventListener("pointerdown", () => (pointerClick = true));
  docsToggle?.addEventListener("keydown", () => (pointerClick = false));
  docsToggle?.addEventListener("click", () => {
    if (pointerClick) (document.activeElement as HTMLElement | null)?.blur();
    pointerClick = false;
  });
  // `E` shows/hides the explanations while presenting (client/step-index.ts handles `O`). Not `docsToggle.click()`:
  // Calcite's tooltip manager takes that click for a pointer click and leaves the action's tooltip open.
  addEventListener("keydown", (event) => {
    const shortcut = shortcutFor(event);
    if (!shortcut || shortcut === "index") return;
    if (shortcut === "explanations") {
      if (!docsToggle) return;
      event.preventDefault();
      toggleDocs();
      return;
    }
    if (shortcut === "highlight") {
      if (!document.querySelector('.code-panel:not([hidden]):not([data-outline]) .code:not([hidden])[data-has-focus]')) return;
      event.preventDefault();
      body.toggleAttribute("data-highlight-hidden");
      return;
    }
    const pane = lowerPane();
    if (shortcut !== "maximizeCode" && !pane) return;
    event.preventDefault();
    const maximize = (value: string) => document.dispatchEvent(new CustomEvent(MAXIMIZE_EVENT, { detail: value }));
    if (shortcut === "maximizePanel" || shortcut === "maximizeCode") {
      const target = shortcut === "maximizeCode" ? "code" : "preview";
      maximize(body.dataset.maximized === target ? "none" : target === "preview" ? "panel" : "code");
      return;
    }
    maximize("none");
    const collapsed = pane!.querySelector<HTMLElement>(".preview-frame, .result-frame")!.hidden;
    const state: PreviewState = shortcut === "collapse" && !collapsed ? "collapsed" : "expanded";
    document.dispatchEvent(new CustomEvent<PreviewState>(PREVIEW_STATE_EVENT, { detail: state }));
    const size = { size35: 35, size50: 50, size75: 75 }[shortcut as "size35" | "size50" | "size75"];
    if (size) document.dispatchEvent(new CustomEvent<number>(PANEL_PRESET_EVENT, { detail: size }));
  });
  document.addEventListener("ics:step", () => body.removeAttribute("data-highlight-hidden"));
}

/** How long the shortcut hint stays up (ms) unless another key or a click dismisses it first. */
const HINT_MS = 6000;

/**
 * Pressing and releasing Alt (Option) on its own, outside fields, shows a floating hint with the keys of the
 * current mode, for presenters who forget them. Any other key, a click, or Alt again dismisses it.
 */
function startShortcutHint(): void {
  const hint = document.querySelector<HTMLElement>("#shortcut-hint");
  if (!hint) return;
  const platform = (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ?? navigator.platform;
  const mac = /mac|iphone|ipad/i.test(platform);
  const help = document.querySelector<HTMLElement>("#shortcut-help");
  const helpButton = document.querySelector<HTMLElement>("#shortcut-help-toggle");
  const helpContent = help?.querySelector<HTMLElement>(".shortcut-help-content");
  const itemFor = ({ keys, label }: ReturnType<typeof shortcutHints>[number]) => {
    const item = document.createElement("span");
    item.className = "shortcut-hint-item";
    for (const key of keys) {
      const kbd = document.createElement("kbd");
      kbd.textContent = key;
      item.append(kbd);
    }
    item.append(` ${label}`);
    return item;
  };
  const hints = () => shortcutHints(document.body.hasAttribute("data-presenting"), mac);
  const renderHelp = () => {
    if (!helpContent) return;
    helpContent.replaceChildren();
    for (const group of ["Navigation", "Panels", "Audio"]) {
      const entries = hints().filter((item) => item.group === group);
      if (!entries.length) continue;
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.textContent = group;
      section.append(heading, ...entries.map(itemFor));
      helpContent.append(section);
    }
  };
  helpButton?.addEventListener("click", () => { renderHelp(); help?.togglePopover(); });
  document.querySelector("#shortcut-help-close")?.addEventListener("click", () => help?.hidePopover());
  help?.addEventListener("toggle", (event) => helpButton?.setAttribute("aria-expanded", String((event as ToggleEvent).newState === "open")));
  addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !help?.matches(":popover-open") || document.querySelector("calcite-dialog[open]")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    help.hidePopover();
    helpButton?.focus({ preventScroll: true });
  }, { capture: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Alt is down and nothing else happened since: its release shows the hint. */
  let lone = false;

  const hide = () => {
    clearTimeout(timer);
    hint.hidden = true;
  };
  const show = () => {
    if (help?.matches(":popover-open")) return;
    const more = document.createElement("button");
    more.type = "button";
    more.textContent = "All shortcuts";
    more.addEventListener("click", () => { hide(); renderHelp(); help?.showPopover(); });
    const groups = ["Navigation", "Panels", "Audio"].flatMap((group) => {
      const entries = hints().filter((item) => item.group === group);
      if (!entries.length) return [];
      const section = document.createElement("div");
      section.className = "shortcut-hint-group";
      const heading = document.createElement("strong");
      heading.textContent = group;
      section.append(heading, ...entries.map(itemFor));
      return [section];
    });
    hint.replaceChildren(...groups, more);
    hint.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(hide, HINT_MS);
  };

  addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Alt") {
        lone = !event.repeat && !event.ctrlKey && !event.metaKey && !event.shiftKey && !inField(event);
        return;
      }
      lone = false;
      // Esc and Alt+P take effect as usual; the hint just goes away.
      hide();
    },
    { capture: true },
  );
  addEventListener("keyup", (event) => {
    if (event.key !== "Alt" || !lone) return;
    lone = false;
    // A lone Alt focuses the menu bar in some Windows browsers.
    event.preventDefault();
    if (hint.hidden) show();
    else hide();
  });
  for (const type of ["pointerdown", "blur"]) {
    addEventListener(type, (event) => {
      if (type === "pointerdown" && event.target instanceof Node && hint.contains(event.target)) return;
      lone = false;
      hide();
    });
  }
}
