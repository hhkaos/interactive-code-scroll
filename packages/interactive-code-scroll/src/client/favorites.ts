import { setTooltip } from "./actions.ts";
import { favoritesKey, readFavorites, toggleFavorite } from "./favorites-values.ts";

type Icon = HTMLElement & { icon: string };

/**
 * `<TutorialFavorites>`: adds a favorite toggle to every card on the page and shows the favorite
 * tutorials in its section, stored per browser and site. The search bar hides filtered cards
 * (`hidden`) in every section; the section hides when no favorite is left visible.
 */
export function startFavorites(): void {
  const section = document.querySelector<HTMLElement>(".series-favorites");
  const list = section?.querySelector<HTMLElement>(".series-cards");
  if (!section || !list) return;
  const key = favoritesKey(section.dataset.base ?? "/");
  const items = [...list.querySelectorAll<HTMLElement>(".series-card-item")];
  const known = new Set(items.map((item) => item.dataset.slug ?? ""));
  const heading = section.querySelector<HTMLElement>(".series-favorites-title");
  const count = section.querySelector<HTMLElement>(".series-favorites-count");

  const load = () => {
    try {
      return readFavorites(localStorage.getItem(key), known);
    } catch {
      return [];
    }
  };
  let favorites = load();

  const toggles = [...document.querySelectorAll<HTMLElement>(".series-card-item")].flatMap((item) => {
    const card = item.querySelector(".series-card");
    const slug = item.dataset.slug ?? "";
    if (!card || !known.has(slug)) return [];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "series-card-favorite";
    // A fixed name with a pressed state; the title tells the cards apart.
    button.setAttribute("aria-label", `Favorite: ${item.querySelector(".series-card-title")?.textContent ?? slug}`);
    const icon = document.createElement("calcite-icon") as Icon;
    icon.setAttribute("scale", "s");
    icon.setAttribute("aria-hidden", "true");
    button.append(icon);
    button.addEventListener("click", () => {
      favorites = toggleFavorite(favorites, slug);
      try {
        localStorage.setItem(key, JSON.stringify(favorites));
      } catch {
        // Blocked storage: the choice lasts until the page is left.
      }
      update();
      // Removed from the section: focus would be lost with the card.
      if (list.contains(button) && !favorites.includes(slug)) heading?.focus();
    });
    card.append(button);
    return [{ button, icon, slug }];
  });

  const updateSection = () => {
    const visible = items.filter((item) => item.classList.contains("is-favorite") && !item.hidden).length;
    if (section.hidden !== (visible === 0)) section.hidden = visible === 0;
    if (count) count.textContent = String(visible);
  };

  const update = () => {
    for (const { button, icon, slug } of toggles) {
      const on = favorites.includes(slug);
      button.setAttribute("aria-pressed", String(on));
      icon.icon = on ? "star-f" : "star";
      setTooltip(button, on ? "Remove from favorites" : "Add to favorites");
    }
    for (const item of items) item.classList.toggle("is-favorite", favorites.includes(item.dataset.slug ?? ""));
    updateSection();
  };

  // The search bar shows and hides cards: follow it.
  new MutationObserver(updateSection).observe(list, { subtree: true, attributeFilter: ["hidden"] });
  // Another tab changed them.
  addEventListener("storage", (event) => {
    if (event.key !== key) return;
    favorites = load();
    update();
  });
  update();
}
