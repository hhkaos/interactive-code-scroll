/** True when two URLs load the same document (they differ at most in the fragment). */
export function samePage(a: string, b: string): boolean {
  const [x, y] = [new URL(a), new URL(b)];
  x.hash = y.hash = "";
  return x.href === y.href;
}

/**
 * Clicker keys (and Esc) pressed inside a same-origin embed reach the tutorial through the
 * Preview's `ics:step-key` message, so the presenter never has to click out of it. Arrows stay
 * with the embedded page (an app or slide deck uses them). Cross-origin pages cannot be listened
 * to; the step keys work again once the focus leaves them.
 */
export function forwardStepKeys(iframe: HTMLIFrameElement): void {
  const post = (key: string) => postMessage({ type: "ics:step-key", key }, location.origin);
  iframe.addEventListener("load", () => {
    // `contentDocument` is null for a cross-origin page.
    const win = iframe.contentDocument ? iframe.contentWindow : null;
    if (!win) return;
    // Capture on the embed's window runs first: the page (e.g. Slidev, which pages on PageDown) never sees the key.
    win.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "PageDown" && event.key !== "PageUp") return;
        event.preventDefault();
        event.stopPropagation();
        post(event.key);
      },
      { capture: true },
    );
    // Esc the page did not handle itself (e.g. closing its own dialog) restores a maximized pane.
    win.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) post(event.key);
    });
  });
}

/** The floating "Open in new tab" action opens the embedded page shown (the fallback for sites that refuse framing). */
export function startEmbedOpen(): void {
  document.querySelector("#embed-open")?.addEventListener("click", () => {
    const shown = document.querySelector<HTMLIFrameElement>(".media-panel iframe.step-embed");
    if (shown) open(shown.src, "_blank", "noopener");
  });
}
