import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildZip, projectFiles, slugify } from "./downloads.ts";
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
});
