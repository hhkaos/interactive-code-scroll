import type { APIRoute, GetStaticPaths } from "astro";
import { files } from "virtual:interactive-code-scroll/tutorial";
import { parseSource } from "../markers.ts";
import { PREVIEW_ENTRY } from "./build-html.ts";
import { contentType } from "./content-type.ts";

export const prerender = true;

/**
 * Publishes every `code/` file (markers stripped, code defaults) next to the preview
 * page, so relative references resolve there: e.g. the OAuth popup callback page.
 * `index.html` is the preview page itself.
 */
export const getStaticPaths = (() =>
  files
    .filter((f) => f.path !== PREVIEW_ENTRY)
    .map((f) => ({
      params: { file: f.path },
      props: { path: f.path, code: parseSource(f.source, `code/${f.path}`).code },
    }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { path, code } = props as { path: string; code: string };
  return new Response(code, { headers: { "Content-Type": contentType(path) } });
};
