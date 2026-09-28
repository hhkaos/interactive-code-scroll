interface HintState {
  hint: HTMLElement;
  label: HTMLElement;
  popover: HTMLElement;
}

const VIEWPORT_GAP = 8;
const CLOSE_DELAY_MS = 180;
let active: HintState | undefined;
let closeTimer: number | undefined;

function place({ label, popover }: HintState): void {
  const labelRect = label.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const preferredLeft = labelRect.left + labelRect.width / 2 - popoverRect.width / 2;
  const left = Math.min(Math.max(VIEWPORT_GAP, preferredLeft), innerWidth - popoverRect.width - VIEWPORT_GAP);
  const top = Math.max(VIEWPORT_GAP, labelRect.top - popoverRect.height - 8);
  const arrow = labelRect.left + labelRect.width / 2 - left;

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.style.setProperty("--hint-arrow-left", `${arrow}px`);
}

function open(state: HintState): void {
  if (closeTimer !== undefined) window.clearTimeout(closeTimer);
  closeTimer = undefined;
  active = state;
  state.hint.dataset.open = "";
  requestAnimationFrame(() => place(state));
}

function closeNow(state: HintState): void {
  if (active === state) active = undefined;
  state.hint.removeAttribute("data-open");
}

function closeSoon(state: HintState): void {
  if (closeTimer !== undefined) window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => closeNow(state), CLOSE_DELAY_MS);
}

/** Positions rich inline hint popovers so scroll containers cannot clip them. */
export function startHints(): void {
  for (const hint of document.querySelectorAll<HTMLElement>(".hint")) {
    const label = hint.querySelector<HTMLElement>(".hint-label");
    const popover = hint.querySelector<HTMLElement>(".hint-popover");
    if (!label || !popover) continue;
    const state = { hint, label, popover };

    hint.addEventListener("pointerenter", () => open(state));
    hint.addEventListener("pointerleave", () => closeSoon(state));
    popover.addEventListener("pointerenter", () => open(state));
    popover.addEventListener("pointerleave", () => closeSoon(state));
    hint.addEventListener("focusin", () => open(state));
    hint.addEventListener("focusout", (event) => {
      if (event.relatedTarget instanceof Node && hint.contains(event.relatedTarget)) return;
      closeSoon(state);
    });
  }

  addEventListener("resize", () => {
    if (active) place(active);
  });
  document.querySelector(".docs")?.addEventListener("scroll", () => {
    if (active) place(active);
  });
}
