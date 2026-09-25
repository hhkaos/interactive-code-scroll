export type Mode = "light" | "dark";

export const THEME_KEY = "ics:theme";

export interface SplitRange {
  /** localStorage key. */
  key: string;
  min: number;
  max: number;
  fallback: number;
}

/** Docs column width, in % of the layout width. */
export const DOCS_SPLIT: SplitRange = { key: "ics:split", min: 20, max: 70, fallback: 40 };
/** Preview height, in % of the right panel height. */
export const PREVIEW_SPLIT: SplitRange = { key: "ics:preview-split", min: 15, max: 85, fallback: 50 };

/** A stored manual choice wins, then the tutorial's default (`theme` frontmatter), then the OS preference. */
export function resolveMode(stored: string | null | undefined, prefersDark: boolean, tutorialDefault?: string): Mode {
  for (const choice of [stored, tutorialDefault]) if (choice === "light" || choice === "dark") return choice;
  return prefersDark ? "dark" : "light";
}

/** Clamped so neither panel disappears; one decimal. */
export function clampSplit(percent: number, range: SplitRange): number {
  if (!Number.isFinite(percent)) return range.fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(percent * 10) / 10));
}

/** Pointer position → % of the container along the splitter's axis. */
export function splitFromPointer(pointer: number, start: number, size: number, range: SplitRange): number {
  return clampSplit(((pointer - start) / size) * 100, range);
}

export function parseStoredSplit(stored: string | null | undefined, range: SplitRange): number {
  return stored == null ? range.fallback : clampSplit(Number(stored), range);
}
