import {
  countLabel,
  familyMap,
  highlightRanges,
  isEmptyState,
  knownState,
  liveTagCounts,
  matchesFilter,
  matchesTextAndLevel,
  normalize,
  readState,
  searchWords,
  suggestTags,
  tagCounts,
  topTags,
  writeState,
  type FilterGroup,
  type FilterState,
} from "./series-values.ts";

const MIN_HIGHLIGHT = 2;
/** Milliseconds after the last keystroke before the text filters (and suggests). */
const TYPING_DELAY = 150;

type Autocomplete = HTMLElement & { inputValue: string; value: string; open: boolean; setFocus(): Promise<void> };
type Select = HTMLElement & { value: string };

interface Card {
  item: HTMLElement;
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  level?: string;
  titleNode: HTMLElement | null;
  descriptionNode: HTMLElement | null;
  tagNodes: HTMLElement[];
  variantLinks: HTMLAnchorElement[];
}

/**
 * Search bar of the series index: filters the cards of every `<TutorialList>` by text, tags (OR
 * within a family, AND across) and level, highlights matches and keeps the state in the URL.
 * Without JavaScript the bar is hidden and every card stays visible.
 */
export function startSeriesFilter(): void {
  const bar = document.querySelector<HTMLElement>(".series-filter");
  const search = document.querySelector<Autocomplete>("#series-search");
  if (!bar || !search) return;
  const level = bar.querySelector<Select>("#series-level");
  const count = bar.querySelector<HTMLElement>("#series-count");
  const clear = bar.querySelector<HTMLElement>("#series-clear");
  const top = bar.querySelector<HTMLElement>("#series-tags-top");
  const all = bar.querySelector<HTMLElement>("#series-tags-all");
  const more = bar.querySelector<HTMLElement>("#series-more");
  const data = JSON.parse(bar.querySelector("#series-filter-data")?.textContent ?? "{}") as {
    groups?: FilterGroup[];
    families?: Record<string, number>;
  };
  const groups = data.groups ?? [];
  const families = familyMap(groups);

  const cards: Card[] = [...document.querySelectorAll<HTMLElement>(".series-card-item")].map((item) => {
    const titleNode = item.querySelector<HTMLElement>(".series-card-title");
    const descriptionNode = item.querySelector<HTMLElement>(".series-card-description");
    // Plain tags and variant links; `data-tag` holds the tag (a link's text also names the tutorial).
    const variantLinks = [...item.querySelectorAll<HTMLAnchorElement>("a.series-card-variant")];
    const tagNodes = [...item.querySelectorAll<HTMLElement>(".series-card-tags > li"), ...variantLinks];
    // Family colors for custom pages, whose <TutorialList> does not know <TutorialFilter tagGroups>.
    for (const node of item.querySelectorAll<HTMLElement>(".series-card-tags > li")) {
      const index = data.families?.[node.dataset.tag ?? ""];
      if (index !== undefined) node.dataset.family = String(index);
    }
    return {
      item,
      slug: item.dataset.slug ?? "",
      title: titleNode?.textContent ?? "",
      ...(descriptionNode ? { description: descriptionNode.textContent ?? "" } : {}),
      tags: JSON.parse(item.dataset.tags ?? "[]") as string[],
      ...(item.dataset.level ? { level: item.dataset.level } : {}),
      titleNode,
      descriptionNode,
      tagNodes,
      variantLinks,
    };
  });
  // Sections may list a tutorial twice: counts are of tutorials, not cards.
  const unique = [...new Map(cards.map((card) => [card.slug, card])).values()];
  const total = unique.length;
  const counts = tagCounts(unique);
  const levels = new Set(unique.flatMap((card) => (card.level === undefined ? [] : [card.level])));
  const toggles = [...bar.querySelectorAll<HTMLButtonElement>(".series-tag")];
  const row = top?.querySelector<HTMLElement>(".series-tags-row") ?? null;
  const rowToggles = new Map([...(row?.querySelectorAll<HTMLButtonElement>(".series-tag") ?? [])].map((toggle) => [toggle.dataset.tag ?? "", toggle]));
  // Site order (most used on this page first): breaks ties between live counts.
  const siteRank = new Map(topTags(counts, counts.size).map((tag, index) => [tag, index]));
  let live = counts;

  /** Live counts on every toggle; the row lists tags with results by count, the panel disables the empty ones. */
  const updateTags = () => {
    for (const toggle of toggles) {
      const tag = toggle.dataset.tag ?? "";
      const n = live.get(tag) ?? 0;
      const pressed = state.tags.includes(tag);
      toggle.setAttribute("aria-pressed", String(pressed));
      toggle.querySelector(".series-tag-count")?.replaceChildren(hidden(", "), String(n), hidden(` ${n === 1 ? "tutorial" : "tutorials"}`));
      // Panel toggles: an empty one is disabled; a selected one stays usable so it can be removed. (The row hides empty ones.)
      if (toggle.parentElement !== row) toggle.disabled = n === 0 && !pressed;
    }
    if (!row) return;
    const focused = document.activeElement;
    const order = [...rowToggles.keys()].sort((a, b) => (live.get(b) ?? 0) - (live.get(a) ?? 0) || siteRank.get(a)! - siteRank.get(b)!);
    row.append(...order.map((tag) => rowToggles.get(tag)!));
    if (focused instanceof HTMLElement && row.contains(focused)) focused.focus();
  };

  // The row keeps the selected tags plus the most used ones that fit on one line; "+N more" lists the rest.
  const fit = () => {
    if (!top || !row || top.hidden) return;
    const all = [...row.querySelectorAll<HTMLButtonElement>(".series-tag")];
    const items = all.filter((item) => (live.get(item.dataset.tag ?? "") ?? 0) > 0 || item.getAttribute("aria-pressed") === "true");
    for (const item of all) item.hidden = !items.includes(item);
    for (const item of items) item.hidden = false;
    if (more) more.hidden = false;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const widths = new Map(items.map((item) => [item, item.getBoundingClientRect().width]));
    const choose = (room: number) => {
      const chosen = new Set(items.filter((item) => item.getAttribute("aria-pressed") === "true"));
      let used = [...chosen].reduce((sum, item) => sum + widths.get(item)! + gap, 0);
      // Most used first, stopping at the first that does not fit: a shorter, rarer tag never jumps the queue.
      for (const item of items) {
        if (chosen.has(item)) continue;
        if (used + widths.get(item)! > room) break;
        chosen.add(item);
        used += widths.get(item)! + gap;
      }
      return chosen;
    };
    const full = top.getBoundingClientRect().width;
    let shown = choose(full);
    if (shown.size < items.length && more) {
      more.textContent = `+${items.length - shown.size} more`;
      shown = choose(full - more.getBoundingClientRect().width - gap);
      more.textContent = `+${items.length - shown.size} more`;
    }
    for (const item of items) item.hidden = !shown.has(item);
    // "+N more" counts the tags with results left out; the panel also lists the empty ones (disabled).
    if (more) {
      const left = items.length - shown.size;
      more.textContent = left > 0 ? `+${left} more` : "All tags";
      more.hidden = shown.size === all.length;
    }
  };

  let state: FilterState = knownState(readState(location.search), new Set(counts.keys()), levels);

  const render = () => {
    // One letter matches nearly everything: it filters, but only longer words are highlighted.
    const words = searchWords(state.q).filter((word) => word.length >= MIN_HIGHLIGHT);
    const visible = new Set<string>();
    for (const card of cards) {
      card.item.hidden = !matchesFilter(card, state, families);
      if (!card.item.hidden) visible.add(card.slug);
      highlight(card.titleNode, card.title, words);
      if (card.descriptionNode) highlight(card.descriptionNode, card.description ?? "", words);
      for (const node of card.tagNodes) {
        const tag = node.dataset.tag ?? "";
        const hit = state.tags.includes(tag) || (words.length > 0 && words.some((word) => normalize(tag).includes(word)));
        node.classList.toggle("is-match", hit);
      }
      // A selected tag that is one of the card's variants opens the tutorial in that variant.
      const chosen = card.variantLinks.find((link) => state.tags.includes(link.dataset.tag ?? ""));
      if (card.titleNode instanceof HTMLAnchorElement) card.titleNode.href = chosen?.href ?? card.titleNode.dataset.href ?? card.titleNode.href;
    }
    for (const list of document.querySelectorAll<HTMLElement>(".series-list")) {
      const empty = list.querySelector<HTMLElement>(".series-empty");
      if (empty) empty.hidden = list.querySelector(".series-card-item:not([hidden])") !== null;
    }
    if (level) level.value = state.level;
    if (count) count.textContent = countLabel(visible.size, total);
    if (clear) clear.hidden = isEmptyState(state);
    const passing = unique.filter((card) => matchesTextAndLevel(card, state));
    live = liveTagCounts(passing, counts.keys(), state.tags, families);
    updateTags();
    fit();
    const query = writeState(state, location.search);
    if (query !== location.search) history.replaceState(history.state, "", `${location.pathname}${query}${location.hash}`);
  };

  const suggest = () => {
    for (const item of search.querySelectorAll("calcite-autocomplete-item")) item.remove();
    const tags = suggestTags(search.inputValue, live, state.tags).filter((tag) => (live.get(tag) ?? 0) > 0);
    for (const tag of tags) {
      const item = document.createElement("calcite-autocomplete-item") as HTMLElement & { heading: string; value: string; label: string };
      item.heading = tag;
      item.value = tag;
      const n = live.get(tag) ?? 0;
      const family = families.get(tag);
      item.label = `Tag ${tag}${family ? `, ${family}` : ""}, ${n} ${n === 1 ? "tutorial" : "tutorials"}`;
      item.setAttribute("icon-start", "tag");
      // In a slot, not the description: Calcite highlights the typed text in the heading and description.
      const meta = document.createElement("span");
      meta.slot = "content-end";
      meta.className = "series-suggestion-meta";
      meta.textContent = [family, String(n)].filter(Boolean).join(" · ");
      item.append(meta);
      search.append(item);
    }
    search.open = tags.length > 0 && document.activeElement === search;
  };

  search.inputValue = state.q;
  // Typing waits for a pause; clicks apply at once.
  let typing: ReturnType<typeof setTimeout> | undefined;
  search.addEventListener("calciteAutocompleteTextInput", () => {
    clearTimeout(typing);
    typing = setTimeout(() => {
      state = { ...state, q: search.inputValue };
      render();
      suggest();
    }, TYPING_DELAY);
  });
  search.addEventListener("calciteAutocompleteChange", () => {
    const tag = search.value;
    if (!tag) return;
    // Picking a suggestion turns the typed text into a tag.
    state = { ...state, q: "", tags: state.tags.includes(tag) ? state.tags : [...state.tags, tag] };
    search.value = "";
    search.inputValue = "";
    search.open = false;
    clearTimeout(typing);
    render();
    suggest();
  });

  bar.addEventListener("click", (event) => {
    const toggle = (event.target as Element).closest<HTMLButtonElement>(".series-tag");
    const tag = toggle?.dataset.tag;
    if (!tag) return;
    state = { ...state, tags: state.tags.includes(tag) ? state.tags.filter((t) => t !== tag) : [...state.tags, tag] };
    render();
  });

  level?.addEventListener("calciteSelectChange", () => {
    state = { ...state, level: level.value };
    render();
  });

  clear?.addEventListener("click", () => {
    state = { q: "", tags: [], level: "" };
    search.inputValue = "";
    clearTimeout(typing);
    render();
    suggest();
  });

  const expand = (open: boolean) => {
    if (!top || !all) return;
    top.hidden = open;
    all.hidden = !open;
    more?.setAttribute("aria-expanded", String(open));
    if (open) all.querySelector<HTMLElement>(".series-tag")?.focus();
    else {
      fit();
      more?.focus();
    }
  };
  more?.addEventListener("click", () => expand(true));
  bar.querySelector("#series-fewer")?.addEventListener("click", () => expand(false));

  // "/" focuses the search, as on most docs sites.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.composedPath()[0])) return;
    event.preventDefault();
    void search.setFocus();
  });

  if (top) new ResizeObserver(() => fit()).observe(top);
  render();
}

function hidden(text: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "visually-hidden";
  span.textContent = text;
  return span;
}

/** Replaces `node`'s text with `text`, wrapping the matches of `words` in `<mark>`. */
function highlight(node: HTMLElement | null, text: string, words: readonly string[]): void {
  if (!node) return;
  const ranges = highlightRanges(text, words);
  if (ranges.length === 0) {
    if (node.querySelector("mark")) node.textContent = text;
    return;
  }
  const parts: Node[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(document.createTextNode(text.slice(at, start)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(start, end);
    parts.push(mark);
    at = end;
  }
  if (at < text.length) parts.push(document.createTextNode(text.slice(at)));
  node.replaceChildren(...parts);
}

function isEditable(target: EventTarget | undefined): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("calcite-autocomplete, calcite-input, calcite-select") !== null;
}
