import { projectFiles, type ParsedFile } from "../downloads.ts";
import { buildPreviewHtml } from "../preview/build-html.ts";
import { setAction } from "./actions.ts";

export type PreviewTarget = "iframe" | "tab";
export type PreviewState = "expanded" | "collapsed";
export const PREVIEW_STATE_EVENT = "ics:preview-state";
const storageKey = (target: PreviewTarget) => `ics:preview:${target}`;

export interface PreviewOptions {
  mode: "iframe" | "tab" | "both";
  files: ParsedFile[];
  /** Current form values (vars without a field fall back to the code default). */
  values: () => Record<string, string>;
  /** URL of the standalone preview page (`<base>preview/`). */
  pageUrl: string;
}

/**
 * Both the iframe and the new tab load a real same-origin page (not srcdoc/blob):
 * the ArcGIS SDK derives the OAuth redirect_uri from `location`.
 */
function store(html: string, target: PreviewTarget, pageUrl: string): string {
  localStorage.setItem(storageKey(target), html);
  const url = new URL(pageUrl, location.href);
  url.searchParams.set("target", target);
  return url.href;
}

export function startPreview({ mode, files, values, pageUrl }: PreviewOptions): { refresh(): void } {
  const html = () => buildPreviewHtml(projectFiles(files, values()));
  const frame = document.querySelector<HTMLElement>(".preview-frame");
  const iframe = frame?.querySelector("iframe");

  const run = () => {
    if (!iframe || frame!.hidden) return;
    const url = store(html(), "iframe", pageUrl);
    if (iframe.src === url) iframe.contentWindow?.location.reload();
    else iframe.src = url;
  };

  const setCollapsed = (collapsed: boolean) => {
    if (!frame) return;
    frame.hidden = collapsed;
    setAction(document.querySelector("#preview-toggle"), collapsed ? "chevron-right" : "chevron-down", "Preview");
    run();
  };

  document.querySelector("#preview-run")?.addEventListener("click", run);
  document.querySelector("#preview-open")?.addEventListener("click", () => {
    window.open(store(html(), "tab", pageUrl), "_blank");
  });
  // Collapsing keeps the preview header (and its controls) in place.
  document.querySelector("#preview-toggle")?.addEventListener("click", () => {
    setCollapsed(!frame!.hidden);
  });
  document.addEventListener(PREVIEW_STATE_EVENT, (event) => {
    const state = (event as CustomEvent<PreviewState>).detail;
    setCollapsed(state === "collapsed");
  });

  if (mode !== "tab") run();

  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    refresh() {
      clearTimeout(timer);
      timer = setTimeout(run, 500);
    },
  };
}

/** Runs on the standalone preview page. */
export function renderStoredPreview(): void {
  const target = new URLSearchParams(location.search).get("target") === "iframe" ? "iframe" : "tab";
  const html = localStorage.getItem(storageKey(target));
  if (html === null) {
    document.body.textContent = "No preview available. Open it from the tutorial.";
    return;
  }
  document.open();
  document.write(html);
  document.close();
}
