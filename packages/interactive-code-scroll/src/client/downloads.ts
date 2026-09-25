import { buildZip, projectFiles, slugify, type ParsedFile } from "../downloads.ts";
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
  values: () => Record<string, string>;
  title: string;
}

/** Copy / download the visible file, or download the whole project as a ZIP (form values included). */
export function startDownloads({ files, values, title }: DownloadsOptions): void {
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

  document.querySelector("#download-zip")?.addEventListener("click", async () => {
    const folder = slugify(title);
    save(`${folder}.zip`, await buildZip(projectFiles(files, values()), folder), "application/zip");
  });
}
