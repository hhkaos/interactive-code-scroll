const storageKey = (target: string) => `ics:preview:${target}`;

/**
 * Inlines local scripts and stylesheets into the entry HTML so it runs via
 * `document.write` without a file server.
 */
export function buildPreviewHtml(files: Record<string, string>, entry = "index.html"): string {
  const html = files[entry];
  if (html === undefined) throw new Error(`Preview entry ${entry} not found`);
  const local = (path: string) => files[path.replace(/^\.\//, "")];

  return html
    .replace(/<script([^>]*?)\ssrc="([^"]+)"([^>]*)><\/script>/g, (tag, before: string, src: string, after: string) => {
      const content = local(src);
      return content === undefined ? tag : `<script${before}${after}>\n${content}\n</script>`;
    })
    .replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (tag, href: string) => {
      const content = local(href);
      return content === undefined ? tag : `<style>\n${content}\n</style>`;
    });
}

/**
 * Stores the preview and returns the URL of the standalone preview page.
 * Both the iframe and the new tab load a real same-origin URL (not srcdoc):
 * the ArcGIS SDK derives the OAuth redirect_uri from `location`, which is
 * `about:srcdoc` inside a srcdoc iframe.
 */
export function storePreview(html: string, target: "iframe" | "tab", previewPageUrl: string): string {
  localStorage.setItem(storageKey(target), html);
  const url = new URL(previewPageUrl, location.href);
  url.searchParams.set("target", target);
  return url.href;
}

/** Called by the standalone preview page. */
export function renderStoredPreview(): void {
  const target = new URLSearchParams(location.search).get("target") ?? "tab";
  const html = localStorage.getItem(storageKey(target));
  if (html === null) {
    document.body.textContent = "No preview available. Open it from the tutorial.";
    return;
  }
  document.open();
  document.write(html);
  document.close();
}
