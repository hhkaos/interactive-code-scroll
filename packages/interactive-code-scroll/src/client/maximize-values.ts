/** A maximized pane: the code area (code or images) or the pane under it (web Preview or Result pane). */
export type Maximized = "code" | "preview";

/** Fired on `document` to maximize a pane or restore the layout (`none`). */
export const MAXIMIZE_EVENT = "ics:maximize";

/** A step's `maximize`: a pane, or `none` to restore; omitted (or unknown) keeps the current state. */
export function stepMaximize(current: Maximized | undefined, attr: string | undefined): Maximized | undefined {
  if (attr === "code") return "code";
  if (attr === "panel") return "preview";
  if (attr === "none") return undefined;
  return current;
}

/** A pane's icon maximizes it, or restores the layout when that pane is the maximized one. One pane at a time. */
export function toggleMaximize(current: Maximized | undefined, pane: Maximized): Maximized | undefined {
  return current === pane ? undefined : pane;
}

/**
 * Phones, portrait or landscape (landscape phones are at most ~932px wide and touch-driven; a desktop
 * window at 200 % zoom is as short, but keeps its panes): the Preview / Result pane shows only its header
 * and opens maximized. Keep in sync with the media queries in styles/tutorial.css.
 */
export const COMPACT_PANES_QUERY = "(max-width: 40rem), (max-height: 30rem) and (max-width: 60rem) and (pointer: coarse)";
