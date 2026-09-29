type CalciteAction = HTMLElement & { icon: string; text: string };

const tooltips = new WeakMap<Element, HTMLElement>();

/**
 * Icon-only `calcite-action`s get a `calcite-tooltip` with their text (Calcite's
 * pattern for toolbars). Tooltips live at the end of `body`: slotted containers
 * such as `calcite-navigation` do not render unslotted children.
 */
export function startTooltips(): void {
  for (const action of document.querySelectorAll<CalciteAction>("calcite-action:not([text-enabled])")) {
    setTooltip(action, action.getAttribute("text"));
  }
}

/** Adds (or updates) a tooltip for `element`; `null` removes it (e.g. its label is visible again). */
export function setTooltip(element: Element, text: string | null): void {
  let tooltip = tooltips.get(element);
  if (text === null) {
    tooltip?.remove();
    tooltips.delete(element);
    return;
  }
  if (!tooltip) {
    tooltip = document.createElement("calcite-tooltip") as HTMLElement & { referenceElement: Element };
    tooltip.setAttribute("placement", "bottom");
    (tooltip as HTMLElement & { referenceElement: Element }).referenceElement = element;
    document.body.append(tooltip);
    tooltips.set(element, tooltip);
  }
  tooltip.textContent = text;
}

/** Changes an action's icon and text (accessible name and tooltip). */
export function setAction(action: Element | null, icon: string, text: string): void {
  if (!action) return;
  action.setAttribute("icon", icon);
  action.setAttribute("text", text);
  const tooltip = tooltips.get(action);
  if (tooltip) tooltip.textContent = text;
}
