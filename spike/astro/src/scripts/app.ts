import "@esri/calcite-components/main.css";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-carousel";
import "@esri/calcite-components/components/calcite-carousel-item";
import "@esri/calcite-components/components/calcite-input";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-tab-nav";
import "@esri/calcite-components/components/calcite-tab-title";
import { applyVars, type ParsedSource } from "../../../shared/markers.ts";
import { buildPreviewHtml, storePreview } from "../../../shared/preview.ts";

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(sel),
];

const files = JSON.parse($("#ics-files").textContent!) as { path: string; parsed: ParsedSource }[];
const defaults: Record<string, string> = Object.fromEntries(
  files.flatMap((f) => f.parsed.vars.map((v) => [v.name, v.defaultValue])),
);

// Theme
const body = document.body;
const setMode = (dark: boolean) => {
  body.classList.toggle("calcite-mode-dark", dark);
  body.classList.toggle("calcite-mode-light", !dark);
  $("#toggle-theme").setAttribute("icon-start", dark ? "brightness" : "moon");
};
setMode(matchMedia("(prefers-color-scheme: dark)").matches);
$("#toggle-theme").addEventListener("click", () => setMode(!body.classList.contains("calcite-mode-dark")));

// Code panel
const codePanel = $(".code-panel");
const mediaPanel = $(".media-panel");

function showFile(path: string) {
  for (const pane of $$(".code")) pane.hidden = pane.dataset.file !== path;
  for (const title of $$<HTMLElement & { selected: boolean }>("calcite-tab-title")) {
    title.selected = title.dataset.file === path;
  }
}

for (const title of $$("calcite-tab-title")) {
  title.addEventListener("calciteTabsActivate", () => showFile(title.dataset.file!));
}

// Steps
const steps = $$("section.step");
let current = -1;
let restoring = true;

function activate(index: number) {
  if (index === current) return;
  current = index;
  const step = steps[index]!;
  steps.forEach((s, i) => s.toggleAttribute("data-selected", i === index));
  $(".progress").textContent = `Step ${index + 1} of ${steps.length}`;
  history.replaceState(null, "", `#${step.id}`);

  const media = step.querySelector<HTMLTemplateElement>("template.step-media");
  mediaPanel.hidden = !media;
  codePanel.hidden = !!media;
  mediaPanel.replaceChildren(...(media ? [media.content.cloneNode(true)] : []));
  if (media) return;

  const { file, region } = step.dataset;
  if (file) showFile(file);
  for (const line of $$(".code .line[data-focus]")) line.removeAttribute("data-focus");
  const pane = file ? $(`.code[data-file="${file}"]`) : undefined;
  if (pane && region) {
    const lines = $$(`.line[data-regions~="${region}"]`, pane);
    lines.forEach((l) => l.setAttribute("data-focus", ""));
    lines[0]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    if (restoring) return;
    const entering = entries.find((e) => e.isIntersecting);
    if (entering) activate(steps.indexOf(entering.target as HTMLElement));
  },
  { rootMargin: "-50% 0px -50% 0px" },
);
steps.forEach((s) => observer.observe(s));

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|CALCITE-INPUT)$/.test(el.tagName));

addEventListener("keydown", (e) => {
  if (isEditable(e.target)) return;
  const delta = ["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)
    ? 1
    : ["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)
      ? -1
      : 0;
  if (!delta) return;
  e.preventDefault();
  const next = Math.min(Math.max(current + delta, 0), steps.length - 1);
  steps[next]!.scrollIntoView({ block: "center", behavior: "smooth" });
  activate(next);
});

// Restore the deep link only after Calcite has hydrated: hydration changes step heights.
const initial = Math.max(0, steps.findIndex((s) => `#${s.id}` === location.hash));
activate(initial);
void Promise.all([
  ...["calcite-input", "calcite-label", "calcite-button"].map((tag) => customElements.whenDefined(tag)),
  document.fonts.ready,
]).then(() =>
  requestAnimationFrame(() => {
    steps[initial]!.scrollIntoView({ block: "center" });
    restoring = false;
  }),
);

// Vars: token substitution in the pre-highlighted HTML (no client-side highlighter).
const values: Record<string, string> = { ...defaults };
const secrets = new Set<string>();
const revealed = new Set<string>();

function renderVar(name: string) {
  const value = values[name]!;
  const masked = secrets.has(name) && !revealed.has(name) && value !== defaults[name];
  for (const span of $$(`.code [data-var="${name}"]`)) span.textContent = masked ? "•".repeat(value.length) : value;
}

for (const input of $$<HTMLElement & { value: string; type: string }>("calcite-input[data-var]")) {
  const name = input.dataset.var!;
  const persist = input.hasAttribute("data-persist");
  if (input.hasAttribute("data-secret")) secrets.add(name);
  const stored = localStorage.getItem(`ics:var:${name}`);
  if (stored !== null) {
    values[name] = stored;
    input.value = stored;
  }
  renderVar(name);

  input.addEventListener("calciteInputInput", () => {
    values[name] = input.value || defaults[name]!;
    if (persist) localStorage.setItem(`ics:var:${name}`, values[name]);
    renderVar(name);
    schedulePreview();
  });
  input.querySelector("[data-reveal]")?.addEventListener("click", (e) => {
    const shown = revealed.has(name) ? (revealed.delete(name), false) : (revealed.add(name), true);
    input.type = shown ? "text" : "password";
    (e.currentTarget as HTMLElement).setAttribute("icon-start", shown ? "view-hide" : "view-visible");
    renderVar(name);
  });
}

// Preview
const iframe = $<HTMLIFrameElement>(".preview iframe");
const previewHtml = () =>
  buildPreviewHtml(Object.fromEntries(files.map((f) => [f.path, applyVars(f.parsed, values)])));
const runPreview = () => {
  const url = storePreview(previewHtml(), "iframe", "./preview/");
  if (iframe.src === url) iframe.contentWindow?.location.reload();
  else iframe.src = url;
};
let timer: ReturnType<typeof setTimeout> | undefined;
function schedulePreview() {
  clearTimeout(timer);
  timer = setTimeout(runPreview, 500);
}
runPreview();
$("#run").addEventListener("click", runPreview);
$("#open-tab").addEventListener("click", () => window.open(storePreview(previewHtml(), "tab", "./preview/"), "_blank"));
$("#toggle-preview").addEventListener("click", () => ($(".preview").hidden = !$(".preview").hidden));
