import { setAction } from "./actions.ts";

/** Fired on `document` when the explanations panel is shown or hidden. */
export const DOCS_TOGGLE_EVENT = "ics:docs-toggle";

const setIcon = (selector: string, icon: string, text: string) => setAction(document.querySelector(selector), icon, text);

/**
 * Presentation mode: browser full screen (hides its navigation bar) plus a compact
 * toolbar; and a toggle that hides the explanations so code gets the full width.
 */
export function startPresentation(): void {
  const body = document.body;

  const setPresenting = (on: boolean) => {
    body.toggleAttribute("data-presenting", on);
    setIcon("#present-toggle", on ? "presentation-x" : "presentation", on ? "Exit presentation" : "Present");
  };

  document.querySelector("#present-toggle")?.addEventListener("click", async () => {
    const on = !body.hasAttribute("data-presenting");
    setPresenting(on);
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Full screen can be refused (policy, embedded page): presentation mode still applies.
    }
  });

  // Esc leaves browser full screen; leave presentation mode with it.
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) setPresenting(false);
  });
  // Where Esc reaches the page instead (full screen refused, some embeddings), handle it too.
  addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !body.hasAttribute("data-presenting")) return;
    setPresenting(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  });

  document.querySelector("#docs-toggle")?.addEventListener("click", () => {
    const hidden = !body.hasAttribute("data-docs-hidden");
    body.toggleAttribute("data-docs-hidden", hidden);
    setIcon("#docs-toggle", hidden ? "chevrons-right" : "chevrons-left", hidden ? "Show explanations" : "Hide explanations");
    document.dispatchEvent(new CustomEvent(DOCS_TOGGLE_EVENT, { detail: { hidden } }));
  });
}
