import { setAction } from "./actions.ts";
import { typedValue, type VarKind } from "../markers.ts";
import { displayValue, readStored, storageKey, valueFromInput, writeStored, type PersistScope } from "./var-values.ts";

type CalciteInput = HTMLElement & { value: string; type: string };
type CalciteSwitch = HTMLElement & { checked: boolean };

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
  // Each token's literal as built: a typed value keeps its file's spelling (`True` vs `true`).
  const literals = new WeakMap<Element, string>();

  for (const field of document.querySelectorAll<HTMLElement>(".var-field[data-var], .var-field [data-var]")) {
    const name = field.dataset.var!;
    const kind = (field.dataset.kind ?? "string") as VarKind;
    const defaultValue = field.dataset.defaultValue ?? "";
    const scope = field.dataset.persist as PersistScope | undefined;
    const key = scope && storageKey(name, scope, tutorial);
    const secret = field.hasAttribute("data-secret");
    const toggle = field.tagName === "CALCITE-SWITCH" ? (field as CalciteSwitch) : undefined;
    const input = toggle ? undefined : (field as CalciteInput);
    let revealed = false;
    if (secret) secrets.add(name);

    const render = () => {
      for (const token of document.querySelectorAll(`.code [data-var="${CSS.escape(name)}"]`)) {
        if (!literals.has(token)) literals.set(token, token.textContent ?? "");
        const value = kind === "string" ? values[name]! : typedValue(values[name]!, kind, literals.get(token)!);
        token.textContent = displayValue(value, defaultValue, secret, revealed);
      }
    };
    const update = (value: string, stored: string | undefined) => {
      values[name] = value;
      if (key) writeStored(localStorage, key, stored);
      render();
      onChange();
    };

    const stored = key ? readStored(localStorage, key) : undefined;
    values[name] = stored ?? defaultValue;
    if (stored !== undefined) {
      if (toggle) toggle.checked = stored === "true";
      else input!.value = stored;
    }
    render();

    if (toggle) {
      toggle.addEventListener("calciteSwitchChange", () => {
        const value = String(toggle.checked);
        update(value, value === defaultValue ? undefined : value);
      });
      continue;
    }
    input!.addEventListener("calciteInputInput", () => {
      update(valueFromInput(input!.value, defaultValue), input!.value === "" ? undefined : input!.value);
    });

    input!.querySelector("[data-reveal]")?.addEventListener("click", (event) => {
      revealed = !revealed;
      input!.type = revealed ? "text" : "password";
      setAction(event.currentTarget as Element, revealed ? "view-hide" : "view-visible", revealed ? "Hide value" : "Show value");
      render();
    });
  }

  return { values: () => ({ ...values }), secrets: () => secrets };
}
