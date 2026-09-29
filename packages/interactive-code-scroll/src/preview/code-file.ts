import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { series, tutorials } from "virtual:interactive-code-scroll/tutorial";
import { readTutorialConfig } from "../frontmatter.ts";
import { parseSource } from "../markers.ts";
import { tutorialFor } from "../tutorial-data.ts";
import { PREVIEW_ENTRY, variantPreviewPage } from "./build-html.ts";
import { contentType } from "./content-type.ts";

export const prerender = true;

/**
 * Publishes every `code/` file next to the preview page, so relative references resolve
 * there (e.g. the OAuth popup callback page) and the ZIP can fetch files the page does not
 * embed. Text files have markers stripped and code defaults; binaries are copied as is.
 * `index.html` is the preview page itself; with code variants, each web variant's
 * `<dir>/index.html` is that variant's preview page. In a series site, each tutorial's files
 * live under `/<slug>/preview/`.
 */
export const getStaticPaths = (() =>
  tutorials.flatMap(({ slug, frontmatter, files, binaries }) => {
    const { variants } = readTutorialConfig(frontmatter);
    const pages = new Map(variants?.map((v) => [`${v.dir}/${PREVIEW_ENTRY}`, v.id]));
    const params = (file: string) => (series ? { tutorial: slug, file } : { file });
    return [
      ...files
        .filter((f) => variants !== undefined || f.path !== PREVIEW_ENTRY)
        .map((f) => ({ params: params(f.path), props: { slug, path: f.path, binary: false, page: pages.get(f.path) } })),
      ...binaries.map((path) => ({ params: params(path), props: { slug, path, binary: true, page: undefined } })),
    ];
  })) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { slug, path, binary, page } = props as { slug: string; path: string; binary: boolean; page?: string };
  if (page !== undefined) return new Response(variantPreviewPage(page, slug), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  const { codeDir, files } = tutorialFor(tutorials, slug);
  const body = binary
    ? new Uint8Array(readFileSync(join(codeDir, path)))
    : parseSource(files.find((f) => f.path === path)!.source, `code/${path}`).code;
  return new Response(body, { headers: { "Content-Type": contentType(path, binary) } });
};
