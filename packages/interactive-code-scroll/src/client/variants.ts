import { pickVariant, readStoredVariant, switcherKind, withVariantParam, writeStoredVariant } from "./variant-values.ts";

export interface VariantInfo {
  id: string;
  label: string;
  dir: string;
  entry: string;
}

/** Fired on `document` after the reader switches variants. */
export const VARIANT_EVENT = "ics:variant";
export interface VariantChange {
  from: VariantInfo;
  to: VariantInfo;
}

export interface VariantsHandle {
  readonly list: readonly VariantInfo[];
  active(): VariantInfo;
  /** Switches variant: remembered per site and written to `?variant=`. */
  set(id: string): void;
}

type SegmentedItem = HTMLElement & { checked: boolean };
type DropdownItem = HTMLElement & { selected: boolean };

/**
 * Segmented control while every file tab of the active variant stays in view, else the dropdown. Measured with the
 * segmented control shown: both toggles happen before the next paint, so nothing flickers.
 */
function fitSwitcher(header: HTMLElement, segmented: HTMLElement, dropdown: HTMLElement, count: number): void {
  segmented.hidden = false;
  dropdown.hidden = true;
  // The visible tab nav takes whatever room the header has left (flex: 1); its titles overflow it when they do not fit.
  const nav = header.querySelector<HTMLElement>("calcite-tab-nav:not([hidden])");
  const titles = [...(nav?.querySelectorAll<HTMLElement>("calcite-tab-title") ?? [])];
  const tabsWidth = titles.reduce((sum, title) => sum + title.offsetWidth, 0);
  const segmentedFits = switcherKind(count, nav?.clientWidth ?? 0, tabsWidth) === "segmented";
  segmented.hidden = !segmentedFits;
  dropdown.hidden = segmentedFits;
}

/** Language switcher in the code header: shows the active variant's tabs. */
export function startVariants(list: readonly VariantInfo[]): VariantsHandle {
  const byId = new Map(list.map((v) => [v.id, v]));
  let active = byId.get(
    pickVariant(
      list.map((v) => v.id),
      location.search,
      readStoredVariant(localStorage),
    ),
  )!;
  const control = document.querySelector<HTMLElement & { value: string }>("#variant-switcher");
  const dropdown = document.querySelector<HTMLElement>("#variant-dropdown");

  const apply = () => {
    for (const nav of document.querySelectorAll<HTMLElement>("calcite-tab-nav[data-variant]")) nav.hidden = nav.dataset.variant !== active.id;
    for (const item of document.querySelectorAll<SegmentedItem>("#variant-switcher calcite-segmented-control-item")) {
      item.checked = item.getAttribute("value") === active.id;
    }
    for (const item of document.querySelectorAll<DropdownItem>("#variant-dropdown calcite-dropdown-item")) {
      item.selected = item.dataset.variant === active.id;
    }
    const trigger = dropdown?.querySelector("[slot=trigger]");
    if (trigger) trigger.textContent = active.label;
  };

  const set = (id: string) => {
    const next = byId.get(id);
    if (!next || next === active) return;
    const from = active;
    active = next;
    apply();
    writeStoredVariant(localStorage, id);
    history.replaceState(null, "", withVariantParam(location.href, id));
    document.dispatchEvent(new CustomEvent<VariantChange>(VARIANT_EVENT, { detail: { from, to: next } }));
  };

  control?.addEventListener("calciteSegmentedControlChange", () => set(control.value));
  dropdown?.addEventListener("calciteDropdownSelect", (event) => {
    const item = (event.target as HTMLElement & { selectedItems?: HTMLElement[] }).selectedItems?.[0];
    if (item?.dataset.variant) set(item.dataset.variant);
  });
  const header = control?.parentElement;
  if (control && dropdown && header) {
    // Calcite components render (and size) late: watch the tabs and their room, not just the header.
    const fit = new ResizeObserver(() => fitSwitcher(header, control, dropdown, list.length));
    for (const el of [header, control, ...header.querySelectorAll("calcite-tab-nav, calcite-tab-title")]) fit.observe(el);
  }
  apply();
  return { list, active: () => active, set };
}
