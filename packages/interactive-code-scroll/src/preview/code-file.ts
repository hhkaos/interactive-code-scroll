import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { binaries, codeDir, files, frontmatter } from "virtual:interactive-code-scroll/tutorial";
import { readTutorialConfig } from "../frontmatter.ts";
import { parseSource } from "../markers.ts";
import { PREVIEW_ENTRY, variantPreviewPage } from "./build-html.ts";
import { contentType } from "./content-type.ts";

export const prerender = true;

/**
 * Publishes every `code/` file next to the preview page, so relative references resolve
 * there (e.g. the OAuth popup callback page) and the ZIP can fetch files the page does not
 * embed. Text files have markers stripped and code defaults; binaries are copied as is.
 * `index.html` is the preview page itself; with code variants, each web variant's
 * `<dir>/index.html` is that variant's preview page.
 */
export const getStaticPaths = (() => {
  const { variants } = readTutorialConfig(frontmatter);
  const pages = new Map(variants?.map((v) => [`${v.dir}/${PREVIEW_ENTRY}`, v.id]));
  return [
    ...files
      .filter((f) => variants !== undefined || f.path !== PREVIEW_ENTRY)
      .map((f) => ({ params: { file: f.path }, props: { path: f.path, binary: false, page: pages.get(f.path) } })),
    ...binaries.map((path) => ({ params: { file: path }, props: { path, binary: true, page: undefined } })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { path, binary, page } = props as { path: string; binary: boolean; page?: string };
  if (page !== undefined) return new Response(variantPreviewPage(page), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  const body = binary
    ? new Uint8Array(readFileSync(join(codeDir, path)))
    : parseSource(files.find((f) => f.path === path)!.source, `code/${path}`).code;
  return new Response(body, { headers: { "Content-Type": contentType(path, binary) } });
};
