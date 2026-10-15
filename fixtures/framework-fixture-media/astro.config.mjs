import { defineConfig } from "astro/config";
import { interactiveCodeScroll } from "interactive-code-scroll";

// Used by `astro check` only: dev/build/serve go through the CLI, which detects tutorials/ on its own.
export default defineConfig({
  integrations: [interactiveCodeScroll({ tutorials: "tutorials" })],
});
