import { setAction } from "./actions.ts";
import {
  clampSplit,
  DOCS_SPLIT,
  parseStoredSplit,
  PREVIEW_SPLIT,
  resolveMode,
  splitFromPointer,
  THEME_KEY,
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
  splitter: HTMLElement;
  /** Element whose size the percentage refers to; gets `cssVar` and `data-resizing`. */
  container: HTMLElement;
  cssVar: string;
  range: SplitRange;
  axis: "x" | "y";
  /** The resized panel sits at the end of the axis (bottom): dragging towards the end shrinks it. */
  fromEnd?: boolean;
}

/** Pointer and keyboard resizing (Shift for bigger steps), remembered in localStorage. */
function startSplitter({ splitter, container, cssVar, range, axis, fromEnd = false }: SplitterOptions): void {
  const set = (percent: number, persist: boolean) => {
    const value = clampSplit(percent, range);
    container.style.setProperty(cssVar, `${value}%`);
    splitter.setAttribute("aria-valuenow", String(value));
    if (persist) write(range.key, String(value));
  };
  const current = () => Number(splitter.getAttribute("aria-valuenow"));
  set(parseStoredSplit(read(range.key), range), false);

  splitter.addEventListener("pointerdown", (event) => {
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
    set(current(), true);
  };
  splitter.addEventListener("pointerup", endDrag);
  splitter.addEventListener("pointercancel", endDrag);

  const [less, more] = axis === "x" ? ["ArrowLeft", "ArrowRight"] : fromEnd ? ["ArrowDown", "ArrowUp"] : ["ArrowUp", "ArrowDown"];
  splitter.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 10 : 2;
    const delta = event.key === less ? -step : event.key === more ? step : 0;
    if (!delta) return;
    event.preventDefault();
    set(current() + delta, true);
  });
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

  const layout = document.querySelector<HTMLElement>(".layout");
  const docsSplitter = document.querySelector<HTMLElement>(".layout .splitter");
  if (layout && docsSplitter) {
    startSplitter({ splitter: docsSplitter, container: layout, cssVar: "--split", range: DOCS_SPLIT, axis: "x" });
  }
  const right = document.querySelector<HTMLElement>(".right");
  const previewSplitter = document.querySelector<HTMLElement>(".preview-splitter");
  if (right && previewSplitter) {
    startSplitter({
      splitter: previewSplitter,
      container: right,
      cssVar: "--preview-split",
      range: PREVIEW_SPLIT,
      axis: "y",
      fromEnd: true,
    });
  }
}
