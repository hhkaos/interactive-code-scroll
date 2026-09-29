import { describe, expect, it } from "vitest";
import { parseStringArray, validateSeriesIndex, validateTutorial, type ComponentUse } from "./validate.ts";

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
        use("Step", { id: "big-code", maximize: "code" }),
        use("Step", { id: "big-preview", maximize: "preview", preview: "expanded" }),
        use("Step", { id: "restore", maximize: "none", preview: "collapsed" }),
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
    [use("Step", { id: "a", maximize: "result" }), '"maximize" must be one of code, preview, none'],
    [use("Step", { id: "a", maximize: "preview", preview: "collapsed" }), 'maximize="preview" conflicts with preview="collapsed"'],
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

describe("validateTutorial shared vars", () => {
  const run = (sources: [string, string][]) =>
    validateTutorial({
      mdxFile: "tutorial.mdx",
      uses: [],
      files: [...files, ...sources.map(([path, source]) => ({ path, source }))],
      images,
    });

  it("accepts the same var in several files with one default", () => {
    expect(run([["geocode.py", 'TOKEN = "ID"  # @var clientId'], ["Main.kt", 'val t = "ID" // @var clientId']])).toEqual([]);
  });

  it("reports a var whose defaults differ between files", () => {
    expect(run([["geocode.py", 'TOKEN = "OTHER"  # @var clientId']])).toEqual([
      '@var "clientId" must have the same default in every file: code/main.js "ID", code/geocode.py "OTHER"',
    ]);
  });
});

describe("validateTutorial visible files", () => {
  const extra = [
    { path: "README.md", source: "# Notes" },
    { path: "config.py", source: 'KEY = "ID"  # @var clientId' },
  ];
  const run = (frontmatter: Record<string, unknown>, ...uses: ComponentUse[]) =>
    validateTutorial({
      mdxFile: "tutorial.mdx",
      uses,
      files: [...files, ...extra],
      binaries: ["assets/logo.png"],
      images,
      frontmatter,
      frontmatterLines: { files: 4 },
    });

  it("accepts steps on tabbed files and vars in tabbed files or index.html", () => {
    expect(run({ files: ["main.js", "*.py"] }, use("Step", { id: "a", file: "config.py" }))).toEqual([]);
  });

  it("reports vars in files not shown in tabs", () => {
    expect(run({ files: ["main.js"] })).toEqual([
      'code/config.py: @var "clientId" is in a file not shown in tabs; add the file to frontmatter "files" or remove the marker',
    ]);
  });

  it("reports steps on files not shown in tabs or on binaries", () => {
    expect(run({ files: ["main.js", "config.py"] }, use("Step", { id: "a", file: "README.md" }), use("Step", { id: "b", file: "assets/logo.png" }))).toEqual([
      'tutorial.mdx:3:1 <Step> file "README.md" is not shown in tabs; add it to frontmatter "files"',
      'tutorial.mdx:3:1 <Step> file "assets/logo.png" is binary and cannot be shown',
    ]);
  });

  it("reports patterns that match nothing, or only binaries", () => {
    expect(run({ files: ["main.js", "config.py", "*.kt", "assets/*"] })).toEqual([
      'tutorial.mdx:4:1 frontmatter files "*.kt" matches no text file in code/',
      'tutorial.mdx:4:1 frontmatter files "assets/*" matches only binary files, which cannot be shown as tabs',
    ]);
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
    expect(withFrontmatter({ logo: "logo.svg" })).toEqual(['tutorial.mdx:4:1 frontmatter logo "logo.svg" not found in images/ (or use an https:// URL)']);
  });

  it("requires code/index.html unless preview is off", () => {
    const noEntry = files.filter((f) => f.path !== "index.html");
    expect(withFrontmatter({ preview: "tab" }, noEntry)).toEqual([
      'tutorial.mdx:5:1 frontmatter preview "tab" needs code/index.html (or set preview: off)',
    ]);
    expect(withFrontmatter({ preview: "off" }, noEntry)).toEqual([]);
  });

  it('reports maximize="preview" when there is no pane to maximize', () => {
    const step = use("Step", { id: "big", maximize: "preview" });
    const check = (preview: string, uses: ComponentUse[] = [step]) =>
      validateTutorial({ mdxFile: "tutorial.mdx", uses, files, images, frontmatter: { preview } });
    expect(check("tab")).toEqual([
      'tutorial.mdx:3:1 <Step> maximize="preview" has no pane to maximize: no iframe Preview (frontmatter "preview") and no step with a result',
    ]);
    expect(check("off")).toHaveLength(1);
    expect(check("iframe")).toEqual([]);
    expect(check("both")).toEqual([]);
  });

  it("falls back to line 1 for a key without a known line", () => {
    expect(withFrontmatter({ codeWrap: "yes" })).toEqual(['tutorial.mdx:1:1 frontmatter "codeWrap" must be a boolean']);
  });
});

describe("validateTutorial variants", () => {
  const variantFiles = [
    { path: "curl/geocode.sh", source: 'TOKEN="ID" # @var clientId\n# #region request\ncurl "$URL?token=$TOKEN"\n# #endregion' },
    { path: "curl/README.md", source: "# cURL" },
    { path: "python/geocode.py", source: '# region auth\nTOKEN = "ID"  # @var clientId\n# endregion\n# region request\nprint(1)\n# endregion' },
    { path: "python/util.py", source: "# region extra\nx = 1\n# endregion" },
    { path: "web/index.html", source: "<p>hi</p>" },
    { path: "web/main.js", source: '// #region auth\nconst t = "ID"; // @var clientId\n// #endregion\n// #region request\nfetch(u);\n// #endregion' },
  ];
  const variants = [
    { id: "curl", label: "cURL", dir: "curl", entry: "geocode.sh", files: ["*.sh"] },
    { id: "python", label: "Python", dir: "python", entry: "geocode.py" },
    { id: "web", label: "JavaScript", dir: "web", entry: "main.js" },
  ];
  const run = (
    options: { frontmatter?: Record<string, unknown>; files?: typeof variantFiles; binaries?: string[]; outputs?: string[] },
    ...uses: ComponentUse[]
  ) =>
    validateTutorial({
      mdxFile: "tutorial.mdx",
      uses,
      files: options.files ?? variantFiles,
      binaries: options.binaries ?? [],
      images,
      outputs: options.outputs,
      frontmatter: options.frontmatter ?? { variants, preview: "both" },
      frontmatterLines: { variants: 2, files: 9 },
    });

  it("accepts region-only steps, only=, and files relative to the variant", () => {
    expect(
      run(
        {},
        use("Step", { id: "request", region: "request" }),
        use("Step", { id: "auth", region: "auth", only: "python web" }),
        use("Step", { id: "script", file: "geocode.py", region: "auth", only: "python" }),
        use("Step", { id: "text-only" }),
        use("VarField", { name: "clientId", label: "Token" }),
      ),
    ).toEqual([]);
  });

  it("resolves output= for every covered variant that is not web code, per-variant file first", () => {
    const outputs = ["geocode.json", "curl/geocode.json", "python/only.txt"];
    expect(
      run(
        { outputs },
        use("Step", { id: "a", output: "geocode.json" }),
        use("Step", { id: "b", output: "only.txt", only: "python web" }),
      ),
    ).toEqual([]);
    expect(run({ outputs }, use("Step", { id: "a", output: "only.txt" }))).toEqual([
      'tutorial.mdx:3:1 <Step> output "only.txt" not found for variant "curl" (output/curl/only.txt or output/only.txt)',
    ]);
    expect(run({ outputs }, use("Step", { id: "a", output: "geocode.json", only: "web" }))).toEqual([
      'tutorial.mdx:3:1 <Step> output "geocode.json" has no effect: every variant of the step is web code, which shows the Preview',
    ]);
  });

  it("does not require index.html for the Preview", () => {
    const noWeb = variantFiles.filter((f) => !f.path.startsWith("web/"));
    expect(run({ files: noWeb, frontmatter: { variants: variants.slice(0, 2), preview: "both" } })).toEqual([]);
  });

  it("reports steps whose region or file is missing in a covered variant", () => {
    expect(
      run(
        {},
        use("Step", { id: "a", region: "auth" }),
        use("Step", { id: "b", file: "main.js", only: "web curl" }),
        use("Step", { id: "c", file: "geocode.py", region: "nope", only: "python" }),
      ),
    ).toEqual([
      'tutorial.mdx:3:1 <Step> region "auth" not found in variant "curl" (code/curl/); add it or set "only"',
      'tutorial.mdx:3:1 <Step> file "main.js" not found in variant "curl" (code/curl/main.js); add it or set "only"',
      'tutorial.mdx:3:1 <Step> region "nope" not found in code/python/geocode.py',
    ]);
  });

  it("reports unknown only= ids and only= without variants", () => {
    expect(run({}, use("Step", { id: "a", only: "python rust" }))).toEqual([
      'tutorial.mdx:3:1 <Step> only "rust" is not a variant id (curl, python, web)',
    ]);
    expect(validate(use("Step", { id: "a", only: "python" }))).toEqual(['tutorial.mdx:3:1 <Step> "only" requires frontmatter "variants"']);
  });

  it("reports steps on files or regions not shown in tabs", () => {
    expect(
      run({}, use("Step", { id: "a", file: "README.md", only: "curl" }), use("Step", { id: "b", region: "extra", only: "python" })),
    ).toEqual([
      'tutorial.mdx:3:1 <Step> file "README.md" is not shown in tabs in variant "curl"; add it to its "files"',
    ]);
    const hidden = [{ ...variants[1]!, files: ["geocode.py"] }];
    const python = variantFiles.filter((f) => f.path.startsWith("python/"));
    expect(run({ files: python, frontmatter: { variants: hidden } }, use("Step", { id: "b", region: "extra" }))).toEqual([
      'tutorial.mdx:3:1 <Step> region "extra" is in code/python/util.py, which is not shown in tabs in variant "python"',
    ]);
  });

  it("reports region ids defined twice within a variant", () => {
    const files = [...variantFiles, { path: "python/more.py", source: "# region auth\ny = 2\n# endregion" }];
    expect(run({ files })).toEqual(['code/python/more.py: region "auth" is also defined in code/python/geocode.py; region ids must be unique within variant "python"']);
  });

  it("reports files outside every variant folder", () => {
    expect(run({ files: [...variantFiles, { path: "notes.md", source: "x" }], binaries: ["logo.png"] })).toEqual([
      "code/logo.png: file is outside every variant folder; move it into one of code/curl/, code/python/, code/web/",
      "code/notes.md: file is outside every variant folder; move it into one of code/curl/, code/python/, code/web/",
    ]);
  });

  it("reports variant folder, entry and files problems at the variants key", () => {
    const broken = [
      { id: "curl", label: "cURL", dir: "curl", entry: "missing.sh", files: ["*.sh", "*.ps1"] },
      { id: "python", label: "Python", dir: "python", entry: "geocode.py", files: ["util.py"] },
      { id: "web", label: "JavaScript", dir: "web", entry: "main.js" },
      { id: "go", label: "Go", dir: "go", entry: "main.go" },
    ];
    expect(run({ frontmatter: { variants: broken } })).toEqual([
      'tutorial.mdx:2:1 frontmatter variant "curl" entry "missing.sh" not found in code/curl/',
      'tutorial.mdx:2:1 frontmatter variant "curl" files "*.ps1" matches no text file in code/curl/',
      'tutorial.mdx:2:1 frontmatter variant "python" entry "geocode.py" must be one of its "files"',
      'tutorial.mdx:2:1 frontmatter variant "go" folder code/go/ has no files',
      'code/python/geocode.py: @var "clientId" is in a file not shown in tabs; add the file to its variant\'s "files" or remove the marker',
    ]);
  });

  it("reports vars in variant files not shown in tabs, but allows the variant's index.html", () => {
    const files = variantFiles.map((f) => (f.path === "web/index.html" ? { ...f, source: '<script>const t = "ID"; // @var clientId</script>' } : f));
    const web = [{ ...variants[2]!, files: ["main.js"] }];
    expect(run({ files: files.filter((f) => f.path.startsWith("web/")), frontmatter: { variants: web } })).toEqual([]);
  });

  it("skips file checks when the variants config is invalid", () => {
    expect(run({ frontmatter: { variants: "curl" } }, use("Step", { id: "a", region: "request" }))).toEqual([
      'tutorial.mdx:2:1 frontmatter "variants" must be a non-empty list of { id, label, dir, entry }',
    ]);
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

describe("validateTutorial captured output", () => {
  const script = [{ path: "main.py", source: "print(1)" }];
  const run = (outputs: string[], output: ComponentUse["attributes"][string], code = script) =>
    validateTutorial({
      mdxFile: "tutorial.mdx",
      uses: [use("Step", { id: "a", output })],
      files: code,
      images,
      outputs,
      frontmatter: { preview: "off" },
    });

  it("accepts every supported type found in output/", () => {
    for (const name of ["a.json", "b.txt", "c.log", "shots/d.png", "e.jpg", "f.jpeg", "g.gif", "h.webp", "i.svg"]) {
      expect(run([name], name)).toEqual([]);
    }
  });

  it.each([
    [["a.json"], "b.json", 'output "b.json" not found in output/'],
    [["a.csv"], "a.csv", 'output "a.csv" must be a .json, .txt, .log, .png, .jpg, .jpeg, .gif, .webp, .svg file'],
    [["a.json"], true, '"output" must be a string'],
  ] as const)("reports %j → %j", (outputs, output, message) => {
    expect(run([...outputs], output)[0]).toContain(message);
  });

  it("reports output= in web code, which shows the Preview", () => {
    expect(run(["a.json"], "a.json", files)).toEqual([
      'tutorial.mdx:3:1 <Step> output "a.json" has no effect: code/index.html makes the tutorial web code, which shows the Preview',
    ]);
  });
});

describe("validateTutorial requests", () => {
  const script = [{ path: "main.py", source: 'TOKEN = "DEMO"  # @var token\n' }];
  const http = {
    path: "geocode.http",
    source: "@token = DEMO\n\n# @name geocode-get\nGET https://x.test/?token={{token}}\n\n###\n# @name geocode-post\nPOST https://x.test/\n",
  };
  const errorRule = { path: "errors.json", source: '{ "object": "error", "code": "error.code", "message": "error.message" }' };
  const run = (
    uses: ComponentUse[],
    options: { files?: { path: string; source: string }[]; requests?: { path: string; source: string }[]; requestBinaries?: string[]; frontmatter?: Record<string, unknown> } = {},
  ) =>
    validateTutorial({
      mdxFile: "tutorial.mdx",
      uses,
      files: options.files ?? script,
      images,
      requests: options.requests ?? [http, errorRule],
      requestBinaries: options.requestBinaries,
      frontmatter: options.frontmatter ?? { preview: "off" },
    });

  it("accepts named requests, VarFields for file variables and supporting files", () => {
    expect(
      run([
        use("Step", { id: "a", request: "geocode-get geocode-post" }),
        use("VarField", { name: "token", label: "Token" }),
      ]),
    ).toEqual([]);
    expect(run([use("VarField", { name: "token", label: "Token" })], { files: [{ path: "main.py", source: "print(1)" }] })).toEqual([]);
  });

  it.each([
    ["geocode-put", 'request "geocode-put" not found in requests/ (# @name geocode-put)'],
    ["geocode-get geocode-get", 'request "geocode-get" is listed twice'],
    [" ", '"request" must list request names'],
  ])("reports request=%j", (request, message) => {
    expect(run([use("Step", { id: "a", request })])).toEqual([`tutorial.mdx:3:1 <Step> ${message}`]);
  });

  it("reports .http syntax errors, binaries and a default that differs from code/", () => {
    const broken = { path: "broken.http", source: "@token = OTHER\nGET https://x.test/?id={{$guid}}\n" };
    expect(run([], { requests: [broken], requestBinaries: ["logo.png"] })).toEqual([
      "requests/logo.png: binary files are not allowed in requests/",
      "requests/broken.http:2: system variable {{$guid}} is not supported; use a file variable",
      '@var "token" must have the same default in every file: code/main.py "DEMO", requests/broken.http "OTHER"',
    ]);
  });

  it("reports an invalid requests/errors.json; other JSON files in requests/ are not rules", () => {
    const broken = { path: "errors.json", source: '{\n  "object": "error",\n  "code": "error.code"\n}' };
    expect(run([], { requests: [http, broken, { path: "sub/errors.json", source: "{}" }] })).toEqual([
      'requests/errors.json:1: "message" is required: a dot path such as "error.message"',
    ]);
  });

  it("reports request= in web code, which shows the Preview", () => {
    const web = [...files, { path: "main.py", source: "" }];
    expect(run([use("Step", { id: "a", request: "geocode-get" })], { files: web })).toEqual([
      'tutorial.mdx:3:1 <Step> request "geocode-get" has no effect: code/index.html makes the tutorial web code, which shows the Preview',
    ]);
    const variants = [{ id: "web", label: "Web", dir: "web", entry: "index.html" }];
    const variantFiles = [{ path: "web/index.html", source: "<p>hi</p>" }];
    expect(run([use("Step", { id: "a", request: "geocode-get" })], { files: variantFiles, frontmatter: { variants } })).toEqual([
      'tutorial.mdx:3:1 <Step> request "geocode-get" has no effect: every variant of the step is web code, which shows the Preview',
    ]);
  });

  it("reports a code/ requests folder that would overwrite requests/ in the ZIP", () => {
    expect(run([], { files: [...script, { path: "requests/old.http", source: "" }] })).toEqual([
      "code/requests/old.http: code/requests/ would overwrite requests/ in the ZIP; rename the folder",
    ]);
    const variants = [{ id: "py", label: "Python", dir: "py", entry: "main.py" }];
    const variantFiles = [{ path: "py/main.py", source: "" }, { path: "py/requests/a.txt", source: "" }];
    expect(run([], { files: variantFiles, frontmatter: { variants } })).toEqual([
      "code/py/requests/a.txt: code/py/requests/ would overwrite requests/ in the ZIP; rename the folder",
    ]);
  });
});

describe("validateSeriesIndex", () => {
  const index = (uses: ComponentUse[], frontmatter: Record<string, unknown> = {}) =>
    validateSeriesIndex({ mdxFile: "tutorials/index.mdx", uses, images: ["logo.svg"], frontmatter, frontmatterLines: { logo: 3, preview: 4 } });

  it("accepts an https logo without checking images/", () => {
    expect(index([], { logo: "https://example.com/logo.png" })).toEqual([]);
    expect(index([], { logo: "http://example.com/logo.png" })).toEqual([
      'tutorials/index.mdx:3:1 frontmatter logo "http://example.com/logo.png" not found in images/ (or use an https:// URL)',
    ]);
    expect(validateTutorial({ mdxFile: "tutorial.mdx", uses: [], files, images, frontmatter: { logo: "https://example.com/l.png", preview: "off" } })).toEqual([]);
  });

  it("accepts TutorialList sections and a logo from images/", () => {
    expect(
      index([use("TutorialFilter", {}), use("TutorialList", {}), use("TutorialList", { tags: "REST, Python", level: "Beginner" }, 9)], { logo: "logo.svg" }),
    ).toEqual([]);
  });

  it("reports frontmatter, other components and bad attributes by position", () => {
    expect(
      index(
        [use("Step", { id: "a" }, 5), use("TutorialList", { tag: "REST" }, 7), use("TutorialList", { level: { expression: "x" } }, 8)],
        { logo: "missing.svg" },
      ),
    ).toEqual([
      'tutorials/index.mdx:3:1 frontmatter logo "missing.svg" not found in images/ (or use an https:// URL)',
      "tutorials/index.mdx:5:1 <Step> is not available in index.mdx (use <TutorialList> or <TutorialFilter>)",
      'tutorials/index.mdx:7:1 <TutorialList> unknown attribute "tag" (use tags or level)',
      "tutorials/index.mdx:8:1 <TutorialList> level must be a non-empty string",
    ]);
    expect(index([use("TutorialFilter", { tags: "Web" }, 2), use("TutorialFilter", {}, 6)])).toEqual([
      'tutorials/index.mdx:2:1 <TutorialFilter> takes no attributes (got "tags")',
      "tutorials/index.mdx:6:1 <TutorialFilter> can appear only once (it filters every list on the page)",
    ]);
    expect(index([], { preview: "off" })).toEqual(['tutorials/index.mdx:4:1 frontmatter "preview" is not an index.mdx field (use title, description, logo, theme)']);
  });
});
