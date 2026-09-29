import { buildZip, projectFiles, publishedUrl, slugify, type ParsedFile } from "../downloads.ts";
import { setAction } from "./actions.ts";

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
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Copy / download the visible file, or download the whole project as a ZIP (form values included). */
export function startDownloads({ files, fetched, previewUrl, values, title }: DownloadsOptions): void {

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

  document.querySelector<HTMLElement>("#download-zip")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLElement;
    const folder = slugify(title);
    try {
      const extra = await Promise.all(fetched.map(async (path) => [path, await fetchBytes(publishedUrl(previewUrl, path))] as const));
      const content = { ...projectFiles(files, values()), ...Object.fromEntries(extra) };
      save(`${folder}.zip`, await buildZip(content, folder), "application/zip");
    } catch {
      flash(button, "exclamation-mark-triangle", "Download failed");
    }
  });
}
