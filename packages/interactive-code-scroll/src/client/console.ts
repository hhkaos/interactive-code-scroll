import { consoleSummaryTokens } from "./console-values.ts";
import { renderJsonTree } from "./json-tree.ts";
import { parseJson } from "./json-tree-values.ts";

/** Colored summary built only from text nodes (logged values are untrusted). */
const coloredSummary = (value: Parameters<typeof consoleSummaryTokens>[0]) => {
  const fragment = document.createDocumentFragment();
  for (const { kind, text } of consoleSummaryTokens(value)) {
    const span = document.createElement("span");
    span.className = kind;
    span.textContent = text;
    fragment.append(span);
  }
  return fragment;
};

/** Tabs share one live iframe: hiding the app never reloads or detaches it. */
export function startConsole(iframe: HTMLIFrameElement): { clear(): void; select(view: string): void } {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.preview-tabs [role="tab"]')];
  const app = document.querySelector<HTMLElement>("#preview-app")!;
  const panel = document.querySelector<HTMLElement>("#preview-console")!;
  const scroll = panel.querySelector<HTMLElement>(".console-messages")!;
  const list = document.querySelector<HTMLElement>("#preview-console-entries")!;
  const empty = document.querySelector<HTMLElement>("#preview-console-empty")!;
  const count = document.querySelector<HTMLElement>("#preview-console-count")!;
  const section = app.closest<HTMLElement>(".preview")!;
  let discarded = 0;
  const update = () => {
    const size = list.childElementCount;
    count.textContent = size ? `(${size}${discarded ? "+" : ""})` : "";
    empty.hidden = size > 0;
    list.setAttribute("aria-label", `Console messages${discarded ? `; ${discarded} older messages discarded` : ""}`);
  };
  const clear = () => {
    list.replaceChildren();
    discarded = 0;
    update();
  };
  const select = (view: string) => {
    if (view !== "preview" && view !== "console") return;
    section.dataset.view = view;
    const consoleOn = view === "console";
    app.hidden = consoleOn;
    panel.hidden = !consoleOn;
    tabs.forEach((tab, i) => {
      const selected = (i === 1) === consoleOn;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  };
  tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i === 0 ? "preview" : "console")));
  document.querySelector(".preview-tabs")?.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    event.preventDefault();
    const index = key === "Home" ? 0 : key === "End" ? 1 : section.dataset.view === "console" ? 0 : 1;
    select(index === 0 ? "preview" : "console");
    tabs[index]?.focus();
  });
  document.addEventListener("ics:panel-view", (event) => select((event as CustomEvent<string>).detail));
  // The step engine has already selected the initial step (including deep links).
  select(section.dataset.view ?? "preview");
  addEventListener("message", (event) => {
    if (section.hidden || event.origin !== location.origin || event.source !== iframe.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "ics:console-reset") return clear();
    if (data.type !== "ics:console" || !["log", "info", "warn", "error"].includes(data.level) || typeof data.args !== "string" || data.args.length > 500000) return;
    const parsed = parseJson(data.args);
    if (!parsed.ok || !Array.isArray(parsed.value)) return;
    const row = document.createElement("div");
    row.className = "console-entry";
    row.setAttribute("role", "listitem");
    row.dataset.level = data.level;
    const level = document.createElement("span");
    level.className = "console-level";
    level.textContent = data.level;
    row.append(level);
    for (const [index, value] of parsed.value.entries()) {
      if (typeof value === "string") {
        const text = document.createElement("span");
        text.className = index === 0 ? "console-label" : "jt-str";
        text.textContent = value;
        row.append(text);
      } else row.append(renderJsonTree(value, `${data.level} argument ${index + 1}`, { collapsed: true, summary: coloredSummary }));
    }
    if (data.source && typeof data.source.url === "string" && Number.isSafeInteger(data.source.line) && data.source.line > 0) {
      try {
        const url = new URL(data.source.url);
        if (["http:", "https:", "file:", "ics-preview:"].includes(url.protocol)) {
          const source = document.createElement("span");
          source.className = "console-source";
          const path = decodeURIComponent(url.pathname);
          source.textContent = `${path.split("/").at(-1) || "index.html"}:${data.source.line}`;
          source.title = `${path}:${data.source.line}:${data.source.column ?? 0}`;
          row.append(source);
        }
      } catch {
        // A browser may supply an unparseable stack location; the log still renders.
      }
    }
    const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40;
    list.append(row);
    while (list.childElementCount > 200) {
      list.firstElementChild?.remove();
      discarded++;
    }
    update();
    if (atBottom) scroll.scrollTop = scroll.scrollHeight;
  });
  return { clear, select };
}
