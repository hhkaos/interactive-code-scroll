import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import { isSatteriProcessor, satteri } from "@astrojs/markdown-satteri";
import type { AstroIntegration } from "astro";
import { tutorialValidation } from "./mdx-validation.ts";
import { discoverTutorials } from "./series.ts";
import { tutorialModule, type TutorialSource } from "./tutorial-module.ts";

export { TutorialValidationError } from "./mdx-validation.ts";

export interface InteractiveCodeScrollOptions {
  /** Tutorial folder (holds `tutorial.mdx`, `code/`, `images/`), relative to the project root. */
  tutorial?: string;
  /**
   * Series site: folder whose subfolders are tutorials (`<dir>/<slug>/tutorial.mdx`), each
   * published at `/<slug>/`, with an index page at `/`. Cannot be combined with `tutorial`.
   */
  tutorials?: string;
}

export function interactiveCodeScroll(options: InteractiveCodeScrollOptions = {}): AstroIntegration {
  return {
    name: "interactive-code-scroll",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, injectRoute, logger }) => {
        if (options.tutorial !== undefined && options.tutorials !== undefined) {
          throw new Error('interactive-code-scroll: use either "tutorial" (one tutorial) or "tutorials" (a series site), not both');
        }
        const seriesDir = options.tutorials === undefined ? undefined : fileURLToPath(new URL(`${options.tutorials}/`, config.root));
        const series = seriesDir !== undefined;
        const sources: TutorialSource[] = series
          ? discoverTutorials(seriesDir, (message) => logger.warn(message))
          : [{ slug: "", dir: singleTutorial(config.root, options.tutorial ?? "tutorial") }];

        // MDX gets its own Sätteri processor (inheriting the project's options) plus reference validation.
        const markdown = config.markdown.processor;
        const base = markdown && isSatteriProcessor(markdown) ? markdown.options : undefined;
        const validation = tutorialValidation(
          sources.map((s) => s.dir),
          (message) => logger.warn(message),
          seriesDir,
        );
        const processor = satteri({ ...base, mdastPlugins: [...(base?.mdastPlugins ?? []), validation] });

        updateConfig({
          integrations: [mdx({ processor })],
          vite: {
            plugins: [tutorialModule(sources, seriesDir)],
            // pnpm does not hoist `cookie`; bundle it so Node never resolves a stray copy up the tree.
            environments: { prerender: { resolve: { noExternal: ["cookie"] } } },
          },
        });
        // One set of routes; in a series each is prefixed with the tutorial's slug.
        const prefix = series ? "/[tutorial]" : "";
        if (series) injectRoute({ pattern: "/", entrypoint: new URL("./pages/series-index.astro", import.meta.url) });
        injectRoute({ pattern: prefix || "/", entrypoint: new URL("./pages/index.astro", import.meta.url) });
        injectRoute({ pattern: `${prefix}/preview`, entrypoint: new URL("./preview/page.astro", import.meta.url) });
        injectRoute({ pattern: `${prefix}/preview/[...file]`, entrypoint: new URL("./preview/code-file.ts", import.meta.url) });
        injectRoute({ pattern: `${prefix}/output/[...file]`, entrypoint: new URL("./result/output-file.ts", import.meta.url) });
      },
    },
  };
}

function singleTutorial(root: URL, folder: string): string {
  const tutorialDir = fileURLToPath(new URL(`${folder}/`, root));
  const mdxPath = join(tutorialDir, "tutorial.mdx");
  if (!existsSync(mdxPath)) throw new Error(`interactive-code-scroll: tutorial not found at ${mdxPath}`);
  return tutorialDir;
}
