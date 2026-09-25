import { applyVars, type ParsedSource } from "./markers.ts";

export interface ParsedFile {
  path: string;
  parsed: ParsedSource;
}

/** Final project files: markers stripped, form values (or code defaults) applied. */
export function projectFiles(files: readonly ParsedFile[], values: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f.path, applyVars(f.parsed, values)]));
}

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

/** ZIP with every file under a single top-level folder. */
export async function buildZip(files: Readonly<Record<string, string>>, folder: string): Promise<Uint8Array<ArrayBuffer>> {
  const { strToU8, zipSync } = await import("fflate");
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [`${folder}/${path}`, strToU8(text)])));
}
