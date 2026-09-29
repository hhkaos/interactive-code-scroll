import { setAction } from "./actions.ts";
import { MAXIMIZE_EVENT, stepMaximize, toggleMaximize, type Maximized } from "./maximize-values.ts";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./preview.ts";

export { MAXIMIZE_EVENT };

/** The pane under the code that the active variant shows (Preview or Result), when it has a frame to fill. */
function lowerPane(): HTMLElement | undefined {
  const pane = document.querySelector<HTMLElement>(":is(section.preview, section.result):not([hidden])");
  return pane?.querySelector(".preview-frame, .result-frame") ? pane : undefined;
}

/**
 * Maximize a pane over the page (page level: the Fullscreen API on the pane would replace
 * presentation full screen and hide Calcite popovers). CSS pins the pane with `body[data-maximized]`;
 * nothing moves in the DOM, so the Preview iframe does not reload, the explanations stay laid out
 * for the step engine and the splitter sizes come back untouched. Not remembered.
 */
export function startMaximize(): void {
  const body = document.body;
  // Each button maximizes one pane; its own label is kept to restore it.
  const buttons = [...document.querySelectorAll<HTMLElement>("calcite-action[data-maximize]")].map((button) => ({
    button,
    pane: button.dataset.maximize as Maximized,
    label: button.getAttribute("text") ?? "Maximize",
  }));
  let state: Maximized | undefined;

  const set = (next: Maximized | undefined) => {
    const pane = next === "preview" ? lowerPane() : undefined;
    if (next === "preview" && !pane) next = undefined;
    state = next;
    if (next) body.dataset.maximized = next;
    else delete body.dataset.maximized;
    for (const { button, pane: target, label } of buttons) {
      const on = target === next;
      setAction(button, on ? "minimize" : "maximize", on ? "Restore layout" : label);
    }
    // A maximized pane shows its content: expand it when collapsed.
    if (pane?.querySelector(":is(.preview-frame, .result-frame)[hidden]")) {
      document.dispatchEvent(new CustomEvent<PreviewState>(PREVIEW_STATE_EVENT, { detail: "expanded" }));
    }
  };

  for (const { button, pane } of buttons) button.addEventListener("click", () => set(toggleMaximize(state, pane)));

  // Steps (`maximize=`) and the Preview iframe (forwarded Esc) ask through the event.
  document.addEventListener(MAXIMIZE_EVENT, (event) => set(stepMaximize(state, (event as CustomEvent<string>).detail)));

  // Collapsing the maximized pane (its header or a step's preview="collapsed") restores the layout first.
  for (const toggle of document.querySelectorAll("#preview-toggle, #result-toggle")) {
    toggle.addEventListener("click", () => {
      if (state === "preview") set(undefined);
    });
  }
  document.addEventListener(PREVIEW_STATE_EVENT, (event) => {
    if (state === "preview" && (event as CustomEvent<PreviewState>).detail === "collapsed") set(undefined);
  });

  // Esc restores the layout, one level at a time: an open dialog (image viewer) first, then the
  // pane, then presentation mode. Started before presentation.ts, which also leaves Esc to this
  // while a pane is maximized.
  // In browser full screen the browser takes the first Esc to leave it; the pane stays maximized.
  addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !state || document.querySelector("calcite-dialog[open]")) return;
      event.stopImmediatePropagation();
      set(undefined);
    },
    { capture: true },
  );
}
