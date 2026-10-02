import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { docsDir, docsMarkdown, docsPages, repo } from "./docs-config.mjs";
import { base, site } from "./site-config.mjs";

const publicDir = fileURLToPath(new URL("./public/", import.meta.url));

/**
 * `astro dev` does not serve `index.html` for folder URLs in public/ (GitHub Pages and
 * `astro preview` do), so the showcase tutorials 404 at `<base>showcase/<name>/` in dev.
 * @returns {import("astro").AstroIntegration}
 */
function publicFolderIndex() {
  return {
    name: "site:public-folder-index",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, _res, next) => {
          const url = new URL(req.url ?? "/", "http://localhost");
          // Astro has usually stripped the base already; accept both forms.
          const path = url.pathname.startsWith(base) ? url.pathname.slice(base.length - 1) : url.pathname;
          if (path !== "/" && path.endsWith("/") && existsSync(`${publicDir}${decodeURIComponent(path.slice(1))}index.html`)) {
            req.url = `${url.pathname}index.html${url.search}`;
          }
          next();
        });
      },
    },
  };
}

export default defineConfig({
  site,
  base,
  integrations: [
    publicFolderIndex(),
    starlight({
      title: "InteractiveCodeScroll",
      description: "Build guided, interactive code tutorials by writing MDX and annotating source code.",
      favicon: "/favicon.svg",
      social: [{ icon: "github", label: "GitHub", href: repo }],
      sidebar: docsPages.map(({ file, label }) => ({ label, slug: `docs/${file}` })),
      customCss: ["./src/styles/tokens.css", "./src/styles/docs.css"],
      components: {
        SiteTitle: "./src/components/docs/SiteTitle.astro",
        ThemeProvider: "./src/components/docs/ThemeProvider.astro",
        ThemeSelect: "./src/components/docs/ThemeSelect.astro",
      },
      // Asides and heading anchors for docs/*.md, which live outside src/content/docs/.
      markdown: { processedDirs: [docsDir] },
      // The landing page owns the rest of the site.
      disable404Route: true,
    }),
    docsMarkdown(),
  ],
  vite: {
    // Same as the core integration: bundle Astro's `cookie` import so a stray older copy up the tree never wins.
    environments: { prerender: { resolve: { noExternal: ["cookie"] } } },
  },
});
