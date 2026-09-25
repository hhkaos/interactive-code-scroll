import { carouselTarget, clampIndex, indexFromHash, isEditableTag, keyToDelta } from "./navigation.ts";

type TabTitle = HTMLElement & { selected: boolean };

const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(selector),
];

/** Scroll/keyboard-driven steps: active step → file, region focus, images, hash and progress. */
export interface StepEngine {
  step(delta: -1 | 1): void;
}

export function startStepEngine(): StepEngine {
  const steps = $$("section.step");
  if (steps.length === 0) return { step: () => {} };

  const codePanel = document.querySelector<HTMLElement>(".code-panel")!;
  const mediaPanel = document.querySelector<HTMLElement>(".media-panel")!;
  const progress = document.querySelector<HTMLElement>(".progress");
  const progressBar = document.querySelector<HTMLElement>(".progress-bar");

  function showFile(path: string): void {
    for (const pane of $$(".code")) pane.hidden = pane.dataset.file !== path;
    for (const title of $$<TabTitle>("calcite-tab-title")) title.selected = title.dataset.file === path;
  }

  for (const title of $$("calcite-tab-title")) {
    title.addEventListener("calciteTabsActivate", () => showFile(title.dataset.file!));
  }

  let current = -1;
  let mediaIndex = 0;

  /**
   * Renders the step's carousel with image `index` selected. Calcite only honours
   * `selected` when items are created (setting it later does not move the carousel),
   * so each change re-creates the carousel from the step's template.
   */
  function showMedia(template: HTMLTemplateElement, index: number): void {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const items = [...fragment.querySelectorAll("calcite-carousel-item")];
    mediaIndex = clampIndex(index, items.length);
    items.forEach((item, i) => item.toggleAttribute("selected", i === mediaIndex));
    const carousel = fragment.querySelector("calcite-carousel")!;
    // Keep in sync when the user drives the carousel with its own controls.
    carousel.addEventListener("calciteCarouselChange", () => {
      const selected = (carousel as HTMLElement & { selectedItem?: Element }).selectedItem;
      if (selected) mediaIndex = [...carousel.querySelectorAll("calcite-carousel-item")].findIndex((item) => item === selected);
    });
    mediaPanel.replaceChildren(fragment);
  }

  function mediaCount(): number {
    return mediaPanel.querySelectorAll("calcite-carousel-item").length;
  }

  /** `fromEnd`: entering backwards starts a carousel at its last image. */
  function activate(index: number, fromEnd = false): void {
    if (index === current) return;
    current = index;
    const step = steps[index]!;
    steps.forEach((s, i) => s.toggleAttribute("data-active", i === index));
    history.replaceState(null, "", `#${step.id}`);
    if (progress) progress.textContent = `Step ${index + 1} of ${steps.length}`;
    progressBar?.style.setProperty("--progress", String((index + 1) / steps.length));

    const media = step.querySelector<HTMLTemplateElement>("template.step-media");
    mediaPanel.hidden = !media;
    codePanel.hidden = !!media;
    if (media) {
      showMedia(media, fromEnd ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    mediaPanel.replaceChildren();

    const { file, region } = step.dataset;
    if (!file) return; // Text-only step: keep the current file.
    showFile(file);
    for (const line of $$(".code .line[data-focus]")) line.removeAttribute("data-focus");
    const pane = document.querySelector<HTMLElement>(`.code[data-file="${CSS.escape(file)}"]`)!;
    pane.toggleAttribute("data-has-focus", !!region);
    if (!region) return;
    const lines = $$(`.line[data-regions~="${CSS.escape(region)}"]`, pane);
    lines.forEach((line) => line.setAttribute("data-focus", ""));
    lines[0]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // The active step is the one crossing the viewport's center line.
  let restoring = true;
  // A key-driven smooth scroll passes over other steps; the observer must not re-activate them.
  let keyScrolling = false;
  let keyScrollTimer: ReturnType<typeof setTimeout> | undefined;
  const endKeyScroll = () => {
    keyScrolling = false;
    clearTimeout(keyScrollTimer);
  };
  addEventListener("scrollend", endKeyScroll);
  const observer = new IntersectionObserver(
    (entries) => {
      if (restoring || keyScrolling) return;
      const entering = entries.find((e) => e.isIntersecting);
      if (entering) activate(steps.indexOf(entering.target as HTMLElement));
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  steps.forEach((step) => observer.observe(step));

  /** Step keys first page through the active step's carousel; true when they did. */
  function moveCarousel(delta: -1 | 1): boolean {
    const template = steps[current]?.querySelector<HTMLTemplateElement>("template.step-media");
    if (!template) return false;
    const target = carouselTarget(mediaIndex, mediaCount(), delta);
    if (target === undefined) return false;
    showMedia(template, target);
    return true;
  }

  /** Moves one step (or one carousel image) forwards/backwards, with snapping. */
  function step(delta: -1 | 1): void {
    if (moveCarousel(delta)) return;
    const next = clampIndex(current + delta, steps.length);
    keyScrolling = true;
    clearTimeout(keyScrollTimer);
    keyScrollTimer = setTimeout(endKeyScroll, 1000); // Fallback where `scrollend` is unsupported.
    steps[next]!.scrollIntoView({ block: "center", behavior: "smooth" });
    activate(next, delta < 0);
  }

  // Keyboard / presentation clicker. Capture phase so the carousel does not also handle the key.
  addEventListener(
    "keydown",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target : undefined;
      // Fields, and widgets marked `data-own-keys` (e.g. the splitter), keep their keys.
      if (target && (isEditableTag(target.tagName, target.isContentEditable) || target.closest("[data-own-keys]"))) return;
      const delta = keyToDelta(event.key);
      if (!delta || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      step(delta);
    },
    { capture: true },
  );

  // Deep link: activate now, scroll once Calcite has hydrated (hydration changes step heights).
  const initial = indexFromHash(
    steps.map((s) => s.id),
    location.hash,
  );
  activate(initial);
  void Promise.all([
    ...["calcite-input", "calcite-label", "calcite-button"].map((tag) => customElements.whenDefined(tag)),
    document.fonts.ready,
  ]).then(() =>
    requestAnimationFrame(() => {
      steps[initial]!.scrollIntoView({ block: "center" });
      restoring = false;
    }),
  );
  return { step };
}
