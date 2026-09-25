import { setAction } from "./actions.ts";
import { clampSplit, parseStoredSplit, resolveMode, SPLIT_KEY, splitFromPointer, THEME_KEY, type Mode } from "./layout-values.ts";

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

/** Light/dark toggle (remembered) and the resizable docs/code splitter (remembered). */
export function startLayout(): void {
  applyMode(resolveMode(read(THEME_KEY), matchMedia("(prefers-color-scheme: dark)").matches));
  document.querySelector("#theme-toggle")?.addEventListener("click", () => {
    const next: Mode = document.body.classList.contains("calcite-mode-dark") ? "light" : "dark";
    write(THEME_KEY, next);
    applyMode(next);
  });

  const layout = document.querySelector<HTMLElement>(".layout");
  const splitter = document.querySelector<HTMLElement>(".splitter");
  if (!layout || !splitter) return;

  const setSplit = (percent: number, persist: boolean) => {
    const value = clampSplit(percent);
    layout.style.setProperty("--split", `${value}%`);
    splitter.setAttribute("aria-valuenow", String(value));
    if (persist) write(SPLIT_KEY, String(value));
  };
  setSplit(parseStoredSplit(read(SPLIT_KEY)), false);

  splitter.addEventListener("pointerdown", (event) => {
    splitter.setPointerCapture(event.pointerId);
    layout.toggleAttribute("data-resizing", true);
  });
  splitter.addEventListener("pointermove", (event) => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    const box = layout.getBoundingClientRect();
    setSplit(splitFromPointer(event.clientX, box.left, box.width), false);
  });
  const endDrag = (event: PointerEvent) => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    splitter.releasePointerCapture(event.pointerId);
    layout.removeAttribute("data-resizing");
    setSplit(Number(splitter.getAttribute("aria-valuenow")), true);
  };
  splitter.addEventListener("pointerup", endDrag);
  splitter.addEventListener("pointercancel", endDrag);

  splitter.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 10 : 2;
    const delta = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    if (!delta) return;
    event.preventDefault();
    setSplit(Number(splitter.getAttribute("aria-valuenow")) + delta, true);
  });
}
