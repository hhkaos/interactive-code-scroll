import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import type { AstroIntegration } from "astro";
import { tutorialModule } from "./tutorial-module.ts";

export interface InteractiveCodeScrollOptions {
  /** Tutorial folder (holds `tutorial.mdx`, `code/`, `images/`), relative to the project root. */
  tutorial?: string;
}

export function interactiveCodeScroll(options: InteractiveCodeScrollOptions = {}): AstroIntegration {
  return {
    name: "interactive-code-scroll",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, injectRoute }) => {
        const tutorialDir = new URL(`${options.tutorial ?? "tutorial"}/`, config.root);
        const mdxPath = fileURLToPath(new URL("tutorial.mdx", tutorialDir));
        if (!existsSync(mdxPath)) throw new Error(`interactive-code-scroll: tutorial not found at ${mdxPath}`);

        updateConfig({
          integrations: [mdx()],
          vite: {
            plugins: [tutorialModule(mdxPath)],
            // pnpm does not hoist `cookie`; bundle it so Node never resolves a stray copy up the tree.
            environments: { prerender: { resolve: { noExternal: ["cookie"] } } },
          },
        });
        injectRoute({ pattern: "/", entrypoint: new URL("./pages/index.astro", import.meta.url) });
      },
    },
  };
}
