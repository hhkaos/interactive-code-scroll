import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  integrations: [mdx()],
  // pnpm does not hoist `cookie`; bundle it so Node never resolves a stray copy up the tree.
  vite: { environments: { prerender: { resolve: { noExternal: ["cookie"] } } } },
});
