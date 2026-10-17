import { describe, expect, it } from "vitest";
import { buildPreviewHtml, previewPageKey, previewPageLoader, previewPagesOf, previewStorageKey, variantPreviewPage } from "./build-html.ts";

const files = {
  "index.html": `<!doctype html>
<html>
  <head>
    <script type="module" src="https://js.arcgis.com/5.1/"></script>
    <link rel="stylesheet" href="./style.css" />
    <script type="module" src="./js/main.js"></script>
  </head>
  <body></body>
</html>`,
  "js/main.js": 'console.log("hi"); const s = "</script>";',
  "style.css": "body { margin: 0; }",
};

describe("buildPreviewHtml", () => {
  const html = buildPreviewHtml(files);

  it("inlines local scripts and stylesheets, keeping attributes", () => {
    expect(html).toContain('<script type="module">\nconsole.log("hi");');
    expect(html).toContain("<style>\nbody { margin: 0; }\n</style>");
    expect(html).not.toContain('href="./style.css"');
  });

  it("keeps remote scripts (CDN) untouched", () => {
    expect(html).toContain('<script type="module" src="https://js.arcgis.com/5.1/"></script>');
  });

  it("escapes </script inside inlined code", () => {
    expect(html).toContain('const s = "<\\/script>";');
  });

  it("injects the clicker key forwarder first in <head>", () => {
    expect(html).toMatch(/<head>\n<script>addEventListener\("keydown"/);
    expect(html.indexOf("ics:console-reset")).toBeLessThan(html.indexOf('<script type="module"'));
    expect(html).toContain('"ics:step-key"');
    expect(html).toContain('e.key==="Escape"&&!e.defaultPrevented');
  });

  it("leaves unknown local references as they are", () => {
    expect(buildPreviewHtml({ "index.html": '<head></head><script src="missing.js"></script>' })).toContain(
      '<script src="missing.js"></script>',
    );
  });

  it("requires an index.html entry", () => {
    expect(() => buildPreviewHtml({ "main.js": "" })).toThrow(/Preview entry index\.html not found in code\//);
  });
});

describe("variant preview pages", () => {
  it("keep one storage slot per variant and target", () => {
    expect(previewStorageKey("iframe")).toBe("ics:preview:iframe");
    expect(previewStorageKey("tab", "web")).toBe("ics:preview:tab:web");
    expect(previewStorageKey("iframe", undefined, "rest")).toBe("ics:preview:rest:iframe");
    expect(previewStorageKey("tab", "web", "rest")).toBe("ics:preview:rest:tab:web");
  });

  it("read the variant's slot for the requested target", () => {
    const page = variantPreviewPage("web");
    expect(page).toContain('"iframe":"ics:preview:iframe:web"');
    expect(page).toContain('"tab":"ics:preview:tab:web"');
    expect(page).toContain("document.write(html)");
    expect(variantPreviewPage("web", "rest")).toContain('"iframe":"ics:preview:rest:iframe:web"');
  });
});

describe("files changed by form values", () => {
  const baseUrl = "https://example.test/repo/preview/";
  const defaults = {
    "index.html": '<html><head><script type="module" src="./main.js"></script></head><body></body></html>',
    "main.js": 'import { clientId } from "./config.js";\nimport "./lib/util.js";',
    "config.js": 'import { helper } from "./lib/util.js";\nexport const clientId = "YOUR_CLIENT_ID";',
    "lib/util.js": "export const helper = 1;",
    "callback.html": '<html><head><script type="module" src="./config.js"></script></head></html>',
  };
  const files = { ...defaults, "config.js": defaults["config.js"].replace("YOUR_CLIENT_ID", "abc") };
  const importMap = (html: string) => JSON.parse(/<script type="importmap">(.*?)<\/script>/.exec(html)![1]!) as { imports: Record<string, string>; scopes?: Record<string, Record<string, string>> };
  const dataSource = (url: string) => decodeURIComponent(url.slice(url.indexOf(",") + 1));

  it("map the changed file's URL to a data: module with absolute relative imports", () => {
    const html = buildPreviewHtml(files, "index.html", { baseUrl, defaults });
    const { imports } = importMap(html);
    expect(Object.keys(imports)).toEqual([`${baseUrl}config.js`]);
    expect(imports[`${baseUrl}config.js`]).toMatch(/^data:text\/javascript;charset=utf-8,/);
    expect(dataSource(imports[`${baseUrl}config.js`]!)).toBe(`import { helper } from "${baseUrl}lib/util.js";\nexport const clientId = "abc";`);
    // The inlined entry module keeps importing by URL: the map redirects it.
    expect(html).toContain(`import { clientId } from "${baseUrl}config.js";`);
  });

  it("puts the forwarder, the import map and the fetch override first in <head>", () => {
    const html = buildPreviewHtml(files, "index.html", { baseUrl, defaults });
    const forwarder = html.indexOf('addEventListener("keydown"');
    const capture = html.indexOf('ics:console-reset');
    const importMapIndex = html.indexOf('<script type="importmap">');
    const fetchOverride = html.indexOf('var f=window.fetch');
    const authorScript = html.indexOf('<script type="module">');
    expect(forwarder).toBeGreaterThan(html.indexOf("<head>"));
    expect(capture).toBeGreaterThan(forwarder);
    expect(importMapIndex).toBeGreaterThan(capture);
    expect(fetchOverride).toBeGreaterThan(importMapIndex);
    expect(authorScript).toBeGreaterThan(fetchOverride);
    expect(html).toContain(`"${baseUrl}config.js":["text/javascript; charset=utf-8",`);
  });

  it("leave a page without changed files as before", () => {
    const html = buildPreviewHtml(defaults, "index.html", { baseUrl, defaults });
    expect(html).not.toContain("importmap");
    expect(html).not.toContain("window.fetch");
  });

  it("merge into the page's own import map, redirecting its mappings to changed files", () => {
    const entry = '<html><head><script type="importmap">{"imports":{"config":"./config.js","lit":"https://cdn.test/lit.js"},"scopes":{"./lib/":{"cfg":"./config.js"}}}</script></head></html>';
    const html = buildPreviewHtml({ ...files, "index.html": entry }, "index.html", { baseUrl, defaults: { ...defaults, "index.html": entry } });
    expect(html.match(/importmap/g)).toHaveLength(1);
    const map = importMap(html);
    expect(map.imports.config).toBe(map.imports[`${baseUrl}config.js`]);
    expect(map.imports.lit).toBe("https://cdn.test/lit.js");
    expect(map.scopes!["./lib/"]!.cfg).toBe(map.imports.config);
  });

  it("build other pages from their own folder", () => {
    const html = buildPreviewHtml({ ...files, "auth/callback.html": '<head><script src="../config.js"></script></head>' }, "auth/callback.html", { baseUrl, defaults });
    expect(html).toContain('export const clientId = "abc";');
  });
});

describe("other preview pages", () => {
  it("are the HTML files of web projects but the entry", () => {
    expect(previewPagesOf(["index.html", "callback.html", "auth/done.html", "main.js"])).toEqual(["callback.html", "auth/done.html"]);
    expect(previewPagesOf(["main.py", "page.html"])).toEqual([]);
    expect(previewPagesOf(["web/index.html", "web/callback.html", "python/page.html"], ["web", "python"])).toEqual(["web/callback.html"]);
  });

  it("have a storage slot per path, variant and tutorial", () => {
    expect(previewPageKey("callback.html")).toBe("ics:preview:page:callback.html");
    expect(previewPageKey("callback.html", "web", "rest")).toBe("ics:preview:rest:page:web:callback.html");
  });

  it("load the stored page, else the page with code defaults", () => {
    const page = previewPageLoader("ics:preview:page:callback.html", "<p>default</script>");
    expect(page).toContain('localStorage.getItem("ics:preview:page:callback.html")');
    expect(page).toContain('"\\u003cp>default\\u003c/script>"');
    expect(page).not.toContain("</script>\"");
  });
});

it("installs the capture before author scripts when the page omits an explicit head", () => {
  const html = buildPreviewHtml({ "index.html": '<script>console.log("early")</script>' });
  expect(html.indexOf("ics:console-reset")).toBeLessThan(html.indexOf('console.log("early")'));
});
