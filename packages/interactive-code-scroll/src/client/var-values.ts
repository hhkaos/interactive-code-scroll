export const storageKey = (name: string) => `ics:var:${name}`;

/**
 * Text shown in the code panel for a var: secrets are masked once they differ
 * from the (demo) default, unless revealed.
 */
export function displayValue(value: string, defaultValue: string, secret: boolean, revealed: boolean): string {
  return secret && !revealed && value !== defaultValue ? "•".repeat(value.length) : value;
}

/** An empty field means "use the default from the code". */
export function valueFromInput(input: string, defaultValue: string): string {
  return input === "" ? defaultValue : input;
}

/** Reads a persisted value; storage can throw (private mode, blocked site data). */
export function readStored(storage: Pick<Storage, "getItem">, name: string): string | undefined {
  try {
    return storage.getItem(storageKey(name)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStored(storage: Pick<Storage, "setItem" | "removeItem">, name: string, value: string | undefined): void {
  try {
    if (value === undefined) storage.removeItem(storageKey(name));
    else storage.setItem(storageKey(name), value);
  } catch {
    // Persistence is a convenience; the tutorial keeps working without it.
  }
}
