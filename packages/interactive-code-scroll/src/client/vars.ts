import { setAction } from "./actions.ts";
import { typedValue, type VarKind } from "../markers.ts";
import { displayValue, readStored, storageKey, valueFromInput, writeStored, type PersistScope } from "./var-values.ts";

type Valued = HTMLElement & { value: string };
type Checkable = HTMLElement & { checked: boolean };
type Selectable = HTMLElement & { selected: boolean };

export interface VarsHandle {
  /** Real values (form or default) for vars that have a field. */
  values(): Record<string, string>;
  /** Names of the vars whose field is `secret`. */
  secrets(): ReadonlySet<string>;
}

/** How each Calcite field reads and shows its value, and the event it fires on change. */
interface FieldAdapter {
  event: string;
  read(): string;
  write(value: string): void;
}

function adapterFor(field: HTMLElement): FieldAdapter {
  /** Choice fields mark their option for `value` (`selected` or `checked`). */
  const items = (selector: string) => [...field.querySelectorAll<Selectable & Checkable>(selector)];
  const pick = (selector: string, flag: "selected" | "checked") => (value: string) => {
    for (const item of items(selector)) item[flag] = item.getAttribute("value") === value;
  };
  const picked = (selector: string, flag: "selected" | "checked") => () => items(selector).find((item) => item[flag])?.getAttribute("value") ?? "";
  switch (field.tagName) {
    case "CALCITE-SWITCH":
      return {
        event: "calciteSwitchChange",
        read: () => String((field as Checkable).checked),
        write: (value) => ((field as Checkable).checked = value === "true"),
      };
    case "CALCITE-TEXT-AREA":
      return { event: "calciteTextAreaInput", read: () => (field as Valued).value, write: (value) => ((field as Valued).value = value) };
    case "CALCITE-SELECT":
      return { event: "calciteSelectChange", read: () => (field as Valued).value, write: pick("calcite-option", "selected") };
    case "CALCITE-RADIO-BUTTON-GROUP":
      return {
        event: "calciteRadioButtonGroupChange",
        read: picked("calcite-radio-button", "checked"),
        write: pick("calcite-radio-button", "checked"),
      };
    case "CALCITE-COMBOBOX":
      return {
        event: "calciteComboboxChange",
        read: picked("calcite-combobox-item", "selected"),
        write: pick("calcite-combobox-item", "selected"),
      };
    default:
      return { event: "calciteInputInput", read: () => (field as Valued).value, write: (value) => ((field as Valued).value = value) };
  }
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
    const adapter = adapterFor(field);
    let revealed = false;
    if (secret) secrets.add(name);

    const render = () => {
      for (const token of document.querySelectorAll(`.code [data-var="${CSS.escape(name)}"]`)) {
        if (!literals.has(token)) literals.set(token, token.textContent ?? "");
        // A line break would add a line without a number to the panel; downloads escape it.
        const value = kind === "string" ? values[name]!.replace(/\r?\n/g, "\\n") : typedValue(values[name]!, kind, literals.get(token)!);
        token.textContent = displayValue(value, defaultValue, secret, revealed);
      }
    };

    const stored = key ? readStored(localStorage, key) : undefined;
    values[name] = stored ?? defaultValue;
    if (stored !== undefined) adapter.write(stored);
    render();

    field.addEventListener(adapter.event, () => {
      const raw = adapter.read();
      values[name] = valueFromInput(raw, defaultValue);
      // A switch is never empty: off is stored unless it is the default.
      if (key) writeStored(localStorage, key, raw === "" || (kind === "boolean" && raw === defaultValue) ? undefined : raw);
      render();
      onChange();
    });

    field.querySelector("[data-reveal]")?.addEventListener("click", (event) => {
      revealed = !revealed;
      (field as HTMLElement & { type: string }).type = revealed ? "text" : "password";
      setAction(event.currentTarget as Element, revealed ? "view-hide" : "view-visible", revealed ? "Hide value" : "Show value");
      render();
    });
  }

  return { values: () => ({ ...values }), secrets: () => secrets };
}
