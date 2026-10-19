import type { APIRoute, GetStaticPaths } from "astro";
import { base, seriesIndex, site, tutorials } from "virtual:interactive-code-scroll/tutorial";
import { readIndexConfig, readTutorialConfig } from "../frontmatter.ts";
import { llmsTxt, MARKDOWN_NAME } from "../llm-markdown.ts";
import { sortCards } from "../series.ts";
import { tutorialBase } from "../tutorial-data.ts";
import { publicUrl } from "./urls.ts";

export const prerender = true;

const listed = () =>
  sortCards(
    tutorials.flatMap(({ slug, frontmatter }) => {
      const config = readTutorialConfig(frontmatter);
      return config.llms ? [{ slug, config, title: config.title, ...(config.order === undefined ? {} : { order: config.order }) }] : [];
    }),
  );

/** `/llms.txt` lists every tutorial's Markdown; no file when every tutorial opts out (`llms: false`). */
export const getStaticPaths = (() => (listed().length === 0 ? [] : [{ params: { llms: "llms" } }])) satisfies GetStaticPaths;

export const GET: APIRoute = () => {
  const entries = listed();
  const single = entries.length === 1 && entries[0]!.slug === "";
  const index = seriesIndex ? readIndexConfig(seriesIndex.frontmatter) : undefined;
  const title = single ? entries[0]!.config.title : (index?.title ?? "Tutorials");
  const description = single ? entries[0]!.config.description : index?.description;
  const text = llmsTxt(
    title,
    description,
    entries.map(({ slug, config }) => {
      const page = tutorialBase(base, slug);
      return {
        title: config.title,
        ...(config.description === undefined ? {} : { description: config.description }),
        href: publicUrl(`${page}${MARKDOWN_NAME}.md`, site),
        ...(config.variants ? { variants: config.variants.map((v) => ({ label: v.label, href: publicUrl(`${page}${MARKDOWN_NAME}.${v.id}.md`, site) })) } : {}),
      };
    }),
  );
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
