import { defineConfig } from "astro/config";
// Source, not the built package: like the CLI's generated config, so changes need no package build.
import { interactiveCodeScroll } from "../../packages/interactive-code-scroll/src/index.ts";

export default defineConfig({
  integrations: [interactiveCodeScroll({ tutorials: "tutorials" })],
});
