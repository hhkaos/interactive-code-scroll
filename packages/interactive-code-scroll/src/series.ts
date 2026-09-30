import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** A tutorial folder of a series site, published at `/<slug>/`. */
export interface SeriesEntry {
  slug: string;
  dir: string;
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Optional page of a series folder: frontmatter and prose of the index. */
export const SERIES_INDEX = "index.mdx";
/** Series folder holding the index's images (its logo); never a tutorial. */
export const SERIES_IMAGES = "images";

/**
 * Lists the tutorials of a series folder: every subfolder with `tutorial.mdx`, sorted by slug.
 * Folders starting with `_` or `.` and the index's `images/` are ignored; other folders without
 * `tutorial.mdx` are skipped with a warning. Throws when a slug is invalid or no tutorial is found.
 */
export function discoverTutorials(seriesDir: string, warn: (message: string) => void = console.warn): SeriesEntry[] {
  if (!existsSync(seriesDir)) throw new Error(`interactive-code-scroll: tutorials folder not found at ${seriesDir}`);
  const entries: SeriesEntry[] = [];
  const invalid: string[] = [];
  for (const entry of readdirSync(seriesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const dir = join(seriesDir, entry.name);
    if (!existsSync(join(dir, "tutorial.mdx"))) {
      if (entry.name !== SERIES_IMAGES) warn(`interactive-code-scroll: skipped ${dir}: no tutorial.mdx`);
      continue;
    }
    if (SLUG_PATTERN.test(entry.name)) entries.push({ slug: entry.name, dir });
    else invalid.push(entry.name);
  }
  if (invalid.length > 0) {
    throw new Error(
      `interactive-code-scroll: tutorial folder names are their URLs and must match ${SLUG_PATTERN.source} (lowercase letters, digits and "-"): ${invalid.join(", ")}`,
    );
  }
  if (entries.length === 0) throw new Error(`interactive-code-scroll: no tutorial found in ${seriesDir} (expected <name>/tutorial.mdx)`);
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** What the index shows of a tutorial. */
export interface SeriesCard {
  slug: string;
  href: string;
  title: string;
  description?: string;
  tags: string[];
  level?: string;
  duration?: string;
  order?: number;
}

/** Index order: `order` first (lower first), then tutorials without it; ties by title. */
export function sortCards<T extends Pick<SeriesCard, "title" | "order">>(cards: readonly T[]): T[] {
  const rank = (card: T) => card.order ?? Number.POSITIVE_INFINITY;
  return [...cards].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/** `<TutorialList tags="a, b">`: comma-separated tags. */
export function parseTagList(value: string | undefined): string[] {
  return value === undefined ? [] : [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

/** Cards of a `<TutorialList>`: any of `tags` (when given) and exactly `level` (when given). */
export function selectCards<T extends Pick<SeriesCard, "tags" | "level">>(cards: readonly T[], filter: { tags?: string[]; level?: string }): T[] {
  return cards.filter(
    (card) =>
      (!filter.tags?.length || filter.tags.some((tag) => card.tags.includes(tag))) && (filter.level === undefined || card.level === filter.level),
  );
}

/** Every tag of the cards, in first-seen order (the filter bar lists them). */
export function allTags(cards: readonly Pick<SeriesCard, "tags">[]): string[] {
  return [...new Set(cards.flatMap((card) => card.tags))];
}

/** What sibling logic needs of a tutorial: its slug, family and index position. */
export interface FamilyMember {
  slug: string;
  family?: { id: string; label: string };
  order?: number;
}

/** Cross-tutorial family rules: a label used twice in a family fails, a family of one only warns. */
export function familyProblems(members: readonly FamilyMember[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byFamily = new Map<string, FamilyMember[]>();
  for (const member of members) {
    if (member.family) byFamily.set(member.family.id, [...(byFamily.get(member.family.id) ?? []), member]);
  }
  for (const [id, family] of byFamily) {
    if (family.length === 1) {
      warnings.push(`interactive-code-scroll: tutorial "${family[0]!.slug}" is the only one in family "${id}"; the language switcher needs a sibling`);
    }
    const byLabel = new Map<string, string[]>();
    for (const member of family) byLabel.set(member.family!.label, [...(byLabel.get(member.family!.label) ?? []), member.slug]);
    for (const [label, slugs] of byLabel) {
      if (slugs.length > 1) errors.push(`tutorials ${slugs.map((s) => `"${s}"`).join(", ")} use the same familyLabel "${label}" in family "${id}"`);
    }
  }
  return { errors, warnings };
}

/** The tutorials of `slug`'s family (itself included), by `order` then label; empty without a sibling. */
export function familyOf<T extends FamilyMember>(members: readonly T[], slug: string): T[] {
  const id = members.find((m) => m.slug === slug)?.family?.id;
  if (id === undefined) return [];
  const family = members.filter((m) => m.family?.id === id);
  if (family.length < 2) return [];
  const rank = (m: T) => m.order ?? Number.POSITIVE_INFINITY;
  return family.sort((a, b) => rank(a) - rank(b) || a.family!.label.localeCompare(b.family!.label));
}
