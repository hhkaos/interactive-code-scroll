import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { base } from "./site-config.mjs";

// The docs site (Starlight, under <base>docs/) renders the repository's docs/*.md in place:
// GitHub and the npm READMEs link to the same files, so there are no copies in site/.

export const repo = "https://github.com/hhkaos/interactive-code-scroll";
export const docsDir = fileURLToPath(new URL("../docs/", import.meta.url));

/** Published pages, in sidebar order. `file` is the Markdown file in docs/ and the page slug. docs/dev/ is never published. */
export const docsPages = [
  { file: "quick-start", label: "Quick start" },
  { file: "features", label: "Features" },
  { file: "authoring", label: "Authoring reference" },
  { file: "presenting", label: "Presenting" },
  { file: "cli", label: "CLI" },
  { file: "deployment", label: "Deployment" },
  { file: "upgrade", label: "Upgrade guide" },
];

/** URL of a published docs page, with an optional `#hash`. */
export const docsPageUrl = (file, hash = "") => `${base}docs/${file}/${hash}`;

/**
 * Title and description of a docs file: its leading `# Heading` and the first paragraph after it.
 * The files have no frontmatter so they read well on GitHub.
 * @param {string} filePath
 */
export function docsFileMeta(filePath) {
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.startsWith("# "));
  if (headingIndex === -1) throw new Error(`${filePath}: docs pages start with a "# Title" heading.`);
  const paragraph = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    if (/^(#|```|[-*|>] |\d+\. )/.test(line)) break;
    paragraph.push(line.trim());
  }
  const description = paragraph
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "");
  return { title: lines[headingIndex].slice(2).trim(), ...(description && { description }) };
}

/**
 * Where a link written in docs/*.md points on the website: sibling pages become docs routes,
 * other relative paths (docs/dev/, examples/…) go to the file on GitHub, the rest is untouched.
 * @param {string} url
 */
export function rewriteDocsLink(url) {
  if (!url || /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(url)) return url;
  const [path = "", hash] = url.split(/(?=#)/);
  const page = docsPages.find(({ file }) => path === `${file}.md` || path === `./${file}.md`);
  if (page) return docsPageUrl(page.file, hash);
  return new URL(url, `${repo}/blob/main/docs/`).href;
}

/** Screenshots are referenced from docs/ as they sit in the repository; the site serves public/ at its base. */
const screenshotsPath = "../site/public/screenshots/";

/**
 * The website version of a light/dark `<picture>` of screenshots: on GitHub the `<source>` follows the OS,
 * on the website both images are rendered and docs.css shows the one matching the page theme.
 * Returns `undefined` for other HTML.
 * @param {string} html
 */
export function rewriteDocsPicture(html) {
  if (!/^\s*<picture>/.test(html) || !html.includes(screenshotsPath)) return undefined;
  const attribute = (source, name) => source.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const img = html.match(/<img\s[^>]*>/)?.[0] ?? "";
  const light = attribute(img, "src");
  const dark = attribute(html.match(/<source\s[^>]*>/)?.[0] ?? "", "srcset") ?? light;
  const alt = attribute(img, "alt") ?? "";
  if (!light?.startsWith(screenshotsPath) || !dark?.startsWith(screenshotsPath)) return undefined;
  const image = (path, scheme) =>
    `<img class="docs-shot-${scheme}" src="${base}screenshots/${path.slice(screenshotsPath.length)}" alt="${alt}" width="1440" height="860" loading="lazy" decoding="async">`;
  return `<div class="docs-shot">${image(dark, "dark")}${image(light, "light")}</div>`;
}

/**
 * Markdown transforms for the docs files: drop the leading `# Heading` (Starlight renders the
 * title), rewrite links with {@link rewriteDocsLink} and screenshots with {@link rewriteDocsPicture}.
 * Registered on the configured Sätteri processor the same way Starlight registers its own transforms.
 * @returns {import("astro").AstroIntegration}
 */
export function docsMarkdown() {
  const plugin = ({ fileURL }) => {
    if (!fileURL || !fileURLToPath(fileURL).startsWith(docsDir)) return;
    const rewrite = (node, ctx) => {
      const url = rewriteDocsLink(node.url);
      if (url !== node.url) ctx.setProperty(node, "url", url);
    };
    return {
      name: "site:docs-files",
      heading(node, ctx) {
        if (node.depth === 1 && ctx.parent(node)?.type === "root") ctx.removeNode(node);
      },
      link: rewrite,
      definition: rewrite,
      html(node, ctx) {
        const html = rewriteDocsPicture(node.value);
        if (html) ctx.setProperty(node, "value", html);
      },
    };
  };
  return {
    name: "site:docs-markdown",
    hooks: {
      "astro:config:setup": ({ config }) => {
        const options = config.markdown?.processor?.options;
        if (!Array.isArray(options?.mdastPlugins)) throw new Error("site:docs-markdown expects the Sätteri Markdown processor.");
        options.mdastPlugins.push(plugin);
      },
    },
  };
}
