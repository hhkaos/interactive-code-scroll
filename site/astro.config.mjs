import { defineConfig } from "astro/config";
import { base, site } from "./site-config.mjs";

export default defineConfig({
  site,
  base,
  // Same as the core integration: bundle Astro's `cookie` import so a stray older copy up the tree never wins.
  vite: { environments: { prerender: { resolve: { noExternal: ["cookie"] } } } },
});
