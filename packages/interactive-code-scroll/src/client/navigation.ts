const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "CALCITE-INPUT"]);
const MULTILINE_TAGS = new Set(["TEXTAREA", "CALCITE-TEXT-AREA"]);
const CLICKER_KEYS = new Set(["PageDown", "PageUp"]);

/** Step delta for a key (keyboard or presentation clicker); 0 when the key is not a step key. */
export function keyToDelta(key: string): -1 | 0 | 1 {
  if (NEXT_KEYS.has(key)) return 1;
  if (PREVIOUS_KEYS.has(key)) return -1;
  return 0;
}

/** Keys typed into fields must not move steps. (Carousels do not count: SPEC keeps arrows for steps.) */
export function isEditableTag(tagName: string, isContentEditable = false): boolean {
  return isContentEditable || EDITABLE_TAGS.has(tagName.toUpperCase());
}

/** Multi-line text keeps PageUp/PageDown (they move its caret). */
export function isMultilineTag(tagName: string, isContentEditable = false): boolean {
  return isContentEditable || MULTILINE_TAGS.has(tagName.toUpperCase());
}

export interface KeyFocus {
  /** A field (see `isEditableTag`). */
  editable: boolean;
  /** Multi-line text (see `isMultilineTag`). */
  multiline: boolean;
  /** Inside a widget that uses arrow keys (`data-own-keys`: JSON tree, tabs, splitters). */
  ownsArrows: boolean;
}

/**
 * Whether `key` moves steps from the focused element. Clicker keys (PageUp/PageDown) do from
 * everywhere but multi-line text, so a presenter never has to move the focus first; arrows
 * stay with fields and with widgets that use them.
 */
export function movesStep(key: string, focus: KeyFocus): boolean {
  if (!keyToDelta(key)) return false;
  if (CLICKER_KEYS.has(key)) return !focus.multiline;
  return !focus.editable && !focus.ownsArrows;
}

export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(index, 0), count - 1);
}

/** Index of the step named by a `#step-id` hash, or 0. */
export function indexFromHash(ids: readonly string[], hash: string): number {
  const index = ids.indexOf(decodeURIComponent(hash.replace(/^#/, "")));
  return index < 0 ? 0 : index;
}

/**
 * Carousel image to select for a step key, or `undefined` when the key goes past
 * the first/last image and should move to the previous/next step instead.
 */
export function carouselTarget(selected: number, count: number, delta: -1 | 1): number | undefined {
  const next = selected + delta;
  return next >= 0 && next < count ? next : undefined;
}

export interface RevealOptions {
  /** Always center the range (docs: the trigger is the center line); otherwise move only when it is not fully visible. */
  center?: boolean;
  /** Room kept around the range, in px. */
  margin?: number;
}

/**
 * Scroll position that shows the range [top, bottom] (content coordinates) in a viewport
 * of `view` px currently at `scrollTop`: centered when it fits, else aligned to its top.
 * `undefined` when no scroll is needed. The browser clamps the result.
 */
export function revealScroll(
  top: number,
  bottom: number,
  scrollTop: number,
  view: number,
  { center = false, margin = 16 }: RevealOptions = {},
): number | undefined {
  if (!center && top >= scrollTop + margin && bottom <= scrollTop + view - margin) return undefined;
  const span = bottom - top;
  return span + 2 * margin <= view ? top - (view - span) / 2 : top - margin;
}
