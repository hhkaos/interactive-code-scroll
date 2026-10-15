/** The search bar's state: typed text, selected tags and level. It also lives in the URL. */
export interface FilterState {
  q: string;
  tags: string[];
  level: string;
}

/** What the filter reads of a card. */
export interface FilterCard {
  title: string;
  description?: string;
  tags: readonly string[];
  level?: string;
}

/** A tag family as the client sees it (`tagGroups`, in display order). */
export interface FilterGroup {
  name: string;
  tags: readonly string[];
}

export const OTHER_GROUP = "Other";

/** Lowercase, without accents: "Café" and "cafe" match. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** The normalized words of a query; every one must match. */
export function searchWords(query: string): string[] {
  return [...new Set(normalize(query).split(/\s+/).filter(Boolean))];
}

/** Every word appears in the title, description, tags or level. */
export function matchesText(card: FilterCard, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const haystack = normalize([card.title, card.description ?? "", ...card.tags, card.level ?? ""].join("\n"));
  return words.every((word) => haystack.includes(word));
}

/**
 * Selected tags match OR within a family and AND across families; tags outside `tagGroups` form one
 * "Other" family, so without groups any selected tag is enough.
 */
export function matchesTags(cardTags: readonly string[], selected: readonly string[], familyOf: ReadonlyMap<string, string> = new Map()): boolean {
  const byFamily = new Map<string, string[]>();
  for (const tag of selected) {
    const family = familyOf.get(tag) ?? OTHER_GROUP;
    byFamily.set(family, [...(byFamily.get(family) ?? []), tag]);
  }
  return [...byFamily.values()].every((tags) => tags.some((tag) => cardTags.includes(tag)));
}

/** Tag → family name. */
export function familyMap(groups: readonly FilterGroup[]): Map<string, string> {
  return new Map(groups.flatMap((group) => group.tags.map((tag) => [tag, group.name] as const)));
}

/** Text, tags and level together (AND). */
export function matchesFilter(card: FilterCard, state: FilterState, familyOf: ReadonlyMap<string, string> = new Map()): boolean {
  return matchesTags(card.tags, state.tags, familyOf) && matchesTextAndLevel(card, state);
}

/** Cards that pass the text and level (the part of the filter that does not depend on tags). */
export function matchesTextAndLevel(card: FilterCard, state: FilterState): boolean {
  return (state.level === "" || card.level === state.level) && matchesText(card, searchWords(state.q));
}

/**
 * For each tag, how many of `cards` (already past text and level) would match with that tag added to
 * the selection; a selected tag counts the current matches that have it.
 */
export function liveTagCounts(
  cards: readonly Pick<FilterCard, "tags">[],
  tags: Iterable<string>,
  selected: readonly string[],
  familyOf: ReadonlyMap<string, string> = new Map(),
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tag of tags) {
    const wanted = selected.includes(tag) ? selected : [...selected, tag];
    counts.set(tag, cards.filter((card) => card.tags.includes(tag) && matchesTags(card.tags, wanted, familyOf)).length);
  }
  return counts;
}

/** How many cards have each tag, in first-seen order. */
export function tagCounts(cards: readonly Pick<FilterCard, "tags">[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) for (const tag of new Set(card.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return counts;
}

/** The `limit` most used tags (ties keep first-seen order), plus any selected tag left out. */
export function topTags(counts: ReadonlyMap<string, number>, limit: number, selected: readonly string[] = []): string[] {
  const ranked = [...counts.entries()].map(([tag, count], index) => ({ tag, count, index }));
  ranked.sort((a, b) => b.count - a.count || a.index - b.index);
  const top = ranked.slice(0, limit).map(({ tag }) => tag);
  return [...top, ...selected.filter((tag) => counts.has(tag) && !top.includes(tag))];
}

/** Every tag by family, in `tagGroups` order (author order inside); the rest under "Other", alphabetical. */
export function groupTags(tags: readonly string[], groups: readonly FilterGroup[]): FilterGroup[] {
  const present = new Set(tags);
  const grouped = groups.map((group) => ({ name: group.name, tags: group.tags.filter((tag) => present.has(tag)) }));
  const familyOf = familyMap(groups);
  const other = tags.filter((tag) => !familyOf.has(tag)).sort((a, b) => a.localeCompare(b));
  return [...grouped, ...(other.length > 0 ? [{ name: OTHER_GROUP, tags: other }] : [])].filter((group) => group.tags.length > 0);
}

/** Tags containing the typed text (prefix matches first, then by count), never already selected. */
export function suggestTags(query: string, counts: ReadonlyMap<string, number>, selected: readonly string[], limit = 8): string[] {
  const text = normalize(query.trim());
  if (text === "") return [];
  const rank = (tag: string) => (normalize(tag).startsWith(text) ? 0 : 1);
  return [...counts.keys()]
    .filter((tag) => !selected.includes(tag) && normalize(tag).includes(text))
    .sort((a, b) => rank(a) - rank(b) || counts.get(b)! - counts.get(a)! || a.localeCompare(b))
    .slice(0, limit);
}

/** Ranges of `text` (start, end in the original string) where any word matches, merged and sorted. */
export function highlightRanges(text: string, words: readonly string[]): [number, number][] {
  if (words.length === 0) return [];
  // Normalize char by char so each normalized index maps back to the original one.
  let normalized = "";
  const origin: number[] = [];
  for (let index = 0; index < text.length; ) {
    const char = String.fromCodePoint(text.codePointAt(index)!);
    const folded = normalize(char);
    normalized += folded;
    for (let k = 0; k < folded.length; k += 1) origin.push(index);
    index += char.length;
  }
  origin.push(text.length);
  const ranges: [number, number][] = [];
  for (const word of words) {
    for (let at = normalized.indexOf(word); at !== -1; at = normalized.indexOf(word, at + word.length)) {
      const end = at + word.length;
      // The end maps to the char after the match's last char.
      const last = origin[end - 1]!;
      ranges.push([origin[at]!, last + String.fromCodePoint(text.codePointAt(last)!).length]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

/** The state from `location.search`: `q`, `tags` (comma-separated; tags have no commas) and `level`. */
export function readState(search: string): FilterState {
  const params = new URLSearchParams(search);
  const tags = (params.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
  return { q: params.get("q") ?? "", tags: [...new Set(tags)], level: params.get("level") ?? "" };
}

/** The state as a query string (`""` when empty), keeping other parameters of `search`. */
export function writeState(state: FilterState, search = ""): string {
  const params = new URLSearchParams(search);
  for (const key of ["q", "tags", "level"]) params.delete(key);
  if (state.q.trim() !== "") params.set("q", state.q);
  if (state.tags.length > 0) params.set("tags", state.tags.join(","));
  if (state.level !== "") params.set("level", state.level);
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/** The state limited to tags and levels the page has (a stale or hand-edited URL). */
export function knownState(state: FilterState, tags: ReadonlySet<string>, levels: ReadonlySet<string>): FilterState {
  return { q: state.q, tags: state.tags.filter((tag) => tags.has(tag)), level: levels.has(state.level) ? state.level : "" };
}

export function isEmptyState(state: FilterState): boolean {
  return state.q.trim() === "" && state.tags.length === 0 && state.level === "";
}

export function countLabel(visible: number, total: number): string {
  const noun = total === 1 ? "tutorial" : "tutorials";
  return visible === total ? `${total} ${noun}` : `${visible} of ${total} ${noun}`;
}
