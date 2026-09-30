// Public `interactive-code-scroll/series` module: what a custom series index page (the `index`
// integration option) reads and renders. Only usable in a series site's pages.
import { tutorials as allTutorials } from "virtual:interactive-code-scroll/tutorial";
import type { SeriesCard } from "./series.ts";
import { seriesCards } from "./tutorial-data.ts";

export { default as TutorialFilter } from "./components/TutorialFilter.astro";
export { default as TutorialList } from "./components/TutorialList.astro";
export type { SeriesCard } from "./series.ts";

/** Every tutorial of the series in index order (`order`, then title), with its URL and metadata. */
export const tutorials: SeriesCard[] = seriesCards(allTutorials, import.meta.env.BASE_URL);
