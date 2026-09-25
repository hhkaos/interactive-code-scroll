import { parseSource, type ParsedSource } from "../../shared/markers.ts";

export interface TutorialFile {
  path: string;
  lang: string;
  parsed: ParsedSource;
}

const raw = import.meta.glob<string>("../../tutorial/code/*", { query: "?raw", import: "default", eager: true });
const images = import.meta.glob<string>("../../tutorial/images/*", { query: "?url", import: "default", eager: true });

const basename = (p: string) => p.split("/").pop()!;

export const files: TutorialFile[] = Object.entries(raw).map(([p, source]) => {
  const path = basename(p);
  return { path, lang: path.split(".").pop()!, parsed: parseSource(source) };
});

export const imageUrls: Record<string, string> = Object.fromEntries(
  Object.entries(images).map(([p, url]) => [basename(p), url]),
);

export const varDefaults: Record<string, string> = Object.fromEntries(
  files.flatMap((f) => f.parsed.vars.map((v) => [v.name, v.defaultValue])),
);
