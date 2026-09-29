import { countLabel, matchesTags } from "./series-values.ts";

type ChipGroup = HTMLElement & { selectedItems: (HTMLElement & { value: string })[] };

/**
 * Tag filter of the series index: hides the cards of every `<TutorialList>` that have none of the
 * selected tags. Without JavaScript every card stays visible.
 */
export function startSeriesFilter(): void {
  const group = document.querySelector<ChipGroup>("#series-filter");
  const count = document.querySelector<HTMLElement>("#series-count");
  if (!group) return;
  const cards = [...document.querySelectorAll<HTMLElement>(".series-card-item")].map((item) => ({
    item,
    slug: item.dataset.slug ?? "",
    tags: JSON.parse(item.dataset.tags ?? "[]") as string[],
  }));
  // Sections may list a tutorial twice: the count is of tutorials, not cards.
  const total = new Set(cards.map((card) => card.slug)).size;
  const apply = () => {
    const selected = group.selectedItems.map((chip) => chip.value);
    const visible = new Set<string>();
    for (const { item, slug, tags } of cards) {
      item.hidden = !matchesTags(tags, selected);
      if (!item.hidden) visible.add(slug);
    }
    for (const list of document.querySelectorAll<HTMLElement>(".series-list")) {
      const empty = list.querySelector<HTMLElement>(".series-empty");
      if (empty) empty.hidden = list.querySelector(".series-card-item:not([hidden])") !== null;
    }
    if (count) count.textContent = countLabel(visible.size, total);
  };
  group.addEventListener("calciteChipGroupSelect", apply);
  apply();
}
