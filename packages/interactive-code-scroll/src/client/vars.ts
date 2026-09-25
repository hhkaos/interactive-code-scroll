import { displayValue, readStored, valueFromInput, writeStored } from "./var-values.ts";

type CalciteInput = HTMLElement & { value: string; type: string; placeholder: string };

export interface VarsHandle {
  /** Real values (form or default) for vars that have a field. */
  values(): Record<string, string>;
}

/**
 * `<VarField>` inputs → in-place text swap of the `[data-var]` tokens in the
 * pre-highlighted code (no client-side highlighter).
 */
export function startVars(onChange: () => void = () => {}): VarsHandle {
  const values: Record<string, string> = {};

  for (const input of document.querySelectorAll<CalciteInput>("calcite-input[data-var]")) {
    const name = input.dataset.var!;
    const defaultValue = input.getAttribute("placeholder") ?? "";
    const persist = input.hasAttribute("data-persist");
    const secret = input.hasAttribute("data-secret");
    let revealed = false;

    const render = () => {
      const text = displayValue(values[name]!, defaultValue, secret, revealed);
      for (const token of document.querySelectorAll(`.code [data-var="${CSS.escape(name)}"]`)) token.textContent = text;
    };

    const stored = persist ? readStored(localStorage, name) : undefined;
    values[name] = stored ?? defaultValue;
    if (stored !== undefined) input.value = stored;
    render();

    input.addEventListener("calciteInputInput", () => {
      values[name] = valueFromInput(input.value, defaultValue);
      if (persist) writeStored(localStorage, name, input.value === "" ? undefined : input.value);
      render();
      onChange();
    });

    input.querySelector("[data-reveal]")?.addEventListener("click", (event) => {
      revealed = !revealed;
      input.type = revealed ? "text" : "password";
      const button = event.currentTarget as HTMLElement;
      button.setAttribute("icon-start", revealed ? "view-hide" : "view-visible");
      button.setAttribute("label", revealed ? "Hide" : "Show");
      render();
    });
  }

  return { values: () => ({ ...values }) };
}
