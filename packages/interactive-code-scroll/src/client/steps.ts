import { carouselTarget, clampIndex, indexFromHash, isEditableTag, isMultilineTag, keyToDelta, movesStep, revealScroll, type RevealOptions } from "./navigation.ts";
import { forwardStepKeys, samePage } from "./embed.ts";
import { MEDIA_EVENT } from "./image-viewer.ts";
import { MAXIMIZE_EVENT } from "./maximize-values.ts";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./preview.ts";
import { DOCS_TOGGLE_EVENT } from "./presentation.ts";
import { setAction } from "./actions.ts";
import { fileChanges } from "./file-change-values.ts";
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

/** Duration of the code pane's entering transition (`ics-file-enter` in tutorial.css). */
const FILE_ENTER_MS = 180;

/** Interactive content inside a step keeps its clicks (they do not activate the step). */
const OWN_CLICKS = "a, button, input, textarea, select, [contenteditable], calcite-input, calcite-text-area, calcite-select, calcite-combobox, calcite-radio-button-group, calcite-switch, calcite-label, calcite-action, calcite-button";

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
  const intro = docs.querySelector<HTMLElement>(".intro");
  const hasIntro = !!intro;
  const codePanel = document.querySelector<HTMLElement>(".code-panel")!;
  const mediaPanel = document.querySelector<HTMLElement>(".media-panel")!;
  const progress = document.querySelector<HTMLElement>("#step-count");
  const progressBar = document.querySelector<HTMLElement & { value: number }>("#progress-bar");
  /** The intro's own `images=` / `embed=`. */
  const introMedia = intro?.querySelector<HTMLTemplateElement>(":scope > template.step-media") ?? null;
  // Nothing else to show next to the intro (no code tabs, Preview or Result pane): it borrows the first step media.
  const usesResult = allSteps.some((s) => s.dataset.output !== undefined || s.dataset.outputs !== undefined || s.dataset.requests !== undefined);
  const emptyPane = !document.querySelector(".code") && !document.querySelector("section.preview") && !usesResult;
  const mediaOf = (block: HTMLElement | undefined) => block?.querySelector<HTMLTemplateElement>(":scope > template.step-media") ?? null;
  const introPanel = () => introMedia ?? (emptyPane ? (steps.map(mediaOf).find((media) => media) ?? null) : null);

  /**
   * Applies to the Preview and to the Result pane, whichever the active variant shows. Both start
   * after the step engine, so the state on load is written here too (they miss the first event).
   */
  function setPreviewState(state: string | undefined): void {
    if (state !== "expanded" && state !== "collapsed") return;
    for (const [selector, toggle, label] of [
      [".preview-frame", "#preview-toggle", "Preview"],
      [".result-frame", "#result-toggle", "Result"],
    ] as const) {
      const frame = document.querySelector<HTMLElement>(selector);
      if (!frame) continue;
      frame.hidden = state === "collapsed";
      setAction(document.querySelector(toggle), frame.hidden ? "chevron-right" : "chevron-down", label);
    }
    document.dispatchEvent(new CustomEvent<PreviewState>(PREVIEW_STATE_EVENT, { detail: state }));
  }

  /** Pane state (`preview=`, `maximize=`) of a step or the intro, applied each time it becomes active. */
  function applyPaneState(block: HTMLElement | null): void {
    if (!block) return;
    setPreviewState(block.dataset.preview);
    // After the Preview state: maximizing the pane expands it; `none` restores the layout.
    if (block.dataset.maximize) document.dispatchEvent(new CustomEvent<string>(MAXIMIZE_EVENT, { detail: block.dataset.maximize }));
  }

  /** File the step (or the intro) shows in the active variant (`data-files` maps variant id → file). */
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

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // Screen readers hear a step's switch to another file (the step chip is decorative).
  const announcer = document.createElement("div");
  announcer.className = "file-announcer";
  announcer.setAttribute("aria-live", "polite");
  document.body.append(announcer);

  const tabTitle = (path: string) => document.querySelector<TabTitle>(`calcite-tab-title[data-file="${CSS.escape(path)}"]`);
  /** The file's tab label (relative to its variant folder). */
  const fileLabel = (path: string) => tabTitle(path)?.textContent?.trim() || path.split("/").at(-1)!;

  /** Replays a one-shot CSS transition (`data-entering`) on `element`. */
  function enter(element: HTMLElement): void {
    element.removeAttribute("data-entering");
    void element.offsetWidth;
    element.setAttribute("data-entering", "");
  }
  for (const element of [...$$(".code"), ...$$("calcite-tab-title[data-file]")]) {
    element.addEventListener("animationend", (event) => {
      if (event.target === element) element.removeAttribute("data-entering");
    });
  }

  /**
   * Shows file `path`. `announce`: a step switches to it, so the change stands out (pane and tab
   * transitions, live region). Returns whether another file was shown before.
   */
  function showFile(path: string, announce = false): boolean {
    const changed = document.querySelector<HTMLElement>(".code:not([hidden])")?.dataset.file !== path;
    for (const pane of $$(".code")) pane.hidden = pane.dataset.file !== path;
    for (const title of $$<TabTitle>("calcite-tab-title[data-file]")) title.selected = title.dataset.file === path;
    if (announce && changed) {
      const pane = document.querySelector<HTMLElement>(`.code[data-file="${CSS.escape(path)}"]`);
      const title = tabTitle(path);
      if (pane) enter(pane);
      if (title) enter(title);
      announcer.textContent = `Showing ${fileLabel(path)}`;
    }
    return changed;
  }

  // File tabs only: the Result pane has its own tab titles.
  for (const title of $$("calcite-tab-title[data-file]")) {
    title.addEventListener("calciteTabsActivate", () => showFile(title.dataset.file!));
  }

  /** File shown before the first step: the intro's, else the first tab of the active variant. */
  const firstFile = document.querySelector<HTMLElement>(".code:not([hidden])")?.dataset.file;
  function startFile(): string | undefined {
    const introFile = intro ? fileOf(intro) : undefined;
    if (introFile) return introFile;
    if (!variants) return firstFile;
    const { dir, entry } = variants.active();
    return `${dir}/${entry}`;
  }

  /** Marks, in reading order, the steps that switch to another file with a chip naming it. */
  function markFileChanges(): void {
    for (const chip of $$(".step-file", docs)) chip.remove();
    const files = steps.map((step) => (covers(step) && !mediaOf(step) ? fileOf(step) : undefined));
    fileChanges(files, startFile()).forEach((file, i) => {
      if (!file) return;
      const label = fileLabel(file);
      const chip = document.createElement("span");
      chip.className = "step-file";
      chip.title = `This step switches to ${label}`;
      chip.setAttribute("aria-hidden", "true");
      const icon = document.createElement("calcite-icon");
      icon.setAttribute("icon", "file-code");
      icon.setAttribute("scale", "s");
      chip.append(icon, label);
      const step = steps[i]!;
      const heading = step.querySelector(":scope > :is(h2, h3):first-child");
      if (heading) heading.append(chip);
      else step.prepend(chip);
    });
  }

  let current = -1;
  let atIntro = false;
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
    // Once per visit, like the pane state: re-rendering the same media would reload an embed.
    if (!atIntro) showPanel(introPanel());
    // Without `file=`, the intro keeps the current file.
    const introFile = !atIntro && intro ? fileOf(intro) : undefined;
    if (introFile) showFile(introFile);
    document.dispatchEvent(new CustomEvent<HTMLElement | null>(STEP_EVENT, { detail: null }));
    if (progress) progress.textContent = "";
    if (progressBar) progressBar.value = 0;
    if (location.hash) history.replaceState(null, "", `${location.pathname}${location.search}`);
    // Once per visit: scrolling at the top calls this again, and re-expanding reloads the Preview.
    if (!atIntro) applyPaneState(intro);
    atIntro = true;
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
    const embed = fragment.querySelector<HTMLIFrameElement>("iframe.step-embed");
    if (embed) {
      showEmbed(embed);
      return;
    }
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

  /** Another fragment of the page already shown (e.g. the next slide of a deck) navigates in place, without reloading it. */
  function showEmbed(embed: HTMLIFrameElement): void {
    const src = new URL(embed.getAttribute("src")!, location.href).href;
    const shown = mediaPanel.querySelector<HTMLIFrameElement>("iframe.step-embed");
    if (shown && samePage(shown.src, src)) {
      // The very same URL without a fragment would reload.
      if (shown.src !== src) shown.src = src;
      shown.title = embed.title;
    } else {
      forwardStepKeys(embed);
      mediaPanel.replaceChildren(embed);
    }
    announceMedia();
  }

  function mediaCount(): number {
    return mediaPanel.querySelectorAll("calcite-carousel-item").length;
  }

  /** Template whose media the panel shows (`null`: the code). */
  let shownMedia: HTMLTemplateElement | null = null;

  /** Shows a step's (or the intro's) media instead of code, at image `index`; `null` shows the code. */
  function showPanel(media: HTMLTemplateElement | null, index = 0): void {
    mediaPanel.hidden = !media;
    codePanel.hidden = !!media;
    // Already shown (the intro's fallback is the first step's media): no re-render, no embed reload.
    const count = mediaCount();
    if (media && media === shownMedia && (count === 0 || clampIndex(index, count) === mediaIndex)) return;
    shownMedia = media;
    if (media) {
      showMedia(media, index);
      return;
    }
    mediaPanel.replaceChildren();
    announceMedia();
  }

  /** `fromEnd`: entering backwards starts a carousel at its last image. */
  function activate(index: number, fromEnd = false): void {
    if (index === current || index < 0) return;
    current = index;
    atIntro = false;
    const step = steps[index]!;
    allSteps.forEach((s) => s.toggleAttribute("data-active", s === step));
    history.replaceState(null, "", `#${step.id}`);
    if (progress) progress.textContent = `Step ${index + 1} of ${steps.length}`;
    if (progressBar) progressBar.value = ((index + 1) / steps.length) * 100;
    applyPaneState(step);
    document.dispatchEvent(new CustomEvent<HTMLElement | null>(STEP_EVENT, { detail: step }));

    const media = mediaOf(step);
    showPanel(media, fromEnd ? Number.MAX_SAFE_INTEGER : 0);
    if (media) return;

    clearFocus();
    // A step for other variants keeps the current file, with no focus.
    const covered = covers(step);
    showNotice(covered ? undefined : step);
    if (!covered) return;

    const file = fileOf(step);
    const { region } = step.dataset;
    if (!file) return; // Text-only step: keep the current file.
    // Not while restoring a deep link: the reader did not move from another file.
    const switched = showFile(file, !restoring);
    const pane = document.querySelector<HTMLElement>(`.code[data-file="${CSS.escape(file)}"]`)!;
    pane.toggleAttribute("data-has-focus", !!region);
    if (!region) return;
    const lines = $$(`.line[data-regions~="${CSS.escape(region)}"]`, pane);
    lines.forEach((line) => line.setAttribute("data-focus", ""));
    // The whole region when it fits (else its start); no move when it is already in view.
    if (!lines.length) return;
    const scroll = () => reveal(pane, lines[0]!, lines.at(-1)!, { behavior: "smooth" });
    // One movement at a time: the new file fades in, then scrolls to the region.
    if (!switched || restoring || reduceMotion.matches) scroll();
    else setTimeout(() => current === index && scroll(), FILE_ENTER_MS);
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

  /** Step keys first page through the active step's (or the intro's own) carousel; true when they did. */
  function moveCarousel(delta: -1 | 1): boolean {
    const template = current < 0 ? (atIntro ? introMedia : null) : mediaOf(steps[current]);
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
    markFileChanges();
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
  markFileChanges();

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
