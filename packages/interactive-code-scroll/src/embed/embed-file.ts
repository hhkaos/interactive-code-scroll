import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { series, tutorials } from "virtual:interactive-code-scroll/tutorial";
import { contentType } from "../preview/content-type.ts";
import { tutorialFor } from "../tutorial-data.ts";
import { isBinary } from "../visible-files.ts";

export const prerender = true;

/**
 * Publishes every `embeds/` file as is (e.g. a slide deck's static build) for the iframe of
 * steps with `embed=`. In a series site, each tutorial's embeds live under `/<slug>/embeds/`.
 * Static hosts serve a folder's `index.html` for `<folder>/`; the dev server only knows these
 * routes, so in dev each such folder also gets one (in a build it would write the same file twice).
 */
export const getStaticPaths = (() =>
  tutorials.flatMap(({ slug, embeds }) => {
    const folders = import.meta.env.DEV ? embeds.filter((p) => p.endsWith("/index.html")).map((p) => ({ file: p.slice(0, -"/index.html".length), path: p })) : [];
    return [...embeds.map((path) => ({ file: path, path })), ...folders].map(({ file, path }) => ({
      params: series ? { tutorial: slug, file } : { file },
      props: { slug, path },
    }));
  })) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { slug, path } = props as { slug: string; path: string };
  const bytes = new Uint8Array(readFileSync(join(tutorialFor(tutorials, slug).embedsDir, path)));
  return new Response(bytes, { headers: { "Content-Type": contentType(path, isBinary(path, bytes)) } });
};
