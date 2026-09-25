import { describe, expect, it } from "vitest";
import { applyVars, MarkerError, parseSource } from "./markers.ts";

const js = `// #region config
const clientId = "YOUR_CLIENT_ID"; // @var clientId
const portalUrl = 'https://www.arcgis.com'; // @var portalUrl
// #endregion

// #region outer
function a() {
  // #region inner
  return 1;
  // #endregion inner
}
// #endregion outer`;

describe("parseSource", () => {
  it("strips markers and maps regions to cleaned line numbers", () => {
    const { code, regions } = parseSource(js);
    expect(code).toBe(`const clientId = "YOUR_CLIENT_ID";
const portalUrl = 'https://www.arcgis.com';

function a() {
  return 1;
}`);
    expect(regions).toEqual([
      { id: "config", fromLine: 1, toLine: 2 },
      { id: "inner", fromLine: 5, toLine: 5 },
      { id: "outer", fromLine: 4, toLine: 6 },
    ]);
  });

  it("records var literal positions, defaults and quotes", () => {
    const { vars } = parseSource(js);
    expect(vars).toEqual([
      { name: "clientId", line: 1, fromColumn: 18, toColumn: 32, defaultValue: "YOUR_CLIENT_ID", quote: '"', context: "script" },
      { name: "portalUrl", line: 2, fromColumn: 19, toColumn: 41, defaultValue: "https://www.arcgis.com", quote: "'", context: "script" },
    ]);
  });

  it("supports HTML and CSS comment syntax", () => {
    const html = `<!-- #region map -->
<arcgis-map item-id="abc123"></arcgis-map> <!-- @var webmap -->
<!-- #endregion -->`;
    const css = `/* #region layout */
body { font-family: "Avenir"; } /* @var font */
/* #endregion */`;
    expect(parseSource(html)).toMatchObject({
      code: '<arcgis-map item-id="abc123"></arcgis-map>',
      regions: [{ id: "map", fromLine: 1, toLine: 1 }],
      vars: [{ name: "webmap", defaultValue: "abc123", context: "html" }],
    });
    expect(parseSource(css)).toMatchObject({
      code: 'body { font-family: "Avenir"; }',
      vars: [{ name: "font", defaultValue: "Avenir", context: "script" }],
    });
  });

  it("keeps code without markers untouched", () => {
    const plain = 'const a = "x";\n// just a comment\n';
    expect(parseSource(plain)).toEqual({ code: plain, regions: [], vars: [] });
  });

  it.each([
    ["// #endregion", /main\.js:1: #endregion without a matching #region/],
    ["// #region a\nx();", /main\.js:1: unclosed #region "a"/],
    ["// #region a\nx();\n// #endregion b", /main\.js:3: #endregion "b" closes #region "a"/],
    ["// #region a\n// #endregion", /main\.js:2: #region "a" is empty/],
    ["// #region a\nx();\n// #endregion\n// #region a\ny();\n// #endregion", /main\.js:4: duplicate #region "a"/],
    ["const a = 1; // @var a", /main\.js:1: @var a has no string literal/],
    ['const a = "1"; // @var a\nconst b = "2"; // @var a', /main\.js:2: duplicate @var "a"/],
  ])("reports %j with file and line", (source, message) => {
    expect(() => parseSource(source, "main.js")).toThrow(message);
    expect(() => parseSource(source, "main.js")).toThrow(MarkerError);
  });
});

describe("applyVars", () => {
  it("replaces literals and falls back to defaults", () => {
    expect(applyVars(parseSource(js), { clientId: "abc" }).split("\n").slice(0, 2)).toEqual([
      'const clientId = "abc";',
      "const portalUrl = 'https://www.arcgis.com';",
    ]);
  });

  it("replaces the first string literal on the marked line", () => {
    const parsed = parseSource('f("a"); // @var first');
    expect(applyVars(parsed, { first: "b" })).toBe('f("b");');
  });

  it("escapes values for script string literals", () => {
    const parsed = parseSource(js);
    const [line1, line2] = applyVars(parsed, { clientId: 'a"b\\c\nd', portalUrl: "it's" }).split("\n");
    expect(line1).toBe(String.raw`const clientId = "a\"b\\c\nd";`);
    expect(line2).toBe(String.raw`const portalUrl = 'it\'s';`);
  });

  it("escapes values for HTML attributes", () => {
    const parsed = parseSource('<a href="x"></a> <!-- @var url -->');
    expect(applyVars(parsed, { url: 'a"b&<c' })).toBe('<a href="a&quot;b&amp;&lt;c"></a>');
  });
});
