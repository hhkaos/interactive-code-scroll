const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "CALCITE-INPUT"]);

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

export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(index, 0), count - 1);
}

/** Index of the step named by a `#step-id` hash, or 0. */
export function indexFromHash(ids: readonly string[], hash: string): number {
  const index = ids.indexOf(decodeURIComponent(hash.replace(/^#/, "")));
  return index < 0 ? 0 : index;
}
