import { carouselTarget, clampIndex, indexFromHash, isEditableTag, keyToDelta } from "./navigation.ts";
import { DOCS_TOGGLE_EVENT } from "./presentation.ts";

type TabTitle = HTMLElement & { selected: boolean };

const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(selector),
];

/** Scroll/keyboard-driven steps: active step → file, region focus, images, hash and progress. */
export interface StepEngine {
  step(delta: -1 | 1): void;
}

/**
 * Resolves when each Calcite component on the page has rendered once. `whenDefined` is
 * not enough: components wait for their translations (t9n) before the first render.
 */
function calciteRendered(): Promise<unknown>[] {
  return [...document.querySelectorAll("*")]
    .filter((el) => el.localName.startsWith("calcite-"))
    .map((el) =>
      customElements
        .whenDefined(el.localName)
        .then(() => (el as Element & { componentOnReady?(): Promise<unknown> }).componentOnReady?.())
        .catch(() => {}),
    );
}

export function startStepEngine(): StepEngine {
  const steps = $$("section.step");
  if (steps.length === 0) return { step: () => {} };

  const codePanel = document.querySelector<HTMLElement>(".code-panel")!;
  const mediaPanel = document.querySelector<HTMLElement>(".media-panel")!;
  const progress = document.querySelector<HTMLElement>("#step-count");
  const progressBar = document.querySelector<HTMLElement & { value: number }>("#progress-bar");

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
    if (progressBar) progressBar.value = ((index + 1) / steps.length) * 100;

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

  // The active step is the one crossing the center line of the docs panel (its own scroller).
  let restoring = true;
  let userNavigated = false;
  // A key-driven smooth scroll passes over other steps: until it reaches its target,
  // the observer may only confirm that target (a timer covers interrupted scrolls).
  let keyTarget: number | undefined;
  let keyTargetTimer: ReturnType<typeof setTimeout> | undefined;
  const endKeyScroll = () => {
    keyTarget = undefined;
    clearTimeout(keyTargetTimer);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (restoring) return;
      const entering = entries.find((e) => e.isIntersecting);
      if (!entering) return;
      const index = steps.indexOf(entering.target as HTMLElement);
      if (keyTarget !== undefined) {
        if (index === keyTarget) endKeyScroll();
        return;
      }
      activate(index);
    },
    { root: steps[0]!.closest(".docs"), rootMargin: "-50% 0px -50% 0px" },
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

  /** Centers step `index` with a smooth scroll and activates it right away. */
  function goTo(index: number, fromEnd = false): void {
    userNavigated = true;
    keyTarget = index;
    clearTimeout(keyTargetTimer);
    keyTargetTimer = setTimeout(endKeyScroll, 1500);
    steps[index]!.scrollIntoView({ block: "center", behavior: "smooth" });
    activate(index, fromEnd);
  }

  /** Moves one step (or one carousel image) forwards/backwards, with snapping. */
  function step(delta: -1 | 1): void {
    if (moveCarousel(delta)) return;
    goTo(clampIndex(current + delta, steps.length), delta < 0);
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

  // Explanations shown again: bring the active step's text back to the center line.
  document.addEventListener(DOCS_TOGGLE_EVENT, (event) => {
    if ((event as CustomEvent<{ hidden: boolean }>).detail.hidden || current < 0) return;
    keyTarget = current;
    clearTimeout(keyTargetTimer);
    keyTargetTimer = setTimeout(endKeyScroll, 1500);
    steps[current]!.scrollIntoView({ block: "center" });
  });

  // In-page #step-id links: center the step (native anchor scrolling would align its top).
  addEventListener("hashchange", () => {
    const index = steps.findIndex((s) => `#${s.id}` === location.hash);
    if (index >= 0) goTo(index);
  });

  // Deep link: activate now, scroll once Calcite has rendered (first render changes step heights).
  const initial = indexFromHash(
    steps.map((s) => s.id),
    location.hash,
  );
  activate(initial);
  // Capped: a component that never renders must not leave the engine stuck in `restoring`.
  const settled = Promise.all([...calciteRendered(), document.fonts.ready]);
  void Promise.race([settled, new Promise((resolve) => setTimeout(resolve, 3000))]).then(() =>
    requestAnimationFrame(() => {
      // Keys pressed before hydration finished win over the deep link.
      if (!userNavigated) steps[initial]!.scrollIntoView({ block: "center" });
      restoring = false;
    }),
  );
  return { step };
}
