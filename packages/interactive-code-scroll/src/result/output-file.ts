import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { series, tutorials } from "virtual:interactive-code-scroll/tutorial";
import { isTextOutput } from "../output.ts";
import { contentType } from "../preview/content-type.ts";
import { tutorialFor } from "../tutorial-data.ts";

export const prerender = true;

/**
 * Publishes every `output/` file as is: the Result pane fetches captured outputs when shown.
 * In a series site, each tutorial's outputs live under `/<slug>/output/`.
 */
export const getStaticPaths = (() =>
  tutorials.flatMap(({ slug, outputs }) =>
    outputs.map((path) => ({ params: series ? { tutorial: slug, file: path } : { file: path }, props: { slug, path } })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { slug, path } = props as { slug: string; path: string };
  const { outputDir } = tutorialFor(tutorials, slug);
  return new Response(new Uint8Array(readFileSync(join(outputDir, path))), { headers: { "Content-Type": contentType(path, !isTextOutput(path)) } });
};
