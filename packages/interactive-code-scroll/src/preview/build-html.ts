export const PREVIEW_ENTRY = "index.html";

/** Forwards clicker keys from the preview to the tutorial (arrows stay with the app, e.g. map panning). */
const KEY_FORWARDER = `<script>addEventListener("keydown",function(e){if((e.key==="PageDown"||e.key==="PageUp")&&parent!==window){parent.postMessage({type:"ics:step-key",key:e.key},location.origin)}})</script>`;

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
