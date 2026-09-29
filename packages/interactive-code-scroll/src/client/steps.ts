import { carouselTarget, clampIndex, indexFromHash, isEditableTag, isMultilineTag, keyToDelta, movesStep, revealScroll, type RevealOptions } from "./navigation.ts";
import { MEDIA_EVENT } from "./image-viewer.ts";
import { MAXIMIZE_EVENT } from "./maximize-values.ts";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./preview.ts";
import { DOCS_TOGGLE_EVENT } from "./presentation.ts";
import { setAction } from "./actions.ts";
import { counterpartFile, coversVariant, listLabels, nearestVisible } from "./variant-values.ts";
import { VARIANT_EVENT, type VariantChange, type VariantsHandle } from "./variants.ts";

type TabTitle = HTMLElement & { selected: boolean };

/** Fired on every step change; detail: the active step, or `null` when none is (intro). */
export const STEP_EVENT = "ics:step";

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

export interface StepEngineOptions {
  variants?: VariantsHandle;
  /** How steps limited to other variants (`only=`) look: a notice in the code panel, or hidden. */
  otherVariantSteps?: "notice" | "hide";
}

export function startStepEngine({ variants, otherVariantSteps = "notice" }: StepEngineOptions = {}): StepEngine {
  const allSteps = $$("section.step");
  if (allSteps.length === 0) return { step: () => {} };
  const hideOthers = !!variants && otherVariantSteps === "hide";
  const covers = (step: HTMLElement) => !variants || coversVariant(step.dataset.only, variants.active().id);
  /** Steps the reader can reach: with `hide`, only those of the active variant (numbering follows them). */
  let steps = allSteps;
  function applyHidden(): void {
    if (!hideOthers) return;
    for (const step of allSteps) step.hidden = !covers(step);
    steps = allSteps.filter((step) => !step.hidden);
  }
  applyHidden();
  const firstStep = steps[0] ?? allSteps[0]!;

  const docs = firstStep.closest<HTMLElement>(".docs")!;
  const notice = document.querySelector<HTMLElement & { open: boolean }>("#variant-notice");
  const hasIntro = !!docs.querySelector(".intro");
  const codePanel = document.querySelector<HTMLElement>(".code-panel")!;
  const mediaPanel = document.querySelector<HTMLElement>(".media-panel")!;
  const progress = document.querySelector<HTMLElement>("#step-count");
  const progressBar = document.querySelector<HTMLElement & { value: number }>("#progress-bar");

  /** Applies to the Preview and to the Result pane, whichever the active variant shows. */
  function setPreviewState(state: string | undefined): void {
    if (state !== "expanded" && state !== "collapsed") return;
    const frame = document.querySelector<HTMLElement>(".preview-frame");
    if (frame) {
      frame.hidden = state === "collapsed";
      setAction(document.querySelector("#preview-toggle"), frame.hidden ? "chevron-right" : "chevron-down", "Preview");
    }
    document.dispatchEvent(new CustomEvent<PreviewState>(PREVIEW_STATE_EVENT, { detail: state }));
  }

  /** File the step shows in the active variant (`data-files` maps variant id → file). */
  function fileOf(step: HTMLElement): string | undefined {
    if (!variants) return step.dataset.file;
    const files = JSON.parse(step.dataset.files ?? "{}") as Record<string, string>;
    return files[variants.active().id];
  }

  /** With `notice`, a step for other variants says which ones and offers to switch. */
  function showNotice(step: HTMLElement | undefined): void {
    if (!notice) return;
    const ids = step?.dataset.only?.split(/\s+/).filter(Boolean) ?? [];
    const targets = variants!.list.filter((v) => ids.includes(v.id));
    notice.open = targets.length > 0;
    if (!notice.open) return;
    notice.querySelector("[slot=message]")!.textContent = `This step applies to ${listLabels(targets.map((v) => v.label))}.`;
    const link = notice.querySelector<HTMLElement>("[slot=link]")!;
    link.textContent = `Switch to ${targets[0]!.label}`;
    link.dataset.variant = targets[0]!.id;
  }
  notice?.querySelector("[slot=link]")?.addEventListener("click", (event) => {
    const id = (event.currentTarget as HTMLElement).dataset.variant;
    if (id) variants!.set(id);
  });

  function showFile(path: string): void {
    for (const pane of $$(".code")) pane.hidden = pane.dataset.file !== path;
    for (const title of $$<TabTitle>("calcite-tab-title[data-file]")) title.selected = title.dataset.file === path;
  }

  // File tabs only: the Result pane has its own tab titles.
  for (const title of $$("calcite-tab-title[data-file]")) {
    title.addEventListener("calciteTabsActivate", () => showFile(title.dataset.file!));
  }

  let current = -1;
  let mediaIndex = 0;

  function clearFocus(): void {
    for (const line of $$(".code .line[data-focus]")) line.removeAttribute("data-focus");
    for (const pane of $$(".code[data-has-focus]")) pane.removeAttribute("data-has-focus");
  }

  function clearActive(): void {
    current = -1;
    allSteps.forEach((s) => s.removeAttribute("data-active"));
    clearFocus();
    showNotice(undefined);
    mediaPanel.hidden = true;
    codePanel.hidden = false;
    mediaPanel.replaceChildren();
    announceMedia();
    document.dispatchEvent(new CustomEvent<HTMLElement | null>(STEP_EVENT, { detail: null }));
    if (progress) progress.textContent = "";
    if (progressBar) progressBar.value = 0;
    if (location.hash) history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  function goToIntro(behavior: ScrollBehavior): void {
    userNavigated = true;
    userScrolling = false;
    keyTarget = undefined;
    clearTimeout(keyTargetTimer);
    docs.scrollTo({ top: 0, behavior });
    clearActive();
  }

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
    if (index === current || index < 0) return;
    current = index;
    const step = steps[index]!;
    allSteps.forEach((s) => s.toggleAttribute("data-active", s === step));
    history.replaceState(null, "", `#${step.id}`);
    if (progress) progress.textContent = `Step ${index + 1} of ${steps.length}`;
    if (progressBar) progressBar.value = ((index + 1) / steps.length) * 100;
    setPreviewState(step.dataset.preview);
    // After the Preview state: maximizing the pane expands it; `none` restores the layout.
    if (step.dataset.maximize) document.dispatchEvent(new CustomEvent<string>(MAXIMIZE_EVENT, { detail: step.dataset.maximize }));
    document.dispatchEvent(new CustomEvent<HTMLElement | null>(STEP_EVENT, { detail: step }));

    const media = step.querySelector<HTMLTemplateElement>("template.step-media");
    mediaPanel.hidden = !media;
    codePanel.hidden = !!media;
    if (media) {
      showMedia(media, fromEnd ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    mediaPanel.replaceChildren();
    announceMedia();

    clearFocus();
    // A step for other variants keeps the current file, with no focus.
    const covered = covers(step);
    showNotice(covered ? undefined : step);
    if (!covered) return;

    const file = fileOf(step);
    const { region } = step.dataset;
    if (!file) return; // Text-only step: keep the current file.
    showFile(file);
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
      if (hasIntro && userScrolling && docs.scrollTop <= 1) {
        clearActive();
        return;
      }
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
  allSteps.forEach((step) => observer.observe(step));

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
    if (current < 0 && delta < 0) return;
    if (hasIntro && current === 0 && delta < 0) {
      goToIntro("smooth");
      return;
    }
    goTo(clampIndex(current + delta, steps.length), { fromEnd: delta < 0 });
  }

  // Keyboard / presentation clicker. Capture phase so the carousel does not also handle the key.
  addEventListener(
    "keydown",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target : undefined;
      // Fields, and widgets marked `data-own-keys` (e.g. the splitter), keep their arrow keys;
      // clicker keys move steps from everywhere but multi-line text.
      const focus = {
        editable: !!target && isEditableTag(target.tagName, target.isContentEditable),
        multiline: !!target && isMultilineTag(target.tagName, target.isContentEditable),
        ownsArrows: !!target?.closest("[data-own-keys]"),
      };
      const delta = keyToDelta(event.key);
      if (!delta || !movesStep(event.key, focus) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      step(delta);
    },
    { capture: true },
  );

  /** Re-centers the active step after a layout change; the observer may not switch steps meanwhile. */
  function keepActiveCentered(): void {
    if (current < 0) return;
    keyTarget = current;
    clearTimeout(keyTargetTimer);
    keyTargetTimer = setTimeout(endKeyScroll, 1500);
    showStep(current, true, "auto");
  }

  // Explanations shown again: bring the active step's text back to the center line.
  document.addEventListener(DOCS_TOGGLE_EVENT, (event) => {
    if (!(event as CustomEvent<{ hidden: boolean }>).detail.hidden) keepActiveCentered();
  });

  // Resizing the explanations (splitter, window) reflows their text: keep the active step, never switch.
  let docsWidth = docs.clientWidth;
  new ResizeObserver(() => {
    if (docs.clientWidth === docsWidth) return;
    docsWidth = docs.clientWidth;
    if (!restoring && docsWidth > 0) keepActiveCentered();
  }).observe(docs);

  // Clicking a step activates it (short steps and the first ones may never cross the center line).
  docs.addEventListener("click", (event) => {
    const target = event.target as Element;
    const step = target.closest<HTMLElement>("section.step");
    if (!step || target.closest(OWN_CLICKS) || getSelection()?.toString()) return;
    goTo(steps.indexOf(step), { center: false });
  });

  // Back at the top, intro tutorials clear the active step; otherwise the first step is active again
  // (it cannot reach the center line there).
  // Only for scrolling done by the user: a key/click scroll towards an early step also ends at 0.
  let userScrolling = false;
  for (const type of ["wheel", "touchmove", "pointerdown"]) {
    docs.addEventListener(type, () => (userScrolling = true), { passive: true });
  }
  docs.addEventListener(
    "scroll",
    () => {
      if (!userScrolling || restoring || docs.scrollTop > 1) return;
      if (hasIntro) clearActive();
      else activate(0);
    },
    { passive: true },
  );

  // In-page #step-id links: center the step (native anchor scrolling would align its top).
  addEventListener("hashchange", () => {
    revealHashStep();
    const index = steps.findIndex((s) => `#${s.id}` === location.hash);
    if (index >= 0) goTo(index);
  });

  // Just enough room below the last step for it to reach the center line (no fixed blank tail).
  const last = allSteps.at(-1)!;
  const tail = new ResizeObserver(() => {
    docs.style.setProperty("--tail", `${Math.max(docs.clientHeight / 2 - last.offsetHeight / 2, 32)}px`);
  });
  tail.observe(docs);
  tail.observe(last);

  // Switching variants keeps the step (or the nearest earlier one still shown) and moves the
  // focus to the same region in the new variant; text-only steps keep the matching file.
  const tabs = new Set($$(".code").map((pane) => pane.dataset.file!));
  document.addEventListener(VARIANT_EVENT, (event) => {
    const { from, to } = (event as CustomEvent<VariantChange>).detail;
    const active = allSteps.find((s) => s.hasAttribute("data-active"));
    const shown = document.querySelector<HTMLElement>(".code:not([hidden])")?.dataset.file;
    applyHidden();
    showFile(counterpartFile(shown, from, to, tabs));
    if (!active || steps.length === 0) return;
    current = -1;
    activate(nearestVisible(allSteps, steps, active));
    keepActiveCentered();
  });

  /** With `hide`, a link to a step of another variant switches to the step's first variant. */
  function revealHashStep(): void {
    if (!hideOthers) return;
    const target = allSteps.find((s) => `#${s.id}` === decodeURIComponent(location.hash));
    const id = target?.hidden ? target.dataset.only?.split(/\s+/)[0] : undefined;
    if (id) variants!.set(id);
  }

  if (variants) {
    const { dir, entry } = variants.active();
    showFile(`${dir}/${entry}`);
    revealHashStep();
  }

  // Deep link: activate now and keep the step centered while the layout settles (Calcite
  // components render late, after fetching their translations), until the user takes over.
  const stepIds = steps.map((s) => s.id);
  const hashIndex = indexFromHash(stepIds, location.hash);
  const hasInitialStep = !hasIntro || stepIds.includes(decodeURIComponent(location.hash.replace(/^#/, "")));
  if (hasInitialStep) activate(hashIndex);
  else clearActive();
  const settle = new ResizeObserver(() => {
    if (hasInitialStep && !userNavigated) showStep(hashIndex, true, "auto");
  });
  for (const el of [docs, ...allSteps]) settle.observe(el);
  const takeOver = () => {
    settle.disconnect();
    restoring = false;
    for (const type of TAKE_OVER_EVENTS) removeEventListener(type, takeOver, true);
  };
  for (const type of TAKE_OVER_EVENTS) addEventListener(type, takeOver, { capture: true, passive: true });
  return { step };
}
