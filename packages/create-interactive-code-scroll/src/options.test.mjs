import { describe, expect, it } from "vitest";
import { complete, defaults, packageName, parseArgs, titleFrom, unanswered, validate } from "./options.mjs";

describe("parseArgs", () => {
  it("reads the folder, value flags, lists and boolean pairs", () => {
    const { answers, yes } = parseArgs(["docs", "--layout", "series", "--tutorials=intro, next", "--langs", "curl,python", "--no-pages", "--git", "-y"]);
    expect(answers).toEqual({ dir: "docs", layout: "series", tutorials: ["intro", "next"], langs: ["curl", "python"], pages: false, git: true });
    expect(yes).toBe(true);
  });

  it("rejects unknown options, missing values and a second folder", () => {
    expect(() => parseArgs(["--colour"])).toThrow("Unknown option --colour");
    expect(() => parseArgs(["--type"])).toThrow("--type needs a value.");
    expect(() => parseArgs(["--type", "--pages"])).toThrow("--type needs a value.");
    expect(() => parseArgs(["a", "b"])).toThrow('Unexpected argument "b"');
  });
});

describe("unanswered", () => {
  it("lists only the questions that apply", () => {
    expect(unanswered({})).toEqual(["dir", "layout", "type", "langs", "pm", "pages", "git", "install"]);
    expect(unanswered({ layout: "series" })).toEqual(["dir", "tutorials", "index", "type", "langs", "pm", "pages", "git", "install"]);
    // One language available: nothing to pick.
    expect(unanswered({ dir: "x", layout: "single", type: "web" })).toEqual(["pm", "pages", "git", "install"]);
    // Variants or siblings only matters in a series with several languages.
    expect(unanswered({ layout: "series", type: "rest", langs: ["curl", "python"] })).toContain("languagesAs");
    expect(unanswered({ layout: "single", type: "rest", langs: ["curl", "python"] })).not.toContain("languagesAs");
  });
});

describe("complete and validate", () => {
  const fallback = defaults("npm");

  it("defaults the languages to the chosen type's first language", () => {
    expect(complete({ type: "native" }, fallback).langs).toEqual(["kotlin"]);
    expect(complete({}, fallback).langs).toEqual(["javascript"]);
    expect(validate(complete({}, fallback))).toEqual([]);
  });

  it("names the flag of every invalid answer", () => {
    const answers = complete({ type: "script", langs: ["swift", "python", "python"], layout: "single", index: "mdx", languagesAs: "siblings", pm: /** @type {any} */ ("yarn") }, fallback);
    expect(validate(/** @type {any} */ (answers))).toEqual([
      '--pm must be npm or pnpm, got "yarn".',
      '--langs: "swift" is not available for script tutorials (python, javascript).',
      "--langs lists a language twice.",
      "--index needs --layout series.",
      "--languages-as siblings needs --layout series.",
    ]);
  });

  it("checks series names", () => {
    const answers = complete({ layout: "series", tutorials: ["ok", "Bad Name", "ok"] }, fallback);
    expect(validate(answers)).toEqual([
      '--tutorials: "Bad Name" must use lowercase letters, digits and dashes, and start with a letter or digit.',
      "--tutorials lists a name twice.",
    ]);
  });
});

it("derives the package name and titles", () => {
  expect(packageName("../Work/My Tutorials!")).toBe("my-tutorials");
  expect(titleFrom("my-first-map")).toBe("My first map");
});
