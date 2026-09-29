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

/**
 * Forwards clicker keys from the preview to the tutorial (arrows stay with the app, e.g. map panning),
 * and an Esc the app did not handle (it restores a maximized pane).
 */
const KEY_FORWARDER = `<script>addEventListener("keydown",function(e){if((e.key==="PageDown"||e.key==="PageUp"||(e.key==="Escape"&&!e.defaultPrevented))&&parent!==window){parent.postMessage({type:"ics:step-key",key:e.key},location.origin)}})</script>`;

function resolveLocal(files: Readonly<Record<string, string>>, reference: string): string | undefined {
  if (/^(?:[a-z]+:)?\/\//i.test(reference) || reference.startsWith("/")) return undefined;
  return files[reference.replace(/^\.\//, "")];
}

/**
 * Inlines local scripts and stylesheets into the entry HTML so it runs from the
 * preview page via `document.write`, and adds the clicker key forwarder.
 */
export function buildPreviewHtml(files: Readonly<Record<string, string>>, entry = PREVIEW_ENTRY): string {
  const html = files[entry];
  if (html === undefined) throw new Error(`Preview entry ${entry} not found in code/`);

  return html
    .replace(/<head([^>]*)>/i, `<head$1>\n${KEY_FORWARDER}`)
    .replace(/<script\b([^>]*?)\ssrc="([^"]+)"([^>]*)>\s*<\/script>/gi, (tag, before: string, src: string, after: string) => {
      const content = resolveLocal(files, src);
      // `</script` inside inlined code would close the tag early.
      return content === undefined ? tag : `<script${before}${after}>\n${content.replace(/<\/script/gi, "<\\/script")}\n</script>`;
    })
    .replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi, (tag) => {
      const href = /\bhref="([^"]+)"/i.exec(tag)?.[1];
      const content = href === undefined ? undefined : resolveLocal(files, href);
      return content === undefined ? tag : `<style>\n${content}\n</style>`;
    });
}
