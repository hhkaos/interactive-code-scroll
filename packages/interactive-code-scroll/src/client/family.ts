import { siblingUrl } from "./family-values.ts";
import type { VariantsHandle } from "./variants.ts";

export interface SiblingInfo {
  slug: string;
  href: string;
  variants: string[];
}

/**
 * Segmented control while it fits the header without squeezing the title, else the dropdown. Measured with the
 * segmented control shown: both toggles happen before the next paint, so nothing flickers.
 */
function fitSwitcher(slot: HTMLElement, segmented: HTMLElement, dropdown: HTMLElement): void {
  segmented.hidden = false;
  dropdown.hidden = true;
  const fits = slot.scrollWidth <= slot.clientWidth;
  segmented.hidden = !fits;
  dropdown.hidden = fits;
}

/** Header switcher between sibling tutorials (same `family`): loads the chosen one at the current step. */
export function startFamily(siblings: readonly SiblingInfo[], variants: VariantsHandle | undefined): void {
  const slot = document.querySelector<HTMLElement>(".family-switcher");
  if (!slot || siblings.length === 0) return;
  const control = slot.querySelector<HTMLElement & { value: string }>("#family-switcher");
  const dropdown = slot.querySelector<HTMLElement>("#family-dropdown");

  const go = (slug: string) => {
    const sibling = siblings.find((s) => s.slug === slug);
    if (!sibling || location.pathname === new URL(sibling.href, location.href).pathname) return;
    location.assign(siblingUrl(sibling.href, location.href, location.hash, variants?.active().id, sibling.variants));
  };

  control?.addEventListener("calciteSegmentedControlChange", () => go(control.value));
  dropdown?.addEventListener("calciteDropdownSelect", (event) => {
    const item = (event.target as HTMLElement & { selectedItems?: HTMLElement[] }).selectedItems?.[0];
    if (item?.dataset.tutorial) go(item.dataset.tutorial);
  });
  if (control && dropdown) {
    // Calcite components render (and size) late: watch the control as well as its room.
    const fit = new ResizeObserver(() => fitSwitcher(slot, control, dropdown));
    for (const el of [slot, control]) fit.observe(el);
  }
}
