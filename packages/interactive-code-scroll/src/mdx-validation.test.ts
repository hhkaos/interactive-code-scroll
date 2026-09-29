import { describe, expect, it } from "vitest";
import { TutorialValidationError } from "./mdx-validation.ts";

describe("TutorialValidationError", () => {
  it("points at the first problem with an MDX position", () => {
    const error = new TutorialValidationError(
      ['code/main.js: @var "a" must have the same default in every file', 'tutorial/tutorial.mdx:12:3 <Step> duplicate id "a"', "tutorial/tutorial.mdx:20:1 <Hint> x"],
      "tutorial/tutorial.mdx",
    );
    expect([error.line, error.column]).toEqual([12, 3]);
    expect(error.message).toContain("Tutorial has 3 broken reference(s)");
  });

  it("has no position when no problem is in the MDX", () => {
    const error = new TutorialValidationError(["code/main.js:3 unclosed #region"], "tutorial/tutorial.mdx");
    expect([error.line, error.column]).toEqual([undefined, undefined]);
  });
});
