/** A maximized pane: the code area (code or images) or the pane under it (web Preview or Result pane). */
export type Maximized = "code" | "preview";

/** Fired on `document` to maximize a pane or restore the layout (`none`). */
export const MAXIMIZE_EVENT = "ics:maximize";

/** A step's `maximize`: a pane, or `none` to restore; omitted (or unknown) keeps the current state. */
export function stepMaximize(current: Maximized | undefined, attr: string | undefined): Maximized | undefined {
  if (attr === "code" || attr === "preview") return attr;
  if (attr === "none") return undefined;
  return current;
}

/** A pane's icon maximizes it, or restores the layout when that pane is the maximized one. One pane at a time. */
export function toggleMaximize(current: Maximized | undefined, pane: Maximized): Maximized | undefined {
  return current === pane ? undefined : pane;
}
