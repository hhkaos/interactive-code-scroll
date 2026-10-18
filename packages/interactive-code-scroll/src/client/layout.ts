import { setAction } from "./actions.ts";
import {
  clampSplit,
  DOCS_SPLIT,
  parseStoredSplit,
  PANEL_HEIGHT_EVENT,
  PANEL_PRESET_EVENT,
  PHONE_QUERY,
  PREVIEW_SPLIT,
  resolveMode,
  splitFromPointer,
  THEME_KEY,
  titleRoom,
  type Mode,
  type SplitRange,
} from "./layout-values.ts";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Remembering layout is a convenience only.
  }
};

function applyMode(mode: Mode): void {
  document.body.classList.toggle("calcite-mode-dark", mode === "dark");
  document.body.classList.toggle("calcite-mode-light", mode === "light");
  setAction(
    document.querySelector("#theme-toggle"),
    mode === "dark" ? "brightness" : "moon",
    mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
}

interface SplitterOptions {
  /** Several splitters may drive one size (the Preview and the Result pane share theirs). */
  splitters: HTMLElement[];
  /** Element whose size the percentage refers to; gets `cssVar` and `data-resizing`. */
  container: HTMLElement;
  cssVar: string;
  range: SplitRange;
  axis: "x" | "y";
  /** The resized panel sits at the end of the axis (bottom): dragging towards the end shrinks it. */
  fromEnd?: boolean;
}

/** Pointer and keyboard resizing (Shift for bigger steps), remembered in localStorage. */
function startSplitter({ splitters, container, cssVar, range, axis, fromEnd = false }: SplitterOptions): (percent: number, manual?: boolean) => void {
  let value = 0;
  let animation = 0;
  const cancelAnimation = () => cancelAnimationFrame(animation);
  const set = (percent: number, persist: boolean) => {
    value = clampSplit(percent, range);
    container.style.setProperty(cssVar, `${value}%`);
    for (const splitter of splitters) splitter.setAttribute("aria-valuenow", String(value));
    if (persist) write(range.key, String(value));
  };
  set(parseStoredSplit(read(range.key), range), false);
  for (const splitter of splitters) listen(splitter);
  return (percent, manual = false) => {
    cancelAnimation();
    if (!manual || matchMedia("(prefers-reduced-motion: reduce)").matches) return set(percent, manual);
    const from = value;
    const to = clampSplit(percent, range);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 180);
      set(from + (to - from) * (1 - (1 - progress) ** 3), progress === 1);
      if (progress < 1) animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
  };

  function listen(splitter: HTMLElement): void {
    splitter.addEventListener("pointerdown", (event) => {
      cancelAnimation();
      splitter.setPointerCapture(event.pointerId);
      container.toggleAttribute("data-resizing", true);
    });
    splitter.addEventListener("pointermove", (event) => {
      if (!splitter.hasPointerCapture(event.pointerId)) return;
      const box = container.getBoundingClientRect();
      const percent =
        axis === "x"
          ? splitFromPointer(event.clientX, box.left, box.width, range)
          : splitFromPointer(event.clientY, box.top, box.height, range);
      set(fromEnd ? 100 - percent : percent, false);
    });
    const endDrag = (event: PointerEvent) => {
      if (!splitter.hasPointerCapture(event.pointerId)) return;
      splitter.releasePointerCapture(event.pointerId);
      container.removeAttribute("data-resizing");
      set(value, true);
    };
    splitter.addEventListener("pointerup", endDrag);
    splitter.addEventListener("pointercancel", endDrag);

    const [less, more] = axis === "x" ? ["ArrowLeft", "ArrowRight"] : fromEnd ? ["ArrowDown", "ArrowUp"] : ["ArrowUp", "ArrowDown"];
    splitter.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 10 : 2;
      const delta = event.key === less ? -step : event.key === more ? step : 0;
      if (!delta) return;
      cancelAnimation();
      event.preventDefault();
      set(value + delta, true);
    });
  }
}

/** Light/dark toggle (remembered) and the resizable docs/code and code/preview splitters (remembered). */
export function startLayout(): void {
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  applyMode(resolveMode(read(THEME_KEY), prefersDark, document.body.dataset.theme));
  document.querySelector("#theme-toggle")?.addEventListener("click", () => {
    const next: Mode = document.body.classList.contains("calcite-mode-dark") ? "light" : "dark";
    write(THEME_KEY, next);
    applyMode(next);
  });

  startHeaderTitle();

  const layout = document.querySelector<HTMLElement>(".layout");
  const docsSplitter = document.querySelector<HTMLElement>(".layout .splitter");
  if (layout && docsSplitter) {
    startSplitter({ splitters: [docsSplitter], container: layout, cssVar: "--split", range: DOCS_SPLIT, axis: "x" });
  }
  const right = document.querySelector<HTMLElement>(".right");
  const previewSplitters = [...document.querySelectorAll<HTMLElement>(".preview-splitter")];
  if (right && previewSplitters.length > 0) {
    const setHeight = startSplitter({
      splitters: previewSplitters,
      container: right,
      cssVar: "--preview-split",
      range: PREVIEW_SPLIT,
      axis: "y",
      fromEnd: true,
    });
    // CSS uses this size only in the shared desktop layout; compact and maximized panes keep their geometry.
    document.addEventListener(PANEL_HEIGHT_EVENT, (event) => setHeight((event as CustomEvent<number>).detail));
    document.addEventListener(PANEL_PRESET_EVENT, (event) => setHeight((event as CustomEvent<number>).detail, true));
  }
}

/**
 * Shows `url` (the tutorial's or the active variant's logo) before the header title; none hides it.
 * Phones never show it (CSS): the variant switcher right below already does.
 */
export function setHeaderLogo(url: string | undefined): void {
  const img = document.querySelector<HTMLImageElement>("#header-title .page-title-logo");
  if (!img) return;
  if (url) img.src = url;
  img.hidden = !url;
}

/**
 * Header title (our own block in the navigation's logo slot): capped to the room the other header
 * slots leave (see `titleRoom`), with an ellipsis past that. On phones the sibling menu moves under
 * the h1 as a compact second line, and tapping the h1 opens it too. A clipped title opens its full
 * text: at the head of the sibling menu, else in a popover.
 */
function startHeaderTitle(): void {
  const header = document.querySelector<HTMLElement>(".app-header");
  const title = header?.querySelector<HTMLElement>(":scope > #header-title");
  const heading = title?.querySelector<HTMLElement>("h1");
  if (!header || !title || !heading) return;
  const text = title.querySelector<HTMLElement>(".page-title-text")!;
  const switcher = header.querySelector<HTMLElement>(":scope > .family-switcher");
  const menu = switcher?.querySelector<HTMLElement & { open: boolean }>("#family-dropdown");
  const trigger = menu?.querySelector<HTMLElement>("calcite-button");
  const popover = document.querySelector<HTMLElement & { referenceElement?: HTMLElement; open: boolean }>("#title-popover");
  const phone = matchMedia(PHONE_QUERY);
  const others = [...header.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== title);
  // Added only while needed: Calcite draws a separator above the next group even when this one is hidden.
  const fullTitle = document.createElement("calcite-dropdown-group");
  fullTitle.setAttribute("group-title", heading.textContent ?? "");
  fullTitle.setAttribute("selection-mode", "none");
  fullTitle.className = "family-title";

  const fit = () => {
    title.style.maxWidth = `${titleRoom(header.clientWidth, others.map((el) => el.getBoundingClientRect().width))}px`;
    const clipped = heading.scrollWidth > heading.clientWidth + 1;
    title.toggleAttribute("data-clipped", clipped);
    if (menu && clipped && phone.matches) {
      if (!fullTitle.isConnected) menu.querySelector("calcite-dropdown-group")?.before(fullTitle);
    } else fullTitle.remove();
    if (popover) {
      if (clipped) popover.referenceElement = heading;
      else {
        popover.open = false;
        popover.removeAttribute("reference-element");
        popover.referenceElement = undefined;
      }
    }
  };
  // The menu itself moves (one menu, one set of links): a button in the header on desktop, a
  // compact second line of the title on phones.
  const applyPhone = () => {
    if (!menu || !switcher || !trigger) return;
    const onPhone = phone.matches;
    (onPhone ? text : switcher).append(menu);
    trigger.setAttribute("appearance", onPhone ? "transparent" : "outline");
    trigger.setAttribute("scale", onPhone ? "s" : "m");
    fit();
  };
  if (menu) {
    // The second line is a small target: the h1 opens the menu too. Calcite closes it on any
    // outside pointerdown and click (this tap included), so remember whether the tap found it open
    // and open it after the click has gone through.
    let wasOpen = false;
    heading.addEventListener("pointerdown", () => (wasOpen = menu.open));
    heading.addEventListener("click", () => {
      if (phone.matches && !wasOpen) requestAnimationFrame(() => (menu.open = true));
    });
  }
  phone.addEventListener("change", applyPhone);
  applyPhone();
  fit();
  const observer = new ResizeObserver(fit);
  for (const el of [header, heading, ...others]) observer.observe(el);
}
