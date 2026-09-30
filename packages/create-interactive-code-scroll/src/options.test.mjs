import { describe, expect, it } from "vitest";
import { complete, defaults, packageName, parseArgs, titleFrom, unanswered, usesByTutorial, validate } from "./options.mjs";

describe("parseArgs", () => {
  it("reads the folder, value flags, lists and boolean pairs", () => {
    const { answers, yes } = parseArgs(["docs", "--layout", "series", "--tutorials=intro, next", "--use", "rest:curl,script:python", "--no-pages", "--git", "-y"]);
    expect(answers).toEqual({
      dir: "docs",
      layout: "series",
      tutorials: ["intro", "next"],
      use: [
        { kind: "rest", lang: "curl" },
        { kind: "script", lang: "python" },
      ],
      pages: false,
      git: true,
    });
    expect(yes).toBe(true);
  });

  it("reads per-tutorial --use and the --type/--langs shorthand", () => {
    expect(parseArgs(["--use", "map=web:javascript,native:kotlin", "--use", "geo=rest:curl"]).answers.useBy).toEqual({
      map: [
        { kind: "web", lang: "javascript" },
        { kind: "native", lang: "kotlin" },
      ],
      geo: [{ kind: "rest", lang: "curl" }],
    });
    expect(parseArgs(["--type", "rest", "--langs", "curl,node"]).answers.use).toEqual([
      { kind: "rest", lang: "curl" },
      { kind: "rest", lang: "node" },
    ]);
    // Without --langs, the kind's first language.
    expect(parseArgs(["--type", "native"]).answers.use).toEqual([{ kind: "native", lang: "kotlin" }]);
  });

  it("rejects unknown options, missing values, a second folder and mixed forms", () => {
    expect(() => parseArgs(["--colour"])).toThrow("Unknown option --colour");
    expect(() => parseArgs(["--use"])).toThrow("--use needs a value.");
    expect(() => parseArgs(["--pm", "--pages"])).toThrow("--pm needs a value.");
    expect(() => parseArgs(["a", "b"])).toThrow('Unexpected argument "b"');
    expect(() => parseArgs(["--langs", "curl"])).toThrow("--langs needs --type.");
    expect(() => parseArgs(["--use", "web:javascript", "--type", "rest"])).toThrow("Use either --use or --type/--langs, not both.");
  });
});

describe("unanswered", () => {
  it("lists only the questions that apply", () => {
    expect(unanswered({})).toEqual(["dir", "layout", "use", "pm", "pages", "git", "install"]);
    expect(unanswered({ layout: "series" })).toEqual(["dir", "tutorials", "index", "use", "pm", "pages", "git", "install"]);
    // Variants or siblings only matters in a series with several entries in a tutorial.
    const two = [
      { kind: /** @type {const} */ ("rest"), lang: /** @type {const} */ ("curl") },
      { kind: /** @type {const} */ ("rest"), lang: /** @type {const} */ ("python") },
    ];
    expect(unanswered({ layout: "series", use: two })).toContain("languagesAs");
    expect(unanswered({ layout: "series", useBy: { a: two } })).toContain("languagesAs");
    expect(unanswered({ layout: "single", use: two })).not.toContain("languagesAs");
    // Per-tutorial answers for every name replace the shared list.
    expect(unanswered({ layout: "series", tutorials: ["a"], useBy: { a: two } })).not.toContain("use");
    expect(unanswered({ layout: "series", tutorials: ["a", "b"], useBy: { a: two } })).toContain("use");
  });
});

describe("complete and validate", () => {
  const fallback = defaults("npm");

  it("accepts the defaults and mixed kinds", () => {
    expect(validate(complete({}, fallback))).toEqual([]);
    const mixed = parseArgs(["--use", "web:javascript,rest:node,native:swift"]).answers;
    expect(validate(complete(mixed, fallback))).toEqual([]);
  });

  it("names the flag of every invalid answer", () => {
    const { answers } = parseArgs(["--use", "script:swift,rest:python,script:python,mobile:java", "--index", "mdx", "--languages-as", "siblings", "--pm", "yarn"]);
    expect(validate(complete(answers, fallback))).toEqual([
      '--pm must be npm or pnpm, got "yarn".',
      "--index needs --layout series.",
      "--languages-as siblings needs --layout series.",
      '--use: "swift" is not available for script (python, node).',
      '--use: unknown kind "mobile" (web, rest, script, native).',
      "--use: Python is picked more than once (rest, script); a tutorial uses each language once.",
    ]);
  });

  it("checks series names and per-tutorial answers", () => {
    const { answers } = parseArgs(["--layout", "series", "--tutorials", "ok,Bad Name,ok", "--use", "ghost=web:javascript", "--use", "ok=rest:node,script:node"]);
    expect(validate(complete(answers, fallback))).toEqual([
      '--tutorials: "Bad Name" must use lowercase letters, digits and dashes, and start with a letter or digit.',
      "--tutorials lists a name twice.",
      '--use ghost=…: there is no tutorial named "ghost" in --tutorials.',
      "--use (ok): Node.js is picked more than once (rest, script); a tutorial uses each language once.",
    ]);
    expect(validate(complete(parseArgs(["--use", "a=web:javascript"]).answers, fallback))).toEqual(["--use <name>=… needs --layout series."]);
  });

  it("gives each series tutorial its own list or the shared one", () => {
    const answers = complete(parseArgs(["--layout", "series", "--tutorials", "a,b", "--use", "rest:curl", "--use", "b=native:swift"]).answers, fallback);
    expect(usesByTutorial(answers)).toEqual([
      ["a", [{ kind: "rest", lang: "curl" }]],
      ["b", [{ kind: "native", lang: "swift" }]],
    ]);
  });
});

it("derives the package name and titles", () => {
  expect(packageName("../Work/My Tutorials!")).toBe("my-tutorials");
  expect(titleFrom("my-first-map")).toBe("My first map");
});
