import { applyVars, type ParsedSource } from "./markers.ts";

export interface ParsedFile {
  path: string;
  parsed: ParsedSource;
}

/** Final project files: markers stripped, form values (or code defaults) applied. */
export function projectFiles(files: readonly ParsedFile[], values: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f.path, applyVars(f.parsed, values)]));
}

/** The files under `dir/`, keyed by their path inside it: a code variant's own project. */
export function inFolder<T>(files: Readonly<Record<string, T>>, dir: string): Record<string, T> {
  const prefix = `${dir}/`;
  return Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, content]) => [path.slice(prefix.length), content]),
  );
}

/** Tooltip and accessible name of the ZIP action. */
export function zipLabel(total: number, withoutTab: number): string {
  const plural = (n: number) => `${n} ${n === 1 ? "file" : "files"}`;
  return `Download project (ZIP) · ${plural(total)}${withoutTab > 0 ? ` (${withoutTab} not shown in tabs)` : ""}`;
}

/** Count shown on the ZIP action's badge. */
export const zipBadge = (total: number) => (total > 99 ? "99+" : String(total));

/** Folder / file-name friendly version of a tutorial title. */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tutorial";
}

/** ZIP with every file under a single top-level folder; text is UTF-8, bytes are stored as is. */
export async function buildZip(
  files: Readonly<Record<string, string | Uint8Array>>,
  folder: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const { strToU8, zipSync } = await import("fflate");
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [`${folder}/${path}`, typeof content === "string" ? strToU8(content) : content]),
    ),
  );
}

/** URL of a `code/` file published next to the preview page (each path segment encoded). */
export function publishedUrl(previewUrl: string, path: string): string {
  return previewUrl + path.split("/").map(encodeURIComponent).join("/");
}
