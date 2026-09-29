import { inFolder, projectFiles, publishedUrl, type ParsedFile } from "../downloads.ts";
import { buildPreviewHtml, PREVIEW_ENTRY, previewStorageKey, type PreviewTarget } from "../preview/build-html.ts";
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

  /** Project, page and storage slot of the code the Preview runs; `undefined` for a variant without web code. */
  const target = () => {
    if (!variants) return { files: projectFiles(files, values()), page: pageUrl, variant: undefined };
    const { id, dir } = variants.active();
    if (!files.some((f) => f.path === `${dir}/${PREVIEW_ENTRY}`)) return undefined;
    // The explicit file name also resolves in dev, where `preview/<dir>/` is not mapped to its index.html.
    return { files: inFolder(projectFiles(files, values()), dir), page: publishedUrl(pageUrl, `${dir}/${PREVIEW_ENTRY}`), variant: id };
  };
  const open = (kind: PreviewTarget) => {
    const current = target();
    return current && store(buildPreviewHtml(current.files), kind, current.page, current.variant, tutorial);
  };

  const run = () => {
    if (!iframe || frame!.hidden) return;
    const url = open("iframe");
    if (!url) return;
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
    if (mode !== "tab") run();
  });
  showSection();
  if (mode !== "tab") run();

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
