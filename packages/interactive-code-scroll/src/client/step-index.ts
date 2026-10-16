import { indexEntries, indexHeading, type IndexStep } from "./step-index-values.ts";
import { shortcutFor } from "./presentation.ts";
import { PROGRESS_EVENT, type StepEngine, type StepProgress } from "./steps.ts";
import type { VariantsHandle } from "./variants.ts";

/** Gap between the trigger and the list, and the list's minimum margin to the window edges (px). */
const GAP = 8;

/** The step's heading text, without the file chip the step engine adds to it. */
function headingText(step: HTMLElement): string {
  const heading = step.querySelector(":scope > :is(h2, h3):first-child");
  if (!heading) return "";
  const copy = heading.cloneNode(true) as HTMLElement;
  for (const chip of copy.querySelectorAll(".step-file")) chip.remove();
  return copy.textContent ?? "";
}

function stepIndexOpen(): boolean {
  return !!document.querySelector("#step-index:popover-open");
}

/** Steps each list's items were built for: the same steps are updated in place (no replayed entrance). */
const builtFor = new WeakMap<HTMLOListElement, readonly HTMLElement[]>();

function build(list: HTMLOListElement, steps: readonly HTMLElement[]): void {
  builtFor.set(list, steps);
  list.replaceChildren(
    ...steps.map((step, i) => {
      const item = document.createElement("li");
      item.style.setProperty("--i", String(Math.min(i, 12)));
      const link = document.createElement("a");
      link.href = `#${step.id}`;
      link.dataset.index = String(i);
      const mark = document.createElement("span");
      mark.className = "step-index-mark";
      mark.setAttribute("aria-hidden", "true");
      const title = document.createElement("span");
      title.className = "step-index-title";
      link.append(mark, title);
      item.append(link);
      return item;
    }),
  );
}

/** Fills `list` with the reachable steps: number or check, heading, other-variant labels, the current one marked. */
function renderList(list: HTMLOListElement, state: StepProgress, variants?: VariantsHandle): void {
  const steps: IndexStep[] = state.steps.map((step) => ({ title: headingText(step), only: step.dataset.only }));
  const variant = variants && {
    active: variants.active().id,
    labels: Object.fromEntries(variants.list.map((v) => [v.id, v.label])),
  };
  const entries = indexEntries({ steps, current: state.current, completed: state.completed, variant });
  const built = builtFor.get(list);
  if (!built || built.length !== state.steps.length || built.some((step, i) => step !== state.steps[i])) build(list, state.steps);
  entries.forEach((entry, i) => {
    const link = list.children[i]!.firstElementChild as HTMLAnchorElement;
    link.dataset.state = entry.state;
    link.toggleAttribute("data-other-variants", !!entry.otherVariants);
    if (entry.state === "current") link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
    const mark = link.querySelector<HTMLElement>(".step-index-mark")!;
    if (entry.state === "seen") {
      if (!mark.querySelector("calcite-icon")) {
        const icon = document.createElement("calcite-icon");
        icon.setAttribute("icon", "check");
        icon.setAttribute("scale", "s");
        mark.replaceChildren(icon);
      }
    } else mark.textContent = String(entry.number);
    const title = link.querySelector<HTMLElement>(".step-index-title")!;
    title.textContent = entry.title;
    if (entry.otherVariants) {
      const note = document.createElement("span");
      note.className = "step-index-variants";
      note.textContent = `For ${entry.otherVariants}`;
      title.append(note);
    }
    if (entry.state === "seen") {
      const done = document.createElement("span");
      done.className = "visually-hidden";
      done.textContent = " (done)";
      title.append(done);
    }
  });
}

/** An outline in the code area (`outline` on <Intro> / <Step>): a "Steps" heading over the same list. */
function renderOutline(outline: HTMLElement, state: StepProgress, variants?: VariantsHandle): void {
  let list = outline.querySelector<HTMLOListElement>(".step-index-list");
  if (!list) {
    const heading = document.createElement("p");
    heading.className = "step-outline-heading";
    heading.id = "step-outline-heading";
    heading.textContent = "Steps";
    list = document.createElement("ol");
    list.className = "step-index-list";
    list.setAttribute("aria-labelledby", heading.id);
    outline.replaceChildren(heading, list);
  }
  renderList(list, state, variants);
  fitOutline(outline);
}

/** Widest column count of the outline, and each column's minimum width (rem). */
const MAX_COLUMNS = 4;
const COLUMN_REM = 14;

/** Lays the outline's list out in as many columns as it needs to fit the pane's height (the pane may be half the code area). */
function fitOutline(outline: HTMLElement): void {
  const list = outline.querySelector<HTMLOListElement>(".step-index-list");
  const pane = outline.parentElement;
  if (!list || !pane || pane.hidden || list.children.length === 0) return;
  list.style.removeProperty("--rows");
  const styles = getComputedStyle(pane);
  const room = pane.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom) - (list.offsetTop - outline.offsetTop);
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const widest = Math.max(1, Math.min(MAX_COLUMNS, Math.floor(pane.clientWidth / (COLUMN_REM * rem))));
  if (room <= 0) return;
  // An estimate from the one-column height, then one more column while it still overflows (gaps, two-line rows).
  let columns = Math.min(widest, Math.ceil(list.scrollHeight / room));
  while (columns > 1) {
    list.style.setProperty("--rows", String(Math.ceil(list.children.length / columns)));
    if (list.scrollHeight <= room || columns >= widest) break;
    columns += 1;
  }
}

/**
 * The step index: a list of the reachable steps, opened from the Back / Next position (a native
 * `popover`: light dismiss and Esc). Anchored above its trigger; a bottom sheet on phones (CSS).
 * In presentation mode the header's "Step X of N" (or `O`, `b`, `.`) opens it as a large centered list.
 * It follows the reader's place live, so step keys move the real step while it is open. The same
 * list fills the step outline that `outline` (and a media-less intro) shows in the code area.
 */
export function startStepIndex(engine: StepEngine, variants?: VariantsHandle): void {
  let state: StepProgress = engine.progress();
  // Under the code panel's header (always there), or in the media panel for tutorials without code.
  const outlines = () => document.querySelectorAll<HTMLElement>(":is(.code-outline, .media-panel) [data-step-outline]");
  const renderOutlines = () => outlines().forEach((outline) => renderOutline(outline, state, variants));

  // The step engine swaps the panel's media: fill an outline as soon as it is shown.
  const mediaPanel = document.querySelector<HTMLElement>(".media-panel");
  if (mediaPanel) new MutationObserver(renderOutlines).observe(mediaPanel, { childList: true });
  // Shown, resized (splitters, the Preview / Result pane, presentation mode): fit the columns again.
  const resized = new ResizeObserver(() => outlines().forEach(fitOutline));
  for (const pane of document.querySelectorAll(".code-outline, .media-panel")) resized.observe(pane);
  document.querySelector(".right")?.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLElement>("[data-step-outline] a[data-index]");
    if (!link) return;
    event.preventDefault();
    engine.goToStep(Number(link.dataset.index));
  });
  document.addEventListener(PROGRESS_EVENT, (event) => {
    state = (event as CustomEvent<StepProgress>).detail;
    renderOutlines();
  });
  renderOutlines();

  const trigger = document.querySelector<HTMLElement>("#step-position");
  const panel = document.querySelector<HTMLElement>("#step-index");
  if (!trigger || !panel) return;
  const triggers = document.querySelectorAll<HTMLElement>('[popovertarget="step-index"]');
  const heading = panel.querySelector<HTMLElement>(".step-index-heading")!;
  const list = panel.querySelector<HTMLOListElement>(".step-index-list")!;

  function render(): void {
    heading.textContent = indexHeading(state.current, state.steps.length, state.completed);
    renderList(list, state, variants);
  }

  const currentLink = () =>
    list.querySelector<HTMLElement>('[aria-current="step"]') ?? list.querySelector<HTMLElement>("a");

  /** Above the trigger, centered on it and kept inside the window. Phones and presentation mode ignore it (CSS). */
  function place(): void {
    if (document.body.hasAttribute("data-presenting")) return;
    const box = trigger!.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const width = Math.min(22 * rem, innerWidth - 2 * GAP);
    const left = Math.min(Math.max(box.left + box.width / 2 - width / 2, GAP), innerWidth - width - GAP);
    panel!.style.setProperty("--index-left", `${left}px`);
    panel!.style.setProperty("--index-bottom", `${innerHeight - box.top + GAP}px`);
  }

  panel.addEventListener("beforetoggle", (event) => {
    if ((event as ToggleEvent).newState === "open") place();
  });
  panel.addEventListener("toggle", (event) => {
    const open = (event as ToggleEvent).newState === "open";
    // `popovertarget` exposes the state to assistive technology, not as an attribute the styles can use.
    for (const button of triggers) button.setAttribute("aria-expanded", String(open));
    if (!open) return;
    const link = currentLink();
    link?.focus({ preventScroll: true });
    link?.scrollIntoView({ block: "nearest" });
  });
  // Esc closes the list first (before a maximized pane or presentation mode, which skip it while open).
  addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !stepIndexOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      panel.hidePopover();
    },
    { capture: true },
  );
  // Presentation mode: `O` (or a clicker's "blank screen" key, `b` / `.`) opens and closes the list.
  addEventListener("keydown", (event) => {
    if (shortcutFor(event) !== "index") return;
    event.preventDefault();
    panel.togglePopover();
  });
  addEventListener("resize", () => {
    if (stepIndexOpen()) place();
  });

  list.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLElement>("a[data-index]");
    if (!link) return;
    event.preventDefault();
    panel.hidePopover();
    engine.goToStep(Number(link.dataset.index));
  });

  document.addEventListener(PROGRESS_EVENT, () => {
    const hadFocus = panel.contains(document.activeElement);
    render();
    // Step keys moved the real step: the reader's place in the list follows.
    if (hadFocus) {
      const link = currentLink();
      link?.focus({ preventScroll: true });
      link?.scrollIntoView({ block: "nearest" });
    }
  });

  render();
}
