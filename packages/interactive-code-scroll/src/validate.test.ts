import { describe, expect, it } from "vitest";
import { parseStringArray, validateTutorial, type ComponentUse } from "./validate.ts";

const files = [
  { path: "main.js", source: '// #region config\nconst clientId = "ID"; // @var clientId\n// #endregion' },
  { path: "index.html", source: "<p>hi</p>" },
];
const images = ["a.png", "shots/b.png"];

const use = (name: string, attributes: ComponentUse["attributes"], line = 3): ComponentUse => ({
  name,
  attributes,
  line,
  column: 1,
});
const validate = (...uses: ComponentUse[]) => validateTutorial({ mdxFile: "tutorial.mdx", uses, files, images });

describe("validateTutorial", () => {
  it("accepts valid references", () => {
    expect(
      validate(
        use("Step", { id: "config", file: "main.js", region: "config" }),
        use("Step", { id: "shots", images: { expression: '["a.png", "shots/b.png"]' } }),
        use("Step", { id: "text-only", preview: "collapsed" }),
        use("Hint", { id: "redirect-uri", label: "redirect URI" }),
        use("VarField", { name: "clientId", label: "Client ID", secret: true }),
      ),
    ).toEqual([]);
  });

  it.each([
    [use("Step", { file: "main.js" }), '<Step> requires an "id"'],
    [use("Step", { id: "Bad Id" }), 'id "Bad Id" must be lowercase letters, digits and dashes'],
    [use("Step", { id: "a", file: "nope.js" }), 'file "nope.js" not found in code/'],
    [use("Step", { id: "a", region: "config" }), 'region "config" requires a "file"'],
    [use("Step", { id: "a", file: "main.js", region: "nope" }), 'region "nope" not found in code/main.js'],
    [use("Step", { id: "a", images: { expression: '["c.png"]' } }), 'image "c.png" not found in images/'],
    [use("Step", { id: "a", images: { expression: "shots" } }), '"images" must be a static array of strings'],
    [use("Step", { id: "a", images: "a.png" }), '"images" must be a static array of strings'],
    [use("Step", { id: "a", file: true }), '"file" must be a string'],
    [use("Step", { id: "a", preview: "closed" }), '"preview" must be one of expanded, collapsed, keep'],
    [use("Hint", { label: "Redirect URI" }), '<Hint> requires an "id"'],
    [use("Hint", { id: "Redirect URI", label: "Redirect URI" }), 'id "Redirect URI" must be lowercase letters, digits and dashes'],
    [use("Hint", { id: "redirect-uri" }), '<Hint> requires a "label"'],
    [use("VarField", { name: "nope", label: "X" }), 'no "@var nope" found in code/'],
    [use("VarField", { name: "clientId" }), '<VarField> requires a "label"'],
  ])("reports %j", (component, message) => {
    const [error] = validate(component);
    expect(error).toContain("tutorial.mdx:3:1");
    expect(error).toContain(message);
  });

  it("reports duplicate step ids at the second occurrence", () => {
    expect(validate(use("Step", { id: "a" }, 1), use("Step", { id: "a" }, 9))).toEqual([
      'tutorial.mdx:9:1 <Step> duplicate id "a"',
    ]);
  });

  it("reports duplicate hint ids at the second occurrence", () => {
    expect(validate(use("Hint", { id: "redirect-uri", label: "Redirect URI" }, 1), use("Hint", { id: "redirect-uri", label: "Redirect URI" }, 9))).toEqual([
      'tutorial.mdx:9:1 <Hint> duplicate id "redirect-uri"',
    ]);
  });

  it("collects every problem, including marker errors in code/", () => {
    const errors = validateTutorial({
      mdxFile: "tutorial.mdx",
      uses: [use("Step", { id: "a", file: "nope.js" }), use("VarField", { name: "x", label: "X" })],
      files: [...files, { path: "broken.js", source: "// #region open\nx();" }],
      images,
    });
    expect(errors).toHaveLength(3);
    expect(errors[0]).toBe('code/broken.js:1: unclosed #region "open"');
  });
});

describe("validateTutorial frontmatter", () => {
  const withFrontmatter = (frontmatter: Record<string, unknown>, inputFiles = files) =>
    validateTutorial({
      mdxFile: "tutorial.mdx",
      uses: [],
      files: inputFiles,
      images,
      frontmatter,
      frontmatterLines: { title: 2, theme: 3, logo: 4, preview: 5 },
    });

  it("accepts valid frontmatter", () => {
    expect(withFrontmatter({ title: "T", theme: "dark", logo: "a.png", preview: "both" })).toEqual([]);
  });

  it("reports invalid values at the key's line", () => {
    expect(withFrontmatter({ theme: "blue" })).toEqual([
      'tutorial.mdx:3:1 frontmatter "theme" must be one of auto, light, dark (got "blue")',
    ]);
  });

  it("reports a logo missing from images/", () => {
    expect(withFrontmatter({ logo: "logo.svg" })).toEqual(['tutorial.mdx:4:1 frontmatter logo "logo.svg" not found in images/']);
  });

  it("requires code/index.html unless preview is off", () => {
    const noEntry = files.filter((f) => f.path !== "index.html");
    expect(withFrontmatter({ preview: "tab" }, noEntry)).toEqual([
      'tutorial.mdx:5:1 frontmatter preview "tab" needs code/index.html (or set preview: off)',
    ]);
    expect(withFrontmatter({ preview: "off" }, noEntry)).toEqual([]);
  });

  it("falls back to line 1 for a key without a known line", () => {
    expect(withFrontmatter({ codeWrap: "yes" })).toEqual(['tutorial.mdx:1:1 frontmatter "codeWrap" must be a boolean']);
  });
});

describe("parseStringArray", () => {
  it.each([
    ['["a.png", \'b.png\']', ["a.png", "b.png"]],
    ["[]", []],
    ['[ "a.png", ]', ["a.png"]],
    ["someVar", undefined],
    ['["a" + "b"]', undefined],
  ])("%s", (expression, expected) => {
    expect(parseStringArray(expression)).toEqual(expected);
  });
});
