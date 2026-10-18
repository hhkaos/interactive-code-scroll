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

export interface StepButtonsInput {
  /** Active step index; -1 at the intro (or before any step is active). */
  current: number;
  /** Steps the reader can reach. */
  count: number;
  hasIntro: boolean;
  /** Selected image of the carousel the step keys page through (0 without one). */
  image: number;
  /** Images in that carousel (0 without one). */
  images: number;
  /** The page has a closing panel after the last step. */
  completion?: boolean;
  /** The closing panel is shown (after "Finish"). */
  completed?: boolean;
}

export interface StepButtonsState {
  back: boolean;
  next: boolean;
  /** "Next" reads "Finish": its next move opens the closing panel (or it did). */
  finish: boolean;
  /** "3 / 9", "9 steps" at the intro, "Done" on the closing panel. */
  position: string;
}

/** Back / Next enabled states: they move like the step keys (see `carouselTarget` and the step engine). */
export function stepButtons({ current, count, hasIntro, image, images, completion = false, completed = false }: StepButtonsInput): StepButtonsState {
  if (completion && completed) return { back: true, next: false, finish: true, position: "Done" };
  const back = image > 0 || current > 0 || (current === 0 && hasIntro);
  const more = image < images - 1 || current < count - 1;
  const finish = completion && !more && current === count - 1;
  const position = current < 0 ? `${count} ${count === 1 ? "step" : "steps"}` : `${current + 1} / ${count}`;
  return { back, next: more || finish, finish, position };
}

export type ProgressState = "seen" | "current" | "pending";

/** Segment states of the progress bar: positional (steps before the current one are seen); all seen on the closing panel. */
export function progressStates(current: number, count: number, completed = false): ProgressState[] {
  return Array.from({ length: count }, (_, i) => (completed || i < current ? "seen" : i === current ? "current" : "pending"));
}

export type PresentationShortcut = "index" | "explanations" | "collapse" | "size35" | "size50" | "size75" | "maximizePanel" | "maximizeCode" | "highlight";

/** `O` opens/closes the step index (`b` and `.` too: many clickers send them from their "blank screen" button); `E` the explanations. */
const PRESENTATION_KEYS: Readonly<Record<string, PresentationShortcut>> = {
  o: "index", b: "index", ".": "index", e: "explanations", h: "highlight",
  "1": "collapse", "2": "size35", "3": "size50", "4": "size75", "5": "maximizePanel", "0": "maximizeCode",
};

export interface ShortcutContext {
  presenting: boolean;
  /** Focus in a field (see `isEditableTag`) or in multi-line text. */
  editable: boolean;
  /** Ctrl, Alt or Meta held (Shift is fine: `O` and `o` both open the index). */
  modifier: boolean;
}

/** The single-key shortcut for `key`: presentation mode only (WCAG 2.1.4), never typed into a field or with a modifier. */
export function presentationShortcut(key: string, { presenting, editable, modifier }: ShortcutContext): PresentationShortcut | undefined {
  if (!presenting || editable || modifier) return undefined;
  return PRESENTATION_KEYS[key.toLowerCase()];
}

export interface KeyChord {
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * Alt+P (Option+P) enters or leaves presentation mode. Read from the physical key: Option+P types "π" on
 * macOS. Not in fields (Option+P types there), and not AltGr (Ctrl+Alt on Windows) or with other modifiers.
 */
export function isPresentChord({ code, altKey, ctrlKey, metaKey, shiftKey }: KeyChord, editable: boolean): boolean {
  return code === "KeyP" && altKey && !ctrlKey && !metaKey && !shiftKey && !editable;
}

export interface ShortcutHint {
  keys: string[];
  label: string;
  group: "Navigation" | "Panels" | "Audio";
}

/** The keys the Alt hint lists: what works in the current mode (single keys only while presenting). */
export function shortcutHints(presenting: boolean, mac: boolean): ShortcutHint[] {
  const hints: ShortcutHint[] = [
    { keys: [mac ? "⌥" : "Alt", "P"], label: presenting ? "Exit presentation" : "Present", group: "Navigation" },
    { keys: ["←", "→", "↑", "↓"], label: "Previous / next step", group: "Navigation" },
    { keys: ["PageUp", "PageDown"], label: "Previous / next step (clicker)", group: "Navigation" },
  ];
  if (presenting) hints.push(
    { keys: ["O", "B", "."], label: "Step list", group: "Navigation" },
    { keys: ["Esc"], label: "Close / restore / exit", group: "Navigation" },
    { keys: ["E"], label: "Show / hide explanations", group: "Panels" },
    { keys: ["1"], label: "Collapse / restore lower panel", group: "Panels" },
    ...([35, 50, 75] as const).map((size, i): ShortcutHint => ({ keys: [String(i + 2)], label: `Lower panel ${size}%`, group: "Panels" })),
    { keys: ["5"], label: "Maximize / restore lower panel", group: "Panels" },
    { keys: ["0"], label: "Maximize / restore code or media", group: "Panels" },
    { keys: ["H"], label: "Hide / restore region highlight", group: "Panels" },
  );
  else hints.push({ keys: ["Esc"], label: "Close / restore", group: "Navigation" });
  hints.push({ keys: [mac ? "⌥" : "Alt", "Shift", "L"], label: "Start / pause / resume reading", group: "Audio" });
  return hints;
}
