import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import { isSatteriProcessor, satteri } from "@astrojs/markdown-satteri";
import type { AstroIntegration } from "astro";
import { tutorialValidation } from "./mdx-validation.ts";
import { tutorialModule } from "./tutorial-module.ts";

export { TutorialValidationError } from "./mdx-validation.ts";

export interface InteractiveCodeScrollOptions {
  /** Tutorial folder (holds `tutorial.mdx`, `code/`, `images/`), relative to the project root. */
  tutorial?: string;
}

export function interactiveCodeScroll(options: InteractiveCodeScrollOptions = {}): AstroIntegration {
  return {
    name: "interactive-code-scroll",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, injectRoute }) => {
        const tutorialDir = fileURLToPath(new URL(`${options.tutorial ?? "tutorial"}/`, config.root));
        const mdxPath = join(tutorialDir, "tutorial.mdx");
        if (!existsSync(mdxPath)) throw new Error(`interactive-code-scroll: tutorial not found at ${mdxPath}`);

        // MDX gets its own Sätteri processor (inheriting the project's options) plus reference validation.
        const markdown = config.markdown.processor;
        const base = markdown && isSatteriProcessor(markdown) ? markdown.options : undefined;
        const processor = satteri({ ...base, mdastPlugins: [...(base?.mdastPlugins ?? []), tutorialValidation(tutorialDir)] });

        updateConfig({
          integrations: [mdx({ processor })],
          vite: {
            plugins: [tutorialModule(tutorialDir)],
            // pnpm does not hoist `cookie`; bundle it so Node never resolves a stray copy up the tree.
            environments: { prerender: { resolve: { noExternal: ["cookie"] } } },
          },
        });
        injectRoute({ pattern: "/", entrypoint: new URL("./pages/index.astro", import.meta.url) });
        injectRoute({ pattern: "/preview", entrypoint: new URL("./preview/page.astro", import.meta.url) });
        injectRoute({
          pattern: "/preview/oauth-callback.html",
          entrypoint: new URL("./preview/oauth-callback.ts", import.meta.url),
        });
      },
    },
  };
}
