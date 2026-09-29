export const VARIANT_KEY = "ics:variant";

/** Variant shown on load: `?variant=`, else the remembered choice, else the first; unknown ids are ignored. */
export function pickVariant(ids: readonly string[], search: string, stored: string | undefined): string {
  const fromUrl = new URLSearchParams(search).get("variant");
  for (const id of [fromUrl, stored]) if (id && ids.includes(id)) return id;
  return ids[0]!;
}

/** Storage can throw (private mode, blocked site data). */
export function readStoredVariant(storage: Pick<Storage, "getItem">): string | undefined {
  try {
    return storage.getItem(VARIANT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredVariant(storage: Pick<Storage, "setItem">, id: string): void {
  try {
    storage.setItem(VARIANT_KEY, id);
  } catch {
    // Remembering the choice is a convenience.
  }
}

/** A step without `only` applies to every variant. */
export function coversVariant(only: string | undefined, id: string): boolean {
  return only === undefined || only.split(/\s+/).includes(id);
}

/** The URL with `?variant=id`, keeping the other parameters and the hash. */
export function withVariantParam(href: string, id: string): string {
  const url = new URL(href);
  url.searchParams.set("variant", id);
  return url.href;
}

export interface VariantPaths {
  dir: string;
  entry: string;
}

/** The file at the same path in the other variant when it has a tab there, else that variant's entry. */
export function counterpartFile(path: string | undefined, from: VariantPaths, to: VariantPaths, tabs: ReadonlySet<string>): string {
  const prefix = `${from.dir}/`;
  if (path?.startsWith(prefix)) {
    const candidate = `${to.dir}/${path.slice(prefix.length)}`;
    if (tabs.has(candidate)) return candidate;
  }
  return `${to.dir}/${to.entry}`;
}

/** "Python", "Python and cURL", "Python, cURL and Go". */
export function listLabels(labels: readonly string[]): string {
  return labels.length < 2 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

/** Index in `visible` of `step`, or of the nearest earlier step still visible (first step when none). */
export function nearestVisible<T>(all: readonly T[], visible: readonly T[], step: T): number {
  for (let i = all.indexOf(step); i >= 0; i -= 1) {
    const index = visible.indexOf(all[i]!);
    if (index >= 0) return index;
  }
  return 0;
}

/** Up to this many variants the switcher can be a segmented control. */
export const MAX_SEGMENTED = 4;
/** Segmented control while the active variant's file tabs (`tabsWidth`) all fit in their room (`tabSpace`), else a dropdown. */
export function switcherKind(count: number, tabSpace: number, tabsWidth: number): "segmented" | "dropdown" {
  return count <= MAX_SEGMENTED && tabsWidth <= tabSpace ? "segmented" : "dropdown";
}
