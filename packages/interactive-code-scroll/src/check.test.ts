import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkTutorials, formatCheck, toProblem } from "./check.ts";

function tutorial(dir: string, mdx: string, code: Record<string, string> = { "main.py": "print(1)\n" }): string {
  mkdirSync(join(dir, "code"), { recursive: true });
  writeFileSync(join(dir, "tutorial.mdx"), mdx);
  for (const [path, source] of Object.entries(code)) writeFileSync(join(dir, "code", path), source);
  return dir;
}

describe("toProblem", () => {
  it("splits file, line and column from the message", () => {
    expect(toProblem("error", 'tutorial/tutorial.mdx:12:3 <Step> region "a" not found')).toEqual({
      severity: "error",
      file: "tutorial/tutorial.mdx",
      line: 12,
      column: 3,
      message: '<Step> region "a" not found',
    });
    expect(toProblem("error", "code/main.js:4: unclosed #region")).toEqual({ severity: "error", file: "code/main.js", line: 4, message: "unclosed #region" });
    expect(toProblem("error", 'code/main.js: @var "a" has two defaults')).toEqual({ severity: "error", file: "code/main.js", message: '@var "a" has two defaults' });
  });

  it("keeps messages without a location whole, without the package prefix", () => {
    expect(toProblem("warning", 'interactive-code-scroll: tutorial "a" is the only one in family "x"')).toEqual({
      severity: "warning",
      message: 'tutorial "a" is the only one in family "x"',
    });
  });
});

describe("checkTutorials", () => {
  it("reports the build's errors and warnings for one tutorial, with paths relative to cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-check-"));
    tutorial(
      join(root, "tutorial"),
      '---\npreview: off\nfamily: x\nfamilyLabel: Py\n---\n\n<Step id="a" file="main.py" region="nope">\n\n<details>\n<summary>More</summary>\nBody.\n</details>\n\n</Step>\n',
    );
    const { tutorials, problems } = checkTutorials({ tutorialDirs: [join(root, "tutorial")], cwd: root });
    expect(tutorials).toBe(1);
    expect(problems).toEqual([{ severity: "error", file: "tutorial/tutorial.mdx", line: 7, column: 1, message: '<Step> region "nope" not found in code/main.py' }]);

    writeFileSync(
      join(root, "tutorial", "tutorial.mdx"),
      '---\npreview: off\nfamily: x\nfamilyLabel: Py\n---\n\n<Step id="a" file="main.py">\n\n<details>\n<summary>More</summary>\nBody.\n</details>\n\n</Step>\n',
    );
    expect(checkTutorials({ tutorialDirs: [join(root, "tutorial")], cwd: root }).problems).toEqual([
      expect.objectContaining({ severity: "warning", line: 10, message: expect.stringContaining("<summary> is rendered inside a paragraph") }),
      expect.objectContaining({ severity: "warning", line: 3, message: 'frontmatter "family" has no effect outside a series site' }),
    ]);
  });

  it("reports an MDX syntax error at its position", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-check-"));
    tutorial(join(root, "tutorial"), '---\npreview: off\n---\n\n<Step id="a">\n\nText.\n');
    const [problem] = checkTutorials({ tutorialDirs: [join(root, "tutorial")], cwd: root }).problems;
    expect(problem).toMatchObject({ severity: "error", file: "tutorial/tutorial.mdx", line: 5, column: 1 });
    expect(problem!.message).toContain("Expected a closing tag for `<Step>`");
  });

  it("checks a series: its index.mdx tag groups and the rules across tutorials", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-check-"));
    const series = join(root, "tutorials");
    for (const slug of ["map-js", "map-py"]) {
      tutorial(join(series, slug), `---\ntitle: ${slug}\npreview: off\ntags: [Web]\nfamily: map\nfamilyLabel: Same\n---\n\n# ${slug}\n`);
    }
    writeFileSync(join(series, "index.mdx"), "---\ntitle: Maps\ntagGroups:\n  Platform: [Web, Mobile]\n---\n");
    const { tutorials, problems } = checkTutorials({ seriesDir: series, cwd: root });
    expect(tutorials).toBe(2);
    expect(problems).toEqual([
      { severity: "error", file: "tutorials/index.mdx", message: 'frontmatter tagGroups: no tutorial has the tag(s) "Mobile"' },
      { severity: "error", message: 'sibling tutorials: tutorials "map-js", "map-py" use the same familyLabel "Same" in family "map"' },
    ]);
  });
});

describe("formatCheck", () => {
  const problems = [toProblem("error", "tutorial/tutorial.mdx:3:1 bad"), toProblem("warning", "something odd")];

  it("prints one line per problem and a count", () => {
    expect(formatCheck(problems, { tutorials: 2 })).toBe("error tutorial/tutorial.mdx:3:1 bad\nwarning something odd\n1 error, 1 warning in 2 tutorials.");
    expect(formatCheck([], { tutorials: 1 })).toBe("No problems found in 1 tutorial.");
  });

  it("prints JSON with --json", () => {
    expect(JSON.parse(formatCheck(problems, { json: true }))).toEqual({ ok: false, errors: 1, warnings: 1, problems });
  });
});
