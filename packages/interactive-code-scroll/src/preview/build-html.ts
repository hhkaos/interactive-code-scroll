import { consoleCaptureScript } from "./console.ts";
import { contentType } from "./content-type.ts";

export const PREVIEW_ENTRY = "index.html";

export type PreviewTarget = "iframe" | "tab";

/**
 * Where the tutorial page leaves the assembled HTML for the preview page; one slot per code variant
 * and, in a series site, per tutorial (every tutorial shares the origin's localStorage).
 */
export const previewStorageKey = (target: PreviewTarget, variant?: string, tutorial = "") =>
  ["ics:preview", ...(tutorial === "" ? [] : [tutorial]), target, ...(variant === undefined ? [] : [variant])].join(":");

/**
 * Preview page of a web code variant, published at `preview/<dir>/` so the variant's relative
 * references resolve next to it. Same job as `preview/page.astro`, with an inline script.
 */
export function variantPreviewPage(variant: string, tutorial = ""): string {
  const keys = JSON.stringify({ iframe: previewStorageKey("iframe", variant, tutorial), tab: previewStorageKey("tab", variant, tutorial) });
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Preview</title></head>
<body>
<script>
var keys = ${keys.replace(/</g, "\\u003c")};
var html = localStorage.getItem(new URLSearchParams(location.search).get("target") === "iframe" ? keys.iframe : keys.tab);
if (html === null) document.body.textContent = "No preview available. Open it from the tutorial.";
else { document.open(); document.write(html); document.close(); }
</script>
</body>
</html>
`;
}

/** Storage slot of a project's other HTML page (e.g. an OAuth callback), shared by the iframe and the new tab. */
export const previewPageKey = (path: string, variant?: string, tutorial = "") =>
  ["ics:preview", ...(tutorial === "" ? [] : [tutorial]), "page", ...(variant === undefined ? [] : [variant]), path].join(":");

/**
 * The other HTML pages of each web project (`dirs`: the code variant folders, or `""` without
 * variants): any `.html` file but the entry, in a folder with an `index.html`. The Preview runs them
 * with form values too, through loader pages published at their own URLs.
 */
export function previewPagesOf(paths: readonly string[], dirs: readonly string[] = [""]): string[] {
  return dirs.flatMap((dir) => {
    const prefix = dir === "" ? "" : `${dir}/`;
    if (!paths.includes(`${prefix}${PREVIEW_ENTRY}`)) return [];
    return paths.filter((path) => path.startsWith(prefix) && /\.html$/i.test(path) && path !== `${prefix}${PREVIEW_ENTRY}`);
  });
}

/**
 * Published at a secondary page's own URL, so redirects (OAuth `redirect_uri`) and `window.opener`
 * keep working: writes the page the tutorial stored, or the page with code defaults when it stored none.
 */
export function previewPageLoader(key: string, fallback: string): string {
  const json = (value: string) => JSON.stringify(value).replace(/</g, "\\u003c");
  return `<!doctype html>
<script>
var html = localStorage.getItem(${json(key)});
document.open(); document.write(html === null ? ${json(fallback)} : html); document.close();
</script>
`;
}

/**
 * Forwards clicker keys from the preview to the tutorial (arrows stay with the app, e.g. map panning),
 * and an Esc the app did not handle (it restores a maximized pane).
 */
const KEY_FORWARDER = `<script>addEventListener("keydown",function(e){if((e.key==="PageDown"||e.key==="PageUp"||(e.key==="Escape"&&!e.defaultPrevented))&&parent!==window){parent.postMessage({type:"ics:step-key",key:e.key},location.origin)}})</script>`;

/** Path of a local reference made from the page at `from` (both relative to the project); `undefined` for remote or root-relative ones. */
function localPath(reference: string, from: string): string | undefined {
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(reference)) return undefined;
  return decodeURIComponent(new URL(reference, `file:///${from}`).pathname.slice(1));
}

/** Relative module specifiers in `import … from`, `export … from`, `import "…"` and `import("…")`. */
const RELATIVE_IMPORT = /((?:\bimport|\bfrom)\s*\(?\s*)(["'])(\.{1,2}\/[^"'\r\n]*)\2/g;

/** Relative specifiers made absolute: inlined or `data:` modules no longer sit at their own URL. */
const absoluteImports = (code: string, url: string) =>
  code.replace(RELATIVE_IMPORT, (_, lead: string, quote: string, specifier: string) => `${lead}${quote}${new URL(specifier, url).href}${quote}`);

const isScript = (path: string) => /\.m?js$/i.test(path);
const textType = (path: string) => contentType(path).replace(/;.*/, "");
const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** The page's own import map, if any (`<script type="importmap">`). */
const IMPORT_MAP = /<script\b[^>]*\btype=["']?importmap["']?[^>]*>([\s\S]*?)<\/script>/i;

interface ImportMap {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

/** `fetch()` of a changed file answers with its current content (other requests go to the network). */
const fetchOverride = (contents: Record<string, [string, string]>) =>
  `<script>(function(m){var f=window.fetch;window.fetch=function(i,o){var r=i instanceof Request?i:null;var u=new URL(r?r.url:String(i),document.baseURI);u.hash="";var e=m[u.href];var g=String((o&&o.method)||(r&&r.method)||"GET").toUpperCase()==="GET";return e&&g?Promise.resolve(new Response(e[1],{headers:{"Content-Type":e[0]}})):f.apply(this,arguments)}})(${inlineJson(contents)})</script>`;

export interface PreviewHtmlOptions {
  /** Absolute URL of the folder the project is published in (`preview/`, `preview/<dir>/`). */
  baseUrl: string;
  /** The files with code defaults: files whose content differs (form values) are served from the page. */
  defaults: Readonly<Record<string, string>>;
}

/**
 * Makes files changed by form values reach the page even when it loads them itself: an import map
 * sends their module URLs to `data:` copies (relative imports in those made absolute), and `fetch()`
 * returns their content. HTML pages are left out: they have their own loader pages.
 */
function changedFiles(html: string, files: Readonly<Record<string, string>>, page: string, { baseUrl, defaults }: PreviewHtmlOptions): string {
  const changed = Object.keys(files).filter((path) => !/\.html?$/i.test(path) && defaults[path] !== undefined && files[path] !== defaults[path]);
  if (changed.length === 0) return html;
  const urls = new Map(changed.map((path) => [new URL(path, baseUrl).href, path]));
  const dataUrl = (url: string, path: string) =>
    `data:${textType(path)};charset=utf-8,${encodeURIComponent(isScript(path) ? absoluteImports(files[path]!, url) : files[path]!)}`;
  const modules = Object.fromEntries([...urls].map(([url, path]) => [url, dataUrl(url, path)]));

  // One import map per page in older browsers: the author's, with mappings to changed files redirected, plus these.
  const authored = IMPORT_MAP.exec(html);
  let map: ImportMap = {};
  if (authored) {
    try {
      map = JSON.parse(authored[1]!) as ImportMap;
    } catch {
      return html; // The browser reports the author's invalid import map; leave it as written.
    }
  }
  const pageUrl = new URL(page, baseUrl).href;
  const redirect = (entries: Record<string, string> = {}) =>
    Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, modules[new URL(value, pageUrl).href] ?? value]));
  const merged: ImportMap = {
    imports: { ...redirect(map.imports), ...modules },
    ...(map.scopes && { scopes: Object.fromEntries(Object.entries(map.scopes).map(([scope, entries]) => [scope, redirect(entries)])) }),
  };
  const contents = Object.fromEntries([...urls].map(([url, path]) => [url, [contentType(path), files[path]!] as [string, string]]));
  return (authored ? html.replace(authored[0], "") : html).replace(
    /<head([^>]*)>/i,
    (head) => `${head}\n<script type="importmap">${inlineJson(merged)}</script>\n${fetchOverride(contents)}`,
  );
}

/**
 * Inlines local scripts and stylesheets into a project page (`entry`) so it runs from a preview
 * page via `document.write`, and adds the clicker key forwarder. With `options`, files changed by
 * form values also reach the page when it imports or fetches them.
 */
export function buildPreviewHtml(files: Readonly<Record<string, string>>, entry = PREVIEW_ENTRY, options?: PreviewHtmlOptions): string {
  const html = files[entry];
  if (html === undefined) throw new Error(`Preview entry ${entry} not found in code/`);

  const inlined = html
    .replace(/<script\b([^>]*?)\ssrc="([^"]+)"([^>]*)>\s*<\/script>/gi, (tag, before: string, src: string, after: string) => {
      const path = localPath(src, entry);
      const content = path === undefined ? undefined : files[path];
      if (content === undefined) return tag;
      const code = options ? absoluteImports(content, new URL(path!, options.baseUrl).href) : content;
      // `</script` inside inlined code would close the tag early.
      return `<script${before}${after}>\n${code.replace(/<\/script/gi, "<\\/script")}\n</script>`;
    })
    .replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi, (tag) => {
      const href = /\bhref="([^"]+)"/i.exec(tag)?.[1];
      const path = href === undefined ? undefined : localPath(href, entry);
      const content = path === undefined ? undefined : files[path];
      return content === undefined ? tag : `<style>\n${content}\n</style>`;
    });
  const assembled = options ? changedFiles(inlined, files, entry, options) : inlined;
  const hooks = `${KEY_FORWARDER}\n${consoleCaptureScript()}`;
  return /<head[^>]*>/i.test(assembled)
    ? assembled.replace(/<head[^>]*>/i, (head) => `${head}\n${hooks}`)
    : `${hooks}\n${assembled}`;
}
