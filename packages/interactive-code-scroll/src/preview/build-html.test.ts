import { describe, expect, it } from "vitest";
import { buildPreviewHtml } from "./build-html.ts";

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
    expect(html).toContain('"ics:step-key"');
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
