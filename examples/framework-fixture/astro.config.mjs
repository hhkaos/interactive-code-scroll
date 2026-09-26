import { defineConfig } from "astro/config";
import { interactiveCodeScroll } from "interactive-code-scroll";

export default defineConfig({
  integrations: [interactiveCodeScroll()],
});
