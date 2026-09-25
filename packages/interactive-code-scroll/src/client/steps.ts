import { carouselTarget, clampIndex, indexFromHash, isEditableTag, keyToDelta, revealScroll, type RevealOptions } from "./navigation.ts";
import { MEDIA_EVENT } from "./image-viewer.ts";
import { DOCS_TOGGLE_EVENT } from "./presentation.ts";

type TabTitle = HTMLElement & { selected: boolean };

const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(selector),
];

/** Scroll/keyboard-driven steps: active step → file, region focus, images, hash and progress. */
export interface StepEngine {
  step(delta: -1 | 1): void;
}

/** Scrolls `container` so that `first`…`last` are visible (see `revealScroll`). */
function reveal(
  container: HTMLElement,
  first: Element,
  last: Element,
  options: RevealOptions & { behavior?: ScrollBehavior } = {},
): void {
  const box = container.getBoundingClientRect();
  const top = first.getBoundingClientRect().top - box.top + container.scrollTop;
  const bottom = last.getBoundingClientRect().bottom - box.top + container.scrollTop;
  const target = revealScroll(top, bottom, container.scrollTop, container.clientHeight, options);
  if (target !== undefined) container.scrollTo({ top: target, behavior: options.behavior ?? "auto" });
}

/** Interactive content inside a step keeps its clicks (they do not activate the step). */
const OWN_CLICKS = "a, button, input, textarea, select, [contenteditable], calcite-input, calcite-action, calcite-button";

/** User input that ends the deep-link restore (programmatic scrolling fires none of these). */
const TAKE_OVER_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

export function startStepEngine(): StepEngine {
  const steps = $$("section.step");
  if (steps.length === 0) return { step: () => {} };

  const docs = steps[0]!.closest<HTMLElement>(".docs")!;
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
  function announceMedia(): void {
    const image = mediaPanel.querySelectorAll<HTMLImageElement>(".step-image")[mediaIndex] ?? null;
    document.dispatchEvent(new CustomEvent(MEDIA_EVENT, { detail: mediaPanel.hidden ? null : image }));
  }

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
      announceMedia();
    });
    mediaPanel.replaceChildren(fragment);
    announceMedia();
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
    announceMedia();

    const { file, region } = step.dataset;
    if (!file) return; // Text-only step: keep the current file.
    showFile(file);
    for (const line of $$(".code .line[data-focus]")) line.removeAttribute("data-focus");
    const pane = document.querySelector<HTMLElement>(`.code[data-file="${CSS.escape(file)}"]`)!;
    pane.toggleAttribute("data-has-focus", !!region);
    if (!region) return;
    const lines = $$(`.line[data-regions~="${CSS.escape(region)}"]`, pane);
    lines.forEach((line) => line.setAttribute("data-focus", ""));
    // The whole region when it fits (else its start); no move when it is already in view.
    if (lines.length) reveal(pane, lines[0]!, lines.at(-1)!, { behavior: "smooth" });
  }

  // The active step is the one crossing the center line of the docs panel (its own scroller).
  // Scroll-driven activation starts once the user takes over from the deep-link restore.
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
    { root: docs, rootMargin: "-50% 0px -50% 0px" },
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

  /** Brings step `index` into view (centered for keys, only if needed for clicks). */
  function showStep(index: number, center: boolean, behavior: ScrollBehavior): void {
    reveal(docs, steps[index]!, steps[index]!, { center, behavior });
  }

  /** Scrolls to step `index` (smoothly) and activates it right away. */
  function goTo(index: number, { fromEnd = false, center = true } = {}): void {
    userNavigated = true;
    userScrolling = false;
    keyTarget = index;
    clearTimeout(keyTargetTimer);
    keyTargetTimer = setTimeout(endKeyScroll, 1500);
    showStep(index, center, "smooth");
    activate(index, fromEnd);
  }

  /** Moves one step (or one carousel image) forwards/backwards, with snapping. */
  function step(delta: -1 | 1): void {
    if (moveCarousel(delta)) return;
    goTo(clampIndex(current + delta, steps.length), { fromEnd: delta < 0 });
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
    showStep(current, true, "auto");
  });

  // Clicking a step activates it (short steps and the first ones may never cross the center line).
  docs.addEventListener("click", (event) => {
    const target = event.target as Element;
    const step = target.closest<HTMLElement>("section.step");
    if (!step || target.closest(OWN_CLICKS) || getSelection()?.toString()) return;
    goTo(steps.indexOf(step), { center: false });
  });

  // Back at the top, the first step is active again (it cannot reach the center line there).
  // Only for scrolling done by the user: a key/click scroll towards an early step also ends at 0.
  let userScrolling = false;
  for (const type of ["wheel", "touchmove", "pointerdown"]) {
    docs.addEventListener(type, () => (userScrolling = true), { passive: true });
  }
  docs.addEventListener(
    "scroll",
    () => {
      if (userScrolling && !restoring && docs.scrollTop <= 0) activate(0);
    },
    { passive: true },
  );

  // In-page #step-id links: center the step (native anchor scrolling would align its top).
  addEventListener("hashchange", () => {
    const index = steps.findIndex((s) => `#${s.id}` === location.hash);
    if (index >= 0) goTo(index);
  });

  // Just enough room below the last step for it to reach the center line (no fixed blank tail).
  const last = steps.at(-1)!;
  const tail = new ResizeObserver(() => {
    docs.style.setProperty("--tail", `${Math.max(docs.clientHeight / 2 - last.offsetHeight / 2, 32)}px`);
  });
  tail.observe(docs);
  tail.observe(last);

  // Deep link: activate now and keep the step centered while the layout settles (Calcite
  // components render late, after fetching their translations), until the user takes over.
  const initial = indexFromHash(
    steps.map((s) => s.id),
    location.hash,
  );
  activate(initial);
  const settle = new ResizeObserver(() => {
    if (!userNavigated) showStep(initial, true, "auto");
  });
  for (const el of [docs, ...steps]) settle.observe(el);
  const takeOver = () => {
    settle.disconnect();
    restoring = false;
    for (const type of TAKE_OVER_EVENTS) removeEventListener(type, takeOver, true);
  };
  for (const type of TAKE_OVER_EVENTS) addEventListener(type, takeOver, { capture: true, passive: true });
  return { step };
}
