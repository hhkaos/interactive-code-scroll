/** Where the form field persists: `persist` shares it site-wide, `persist="tutorial"` scopes it to one tutorial. */
export type PersistScope = "site" | "tutorial";

/**
 * Site-wide by default, so a credential is entered once per site. A tutorial-scoped value gets its
 * tutorial's slug; a single-tutorial site has no slug, and there the site is the tutorial.
 */
export const storageKey = (name: string, scope: PersistScope = "site", tutorial = "") =>
  scope === "tutorial" && tutorial !== "" ? `ics:var:${tutorial}:${name}` : `ics:var:${name}`;

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
export function readStored(storage: Pick<Storage, "getItem">, key: string): string | undefined {
  try {
    return storage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStored(storage: Pick<Storage, "setItem" | "removeItem">, key: string, value: string | undefined): void {
  try {
    if (value === undefined) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Persistence is a convenience; the tutorial keeps working without it.
  }
}
