import { setAction } from "./actions.ts";
import { isEditableTag, isMultilineTag, isPresentChord, presentationShortcut, shortcutHints, type PresentationShortcut } from "./navigation.ts";

/** Fired on `document` when the explanations panel is shown or hidden. */
export const DOCS_TOGGLE_EVENT = "ics:docs-toggle";

const setIcon = (selector: string, icon: string, text: string) => setAction(document.querySelector(selector), icon, text);

/** Whether a key press comes from a field (the innermost element: a Calcite field's own <input> or <textarea>). */
function inField(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0];
  return target instanceof HTMLElement && (isEditableTag(target.tagName, target.isContentEditable) || isMultilineTag(target.tagName));
}

/** The presentation-mode shortcut a key press triggers (none in fields, with an open dialog or on auto-repeat). */
export function shortcutFor(event: KeyboardEvent): PresentationShortcut | undefined {
  if (event.repeat || document.querySelector("calcite-dialog[open]")) return undefined;
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
    body.toggleAttribute("data-presenting", on);
    setIcon("#present-toggle", on ? "presentation-x" : "presentation", on ? "Exit presentation" : "Present");
    // The large step index belongs to presentation mode (the browser may take the Esc that leaves it).
    if (!on) document.querySelector<HTMLElement>("#step-index:popover-open")?.hidePopover();
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
      if (document.querySelector("calcite-dialog[open], #step-index:popover-open") || body.hasAttribute("data-maximized")) return;
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
    document.dispatchEvent(new CustomEvent(DOCS_TOGGLE_EVENT, { detail: { hidden } }));
  };
  docsToggle?.addEventListener("click", toggleDocs);
  // `E` shows/hides the explanations while presenting (client/step-index.ts handles `O`). Not `docsToggle.click()`:
  // Calcite's tooltip manager takes that click for a pointer click and leaves the action's tooltip open.
  addEventListener("keydown", (event) => {
    if (shortcutFor(event) !== "explanations" || !docsToggle) return;
    event.preventDefault();
    toggleDocs();
  });
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Alt is down and nothing else happened since: its release shows the hint. */
  let lone = false;

  const hide = () => {
    clearTimeout(timer);
    hint.hidden = true;
  };
  const show = () => {
    hint.replaceChildren(
      ...shortcutHints(document.body.hasAttribute("data-presenting"), mac).map(({ keys, label }) => {
        const item = document.createElement("span");
        item.className = "shortcut-hint-item";
        for (const key of keys) {
          const kbd = document.createElement("kbd");
          kbd.textContent = key;
          item.append(kbd);
        }
        item.append(` ${label}`);
        return item;
      }),
    );
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
    addEventListener(type, () => {
      lone = false;
      hide();
    });
  }
}
