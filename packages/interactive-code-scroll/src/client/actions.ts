type CalciteAction = HTMLElement & { icon: string; text: string };

const tooltips = new WeakMap<Element, HTMLElement>();

/**
 * Icon-only `calcite-action`s get a `calcite-tooltip` with their text (Calcite's
 * pattern for toolbars). Tooltips live at the end of `body`: slotted containers
 * such as `calcite-navigation` do not render unslotted children.
 */
export function startTooltips(): void {
  for (const action of document.querySelectorAll<CalciteAction>("calcite-action:not([text-enabled])")) {
    const tooltip = document.createElement("calcite-tooltip") as HTMLElement & { referenceElement: Element };
    tooltip.setAttribute("placement", "bottom");
    tooltip.referenceElement = action;
    tooltip.textContent = action.getAttribute("text");
    document.body.append(tooltip);
    tooltips.set(action, tooltip);
  }
}

/** Changes an action's icon and text (accessible name and tooltip). */
export function setAction(action: Element | null, icon: string, text: string): void {
  if (!action) return;
  action.setAttribute("icon", icon);
  action.setAttribute("text", text);
  const tooltip = tooltips.get(action);
  if (tooltip) tooltip.textContent = text;
}
