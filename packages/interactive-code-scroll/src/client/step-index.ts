import { indexEntries, indexHeading, type IndexStep } from "./step-index-values.ts";
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

/**
 * The step index: a list of the reachable steps, opened from the Back / Next position (a native
 * `popover`: light dismiss and Esc). Anchored above its trigger; a bottom sheet on phones (CSS).
 * It follows the reader's place live, so step keys move the real step while it is open.
 */
export function startStepIndex(engine: StepEngine, variants?: VariantsHandle): void {
  const trigger = document.querySelector<HTMLElement>("#step-position");
  const panel = document.querySelector<HTMLElement>("#step-index");
  if (!trigger || !panel) return;
  const heading = panel.querySelector<HTMLElement>(".step-index-heading")!;
  const list = panel.querySelector<HTMLOListElement>(".step-index-list")!;
  let state: StepProgress = engine.progress();
  /** Steps the list items were built for: the same steps are updated in place (no replayed entrance). */
  let built: HTMLElement[] = [];

  function build(): void {
    built = state.steps;
    list.replaceChildren(
      ...built.map((step, i) => {
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

  function render(): void {
    const steps: IndexStep[] = state.steps.map((step) => ({ title: headingText(step), only: step.dataset.only }));
    const variant = variants && {
      active: variants.active().id,
      labels: Object.fromEntries(variants.list.map((v) => [v.id, v.label])),
    };
    const entries = indexEntries({ steps, current: state.current, completed: state.completed, variant });
    heading.textContent = indexHeading(state.current, state.steps.length, state.completed);
    if (built.length !== state.steps.length || built.some((step, i) => step !== state.steps[i])) build();
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

  const currentLink = () =>
    list.querySelector<HTMLElement>('[aria-current="step"]') ?? list.querySelector<HTMLElement>("a");

  /** Above the trigger, centered on it and kept inside the window. Phones ignore it (bottom sheet in CSS). */
  function place(): void {
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
    trigger.setAttribute("aria-expanded", String(open));
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

  document.addEventListener(PROGRESS_EVENT, (event) => {
    state = (event as CustomEvent<StepProgress>).detail;
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
