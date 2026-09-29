import { outputKind } from "../output.ts";
import { PREVIEW_ENTRY } from "../preview/build-html.ts";
import { setAction } from "./actions.ts";
import { renderJsonTree } from "./json-tree.ts";
import { parseJson } from "./json-tree-values.ts";
import { terminalSegments } from "./terminal-values.ts";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./preview.ts";
import { lastOutput, type StepOutput } from "./result-values.ts";
import { STEP_EVENT } from "./steps.ts";
import { VARIANT_EVENT, type VariantsHandle } from "./variants.ts";

export interface ResultOptions {
  /** Embedded file paths (relative to `code/`): web code is the one with `index.html`. */
  files: readonly { path: string }[];
  /** URL of the published captured outputs (`<base>output/`). */
  outputUrl: string;
  variants?: VariantsHandle;
}

/**
 * The Result pane takes the Preview's place for code that cannot run in the browser.
 * Captured outputs are untrusted text: they are fetched when shown and rendered as text
 * nodes (a JSON tree, terminal text or an image), never as HTML.
 */
export function startResult({ files, outputUrl, variants }: ResultOptions): void {
  const section = document.querySelector<HTMLElement>("section.result");
  if (!section) return;
  const frame = section.querySelector<HTMLElement>(".result-frame")!;
  const body = section.querySelector<HTMLElement>(".result-body")!;
  const badge = section.querySelector<HTMLElement>(".result-badge")!;
  const empty = body.querySelector(".result-empty")!;
  const allSteps = [...document.querySelectorAll<HTMLElement>("section.step")];
  const outputs: StepOutput[] = allSteps.map(({ dataset }) => ({
    output: dataset.output,
    outputs: dataset.outputs ? (JSON.parse(dataset.outputs) as Record<string, string>) : undefined,
  }));
  // The pane appears only when some step has an output.
  const used = outputs.some((s) => s.output || s.outputs);

  const isWeb = () => {
    const dir = variants?.active().dir;
    return files.some((f) => f.path === (dir === undefined ? PREVIEW_ENTRY : `${dir}/${PREVIEW_ENTRY}`));
  };

  const texts = new Map<string, Promise<string>>();
  const fetchText = (url: string) => {
    let text = texts.get(url);
    if (!text) {
      text = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      });
      text.catch(() => texts.delete(url));
      texts.set(url, text);
    }
    return text;
  };

  let active: HTMLElement | null = null;
  let shown: string | undefined;
  let renders = 0;

  function render(path: string | undefined): void {
    if (path === shown) return;
    shown = path;
    const token = ++renders;
    badge.hidden = path === undefined;
    badge.textContent = path === undefined ? "" : `Captured · output/${path}`;
    if (path === undefined) {
      body.replaceChildren(empty);
      return;
    }
    const url = new URL(path.split("/").map(encodeURIComponent).join("/"), new URL(outputUrl, location.href)).href;
    const kind = outputKind(path);
    if (kind === "image") {
      const image = document.createElement("img");
      image.className = "result-image";
      image.alt = `Captured output ${path}`;
      image.src = url;
      body.replaceChildren(image);
      return;
    }
    const pre = document.createElement("pre");
    pre.className = kind === "text" ? "result-terminal" : "result-json";
    pre.setAttribute("aria-busy", "true");
    body.replaceChildren(pre);
    fetchText(url).then(
      (text) => {
        if (token !== renders) return;
        const json = kind === "json" ? parseJson(text) : undefined;
        if (json?.ok) {
          const viewer = document.createElement("div");
          viewer.className = "result-json";
          viewer.append(renderJsonTree(json.value, `JSON output/${path}`));
          pre.replaceWith(viewer);
          return;
        }
        if (kind === "text") {
          pre.replaceChildren(
            ...terminalSegments(text).map(({ text: run, classes }) => {
              if (!classes.length) return document.createTextNode(run);
              const span = document.createElement("span");
              span.className = classes.join(" ");
              span.textContent = run;
              return span;
            }),
          );
        } else {
          // JSON that does not parse: shown as it is.
          pre.textContent = text;
        }
        pre.removeAttribute("aria-busy");
      },
      () => {
        if (token !== renders) return;
        pre.textContent = `Could not load output/${path}.`;
        pre.dataset.error = "";
        pre.removeAttribute("aria-busy");
      },
    );
  }

  function update(): void {
    section!.hidden = !used || isWeb();
    if (section!.hidden) return;
    render(lastOutput(outputs, active ? allSteps.indexOf(active) : -1, variants?.active().id));
  }

  const setCollapsed = (collapsed: boolean) => {
    frame.hidden = collapsed;
    setAction(section.querySelector("#result-toggle"), collapsed ? "chevron-right" : "chevron-down", "Result");
  };
  section.querySelector("#result-toggle")?.addEventListener("click", () => setCollapsed(!frame.hidden));
  document.addEventListener(PREVIEW_STATE_EVENT, (event) => setCollapsed((event as CustomEvent<PreviewState>).detail === "collapsed"));

  document.addEventListener(STEP_EVENT, (event) => {
    active = (event as CustomEvent<HTMLElement | null>).detail;
    update();
  });
  document.addEventListener(VARIANT_EVENT, update);
  active = allSteps.find((s) => s.hasAttribute("data-active")) ?? null;
  update();
}
