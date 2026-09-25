export type Mode = "light" | "dark";

export const THEME_KEY = "ics:theme";
export const SPLIT_KEY = "ics:split";
export const SPLIT_MIN = 20;
export const SPLIT_MAX = 70;
export const SPLIT_DEFAULT = 40;

/** A stored manual choice wins, then the tutorial's default (`theme` frontmatter), then the OS preference. */
export function resolveMode(stored: string | null | undefined, prefersDark: boolean, tutorialDefault?: string): Mode {
  for (const choice of [stored, tutorialDefault]) if (choice === "light" || choice === "dark") return choice;
  return prefersDark ? "dark" : "light";
}

/** Docs column width in % of the layout, clamped so neither panel disappears. */
export function clampSplit(percent: number): number {
  if (!Number.isFinite(percent)) return SPLIT_DEFAULT;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(percent * 10) / 10));
}

export function splitFromPointer(clientX: number, layoutLeft: number, layoutWidth: number): number {
  return clampSplit(((clientX - layoutLeft) / layoutWidth) * 100);
}

export function parseStoredSplit(stored: string | null | undefined): number {
  return stored == null ? SPLIT_DEFAULT : clampSplit(Number(stored));
}
