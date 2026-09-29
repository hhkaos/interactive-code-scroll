import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildZip, inFolder, projectFiles, publishedUrl, slugify, zipBadge, zipLabel } from "./downloads.ts";
import { parseSource } from "./markers.ts";

const files = [
  { path: "index.html", parsed: parseSource("<!-- #region ui -->\n<p>hi</p>\n<!-- #endregion -->") },
  { path: "js/main.js", parsed: parseSource('const id = "DEMO"; // @var clientId') },
];

describe("projectFiles", () => {
  it("strips markers and applies values", () => {
    expect(projectFiles(files, { clientId: "real" })).toEqual({
      "index.html": "<p>hi</p>",
      "js/main.js": 'const id = "real";',
    });
  });

  it("keeps defaults for vars without a value", () => {
    expect(projectFiles(files, {})["js/main.js"]).toBe('const id = "DEMO";');
  });
});

describe("slugify", () => {
  it.each([
    ["OAuth 2.0 with the ArcGIS Maps SDK for JavaScript", "oauth-2-0-with-the-arcgis-maps-sdk-for-javascript"],
    ["Mapas en España", "mapas-en-espana"],
    ["!!!", "tutorial"],
  ])("%s → %s", (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });
});

describe("buildZip", () => {
  it("puts every file under one folder, keeping subfolders", async () => {
    const zip = unzipSync(await buildZip(projectFiles(files, { clientId: "real" }), "oauth"));
    expect(Object.keys(zip).sort()).toEqual(["oauth/index.html", "oauth/js/main.js"]);
    expect(strFromU8(zip["oauth/js/main.js"]!)).toBe('const id = "real";');
  });

  it("stores binary files byte for byte", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255]);
    const zip = unzipSync(await buildZip({ "assets/logo.png": bytes, "a.txt": "x" }, "p"));
    expect([...zip["p/assets/logo.png"]!]).toEqual([...bytes]);
  });
});

describe("publishedUrl", () => {
  it("encodes each path segment, keeping the folders", () => {
    expect(publishedUrl("/base/preview/", "my docs/read me.md")).toBe("/base/preview/my%20docs/read%20me.md");
  });
});

describe("inFolder", () => {
  it("keeps the folder's files with paths relative to it", () => {
    expect(inFolder({ "py/a.py": 1, "py/lib/b.py": 2, "pyx/c.py": 3, "d.py": 4 }, "py")).toEqual({ "a.py": 1, "lib/b.py": 2 });
  });
});

describe("zipLabel / zipBadge", () => {
  it("names the file count and the files without a tab", () => {
    expect(zipLabel(1, 0)).toBe("Download project (ZIP) · 1 file");
    expect(zipLabel(7, 2)).toBe("Download project (ZIP) · 7 files (2 not shown in tabs)");
    expect(zipBadge(99)).toBe("99");
    expect(zipBadge(100)).toBe("99+");
  });
});
