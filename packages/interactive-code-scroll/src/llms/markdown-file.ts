import type { APIRoute, GetStaticPaths } from "astro";
import { base, series, site, tutorials } from "virtual:interactive-code-scroll/tutorial";
import { readTutorialConfig } from "../frontmatter.ts";
import { markdownNames, markdownPartsOf, markdownVariant, tutorialMarkdown } from "../llm-markdown.ts";
import { tutorialBase, tutorialFor } from "../tutorial-data.ts";
import { publicUrl } from "./urls.ts";

export const prerender = true;

/** `tutorial.md` and `tutorial.<variant>.md` of each tutorial without `llms: false` (SPEC: Markdown for LLMs). */
export const getStaticPaths = (() =>
  tutorials.flatMap(({ slug, frontmatter }) => {
    const config = readTutorialConfig(frontmatter);
    if (!config.llms) return [];
    return markdownNames(config.variants).map((markdown) => ({
      params: series ? { tutorial: slug, markdown } : { markdown },
      props: { slug, markdown },
    }));
  })) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { slug, markdown } = props as { slug: string; markdown: string };
  const tutorial = tutorialFor(tutorials, slug);
  const config = readTutorialConfig(tutorial.frontmatter);
  const page = tutorialBase(base, slug);
  const url = (path: string) => (/^[a-z][a-z\d+.-]*:/i.test(path) ? path : publicUrl(path.startsWith("/") ? path : `${page}${path}`, site));
  const text = tutorialMarkdown({
    parts: markdownPartsOf(tutorial.frontmatter),
    config,
    frontmatter: tutorial.frontmatter,
    files: tutorial.files,
    variant: markdownVariant(config.variants, markdown),
    pageUrl: url(page),
    url,
    images: tutorial.images,
  });
  return new Response(text, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
