import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";

export default defineConfig({
  base: "./",
  plugins: [{ enforce: "pre", ...mdx() }, react({ include: /\.(mdx|tsx?)$/ })],
  build: {
    rollupOptions: { input: { main: "index.html", preview: "preview.html" } },
  },
});
