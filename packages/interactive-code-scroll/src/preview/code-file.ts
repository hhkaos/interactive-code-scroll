import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { binaries, codeDir, files } from "virtual:interactive-code-scroll/tutorial";
import { parseSource } from "../markers.ts";
import { PREVIEW_ENTRY } from "./build-html.ts";
import { contentType } from "./content-type.ts";

export const prerender = true;

/**
 * Publishes every `code/` file next to the preview page, so relative references resolve
 * there (e.g. the OAuth popup callback page) and the ZIP can fetch files the page does not
 * embed. Text files have markers stripped and code defaults; binaries are copied as is.
 * `index.html` is the preview page itself.
 */
export const getStaticPaths = (() => [
  ...files
    .filter((f) => f.path !== PREVIEW_ENTRY)
    .map((f) => ({ params: { file: f.path }, props: { path: f.path, binary: false } })),
  ...binaries.map((path) => ({ params: { file: path }, props: { path, binary: true } })),
]) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { path, binary } = props as { path: string; binary: boolean };
  const body = binary
    ? new Uint8Array(readFileSync(join(codeDir, path)))
    : parseSource(files.find((f) => f.path === path)!.source, `code/${path}`).code;
  return new Response(body, { headers: { "Content-Type": contentType(path, binary) } });
};
