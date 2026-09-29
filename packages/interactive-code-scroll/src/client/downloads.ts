import { buildZip, inFolder, projectFiles, publishedUrl, slugify, zipBadge, zipLabel, type ParsedFile } from "../downloads.ts";
import { setAction } from "./actions.ts";
import { VARIANT_EVENT, type VariantsHandle } from "./variants.ts";

function save(name: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Brief confirmation on a Calcite action (icon + text), then restore. */
function flash(action: HTMLElement, icon: string, text: string): void {
  const previous = [action.getAttribute("icon") ?? "", action.getAttribute("text") ?? ""] as const;
  setAction(action, icon, text);
  setTimeout(() => setAction(action, ...previous), 1500);
}

export interface DownloadsOptions {
  files: ParsedFile[];
  /** `code/` files the page does not embed (no tab, binaries): fetched from `previewUrl` for the ZIP. */
  fetched: string[];
  previewUrl: string;
  values: () => Record<string, string>;
  title: string;
  /** With code variants, the ZIP holds the active variant's folder only. */
  variants?: VariantsHandle;
  /** Variant id → files in its ZIP and how many of them have no tab. */
  zipCounts?: Record<string, { total: number; withoutTab: number }>;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Copy / download the visible file, or download the whole project as a ZIP (form values included). */
export function startDownloads({ files, fetched, previewUrl, values, title, variants, zipCounts }: DownloadsOptions): void {
  const zipAction = document.querySelector<HTMLElement>("#download-zip");
  const showZipCount = () => {
    const counts = variants && zipCounts?.[variants.active().id];
    if (!counts || !zipAction) return;
    zipAction.closest<HTMLElement>(".zip-action")!.dataset.count = zipBadge(counts.total);
    setAction(zipAction, "file-zip", zipLabel(counts.total, counts.withoutTab));
  };
  document.addEventListener(VARIANT_EVENT, showZipCount);
  showZipCount();

  const current = () => {
    const path = document.querySelector<HTMLElement>(".code:not([hidden])")?.dataset.file;
    const text = path === undefined ? undefined : projectFiles(files, values())[path];
    return path === undefined || text === undefined ? undefined : { path, text };
  };

  document.querySelector<HTMLElement>("#copy-file")?.addEventListener("click", async (event) => {
    const file = current();
    if (!file) return;
    const button = event.currentTarget as HTMLElement;
    try {
      await navigator.clipboard.writeText(file.text);
      flash(button, "check", "Copied");
    } catch {
      flash(button, "exclamation-mark-triangle", "Copy failed");
    }
  });

  document.querySelector("#download-file")?.addEventListener("click", () => {
    const file = current();
    if (file) save(file.path.split("/").pop()!, file.text, "text/plain;charset=utf-8");
  });

  zipAction?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLElement;
    const variant = variants?.active();
    const folder = variant ? `${slugify(title)}-${variant.id}` : slugify(title);
    // A variant's ZIP is its own folder, at the root of the archive.
    const own = <T>(record: Record<string, T>) => (variant ? inFolder(record, variant.dir) : record);
    const toFetch = variant ? fetched.filter((path) => path.startsWith(`${variant.dir}/`)) : fetched;
    try {
      const extra = await Promise.all(toFetch.map(async (path) => [path, await fetchBytes(publishedUrl(previewUrl, path))] as const));
      const content = own({ ...projectFiles(files, values()), ...Object.fromEntries(extra) });
      save(`${folder}.zip`, await buildZip(content, folder), "application/zip");
    } catch {
      flash(button, "exclamation-mark-triangle", "Download failed");
    }
  });
}
