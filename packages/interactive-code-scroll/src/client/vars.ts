import { setAction } from "./actions.ts";
import { displayValue, readStored, storageKey, valueFromInput, writeStored, type PersistScope } from "./var-values.ts";

type CalciteInput = HTMLElement & { value: string; type: string };

export interface VarsHandle {
  /** Real values (form or default) for vars that have a field. */
  values(): Record<string, string>;
  /** Names of the vars whose field is `secret`. */
  secrets(): ReadonlySet<string>;
}

/**
 * `<VarField>` inputs → in-place text swap of the `[data-var]` tokens in the
 * pre-highlighted code (no client-side highlighter).
 */
export function startVars(onChange: () => void = () => {}, tutorial = ""): VarsHandle {
  const values: Record<string, string> = {};
  const secrets = new Set<string>();

  for (const input of document.querySelectorAll<CalciteInput>("calcite-input[data-var]")) {
    const name = input.dataset.var!;
    const defaultValue = input.dataset.defaultValue ?? "";
    const scope = input.dataset.persist as PersistScope | undefined;
    const key = scope && storageKey(name, scope, tutorial);
    const secret = input.hasAttribute("data-secret");
    let revealed = false;
    if (secret) secrets.add(name);

    const render = () => {
      const text = displayValue(values[name]!, defaultValue, secret, revealed);
      for (const token of document.querySelectorAll(`.code [data-var="${CSS.escape(name)}"]`)) token.textContent = text;
    };

    const stored = key ? readStored(localStorage, key) : undefined;
    values[name] = stored ?? defaultValue;
    if (stored !== undefined) input.value = stored;
    render();

    input.addEventListener("calciteInputInput", () => {
      values[name] = valueFromInput(input.value, defaultValue);
      if (key) writeStored(localStorage, key, input.value === "" ? undefined : input.value);
      render();
      onChange();
    });

    input.querySelector("[data-reveal]")?.addEventListener("click", (event) => {
      revealed = !revealed;
      input.type = revealed ? "text" : "password";
      setAction(event.currentTarget as Element, revealed ? "view-hide" : "view-visible", revealed ? "Hide value" : "Show value");
      render();
    });
  }

  return { values: () => ({ ...values }), secrets: () => secrets };
}
