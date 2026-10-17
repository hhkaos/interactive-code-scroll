import { inFolder, projectFiles, publishedUrl, type ParsedFile } from "../downloads.ts";
import { buildPreviewHtml, PREVIEW_ENTRY, previewPageKey, previewPagesOf, previewStorageKey, type PreviewTarget } from "../preview/build-html.ts";
import { startConsole } from "./console.ts";
import { setAction } from "./actions.ts";
import { VARIANT_EVENT, type VariantsHandle } from "./variants.ts";

export type { PreviewTarget };
export type PreviewState = "expanded" | "collapsed";
export const PREVIEW_STATE_EVENT = "ics:preview-state";

export interface PreviewOptions {
  mode: "iframe" | "tab" | "both";
  files: ParsedFile[];
  /** Current form values (vars without a field fall back to the code default). */
  values: () => Record<string, string>;
  /** URL of the standalone preview page (`<base>preview/`). */
  pageUrl: string;
  /** With code variants, only web variants (with `index.html`) have a Preview, each on its own page. */
  variants?: VariantsHandle;
  /** Slug of the tutorial in a series site (`""` otherwise): its Preview has its own storage slot. */
  tutorial?: string;
}

/**
 * Both the iframe and the new tab load a real same-origin page (not srcdoc/blob):
 * the ArcGIS SDK derives the OAuth redirect_uri from `location`.
 */
function store(html: string, target: PreviewTarget, pageUrl: string, variant: string | undefined, tutorial: string): string {
  localStorage.setItem(previewStorageKey(target, variant, tutorial), html);
  const url = new URL(pageUrl, location.href);
  url.searchParams.set("target", target);
  return url.href;
}

export function startPreview({ mode, files, values, pageUrl, variants, tutorial = "" }: PreviewOptions): { refresh(): void } {
  const section = document.querySelector<HTMLElement>("section.preview");
  const frame = document.querySelector<HTMLElement>(".preview-frame");
  const iframe = frame?.querySelector("iframe");
  const consoleView = iframe ? startConsole(iframe) : undefined;
  let started = false;

  /** Project (with values and with code defaults), page, folder URL and storage slot of the code the Preview runs; `undefined` for a variant without web code. */
  const target = () => {
    const base = new URL(pageUrl, location.href).href;
    if (!variants) return { files: projectFiles(files, values()), defaults: projectFiles(files, {}), page: pageUrl, baseUrl: base, variant: undefined };
    const { id, dir } = variants.active();
    if (!files.some((f) => f.path === `${dir}/${PREVIEW_ENTRY}`)) return undefined;
    return {
      files: inFolder(projectFiles(files, values()), dir),
      defaults: inFolder(projectFiles(files, {}), dir),
      // The explicit file name also resolves in dev, where `preview/<dir>/` is not mapped to its index.html.
      page: publishedUrl(pageUrl, `${dir}/${PREVIEW_ENTRY}`),
      baseUrl: new URL(publishedUrl(base, `${dir}/`)).href,
      variant: id,
    };
  };
  const open = (kind: PreviewTarget) => {
    const current = target();
    if (!current) return undefined;
    const options = { baseUrl: current.baseUrl, defaults: current.defaults };
    // The project's other pages (an OAuth callback…) read their copy from their loader pages.
    for (const path of previewPagesOf(Object.keys(current.files))) {
      localStorage.setItem(previewPageKey(path, current.variant, tutorial), buildPreviewHtml(current.files, path, options));
    }
    return store(buildPreviewHtml(current.files, PREVIEW_ENTRY, options), kind, current.page, current.variant, tutorial);
  };

  const run = () => {
    if (!iframe) return;
    const url = open("iframe");
    if (!url) return;
    consoleView?.clear();
    started = true;
    if (iframe.src === url) iframe.contentWindow?.location.reload();
    else iframe.src = url;
  };

  const setCollapsed = (collapsed: boolean) => {
    if (!frame) return;
    frame.hidden = collapsed;
    setAction(document.querySelector("#preview-toggle"), collapsed ? "chevron-right" : "chevron-down", "Output");
    if (!collapsed && !started) run();
  };

  document.querySelector("#preview-run")?.addEventListener("click", run);
  document.querySelector("#preview-open")?.addEventListener("click", () => {
    const url = open("tab");
    if (url) window.open(url, "_blank");
  });
  // Collapsing keeps the preview header (and its controls) in place.
  document.querySelector("#preview-toggle")?.addEventListener("click", () => {
    setCollapsed(!frame!.hidden);
  });
  document.addEventListener(PREVIEW_STATE_EVENT, (event) => {
    const state = (event as CustomEvent<PreviewState>).detail;
    setCollapsed(state === "collapsed");
  });

  // Variants without web code have no Preview.
  const showSection = () => {
    if (section) section.hidden = target() === undefined;
  };
  document.addEventListener(VARIANT_EVENT, () => {
    showSection();
    consoleView?.clear();
    started = false;
    if (mode !== "tab" && target()) run();
    else if (iframe) iframe.src = "about:blank";
  });
  showSection();
  if (mode !== "tab" && !frame?.hidden) run();

  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    refresh() {
      clearTimeout(timer);
      timer = setTimeout(run, 500);
    },
  };
}

/** Runs on the standalone preview page of a tutorial (`tutorial` is its slug in a series site). */
export function renderStoredPreview(tutorial = ""): void {
  const target = new URLSearchParams(location.search).get("target") === "iframe" ? "iframe" : "tab";
  const html = localStorage.getItem(previewStorageKey(target, undefined, tutorial));
  if (html === null) {
    document.body.textContent = "No preview available. Open it from the tutorial.";
    return;
  }
  document.open();
  document.write(html);
  document.close();
}
