import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { outputDir, outputs } from "virtual:interactive-code-scroll/tutorial";
import { isTextOutput } from "../output.ts";
import { contentType } from "../preview/content-type.ts";

export const prerender = true;

/** Publishes every `output/` file as is: the Result pane fetches captured outputs when shown. */
export const getStaticPaths = (() => outputs.map((path) => ({ params: { file: path }, props: { path } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { path } = props as { path: string };
  return new Response(new Uint8Array(readFileSync(join(outputDir, path))), { headers: { "Content-Type": contentType(path, !isTextOutput(path)) } });
};
