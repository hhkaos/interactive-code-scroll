import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASSERTION_TYPES, grade } from "../../../scripts/skills-eval/grade.mjs";

// The agent run is manual (`pnpm eval:skills`); the tasks and the grading are deterministic and tested here.
// Loaded by URL so `tsc` (pnpm check) does not follow run.mjs into the CLI, which is not written for strict checks.
const { readTasks, setUp } = await import(new URL("../../../scripts/skills-eval/run.mjs", import.meta.url).href);
const { tasks } = readTasks();
const files = fileURLToPath(new URL("../../../scripts/skills-eval/files/", import.meta.url));
const task = (/** @type {string} */ id) => tasks.find((t) => t.id === id);
const project = (/** @type {string} */ id) => {
  const root = mkdtempSync(join(tmpdir(), `ics-eval-test-${id}-`));
  setUp(task(id), root);
  const start = `${root}-start`;
  cpSync(root, start, { recursive: true });
  return { root, start };
};
const edit = (/** @type {string} */ path, /** @type {(text: string) => string} */ change) => writeFileSync(path, change(readFileSync(path, "utf8")));

describe("skill eval tasks", () => {
  it("are well formed", () => {
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    for (const t of tasks) {
      expect(["web", "empty"], t.id).toContain(t.starter);
      if (t.files) expect(existsSync(join(files, t.files)), t.id).toBe(true);
      expect(t.assertions.length, t.id).toBeGreaterThan(0);
      for (const a of t.assertions) {
        expect(ASSERTION_TYPES, `${t.id} ${a.type}`).toContain(a.type);
        if ("pattern" in a) expect(() => new RegExp(a.pattern), `${t.id} /${a.pattern}/`).not.toThrow();
      }
    }
  });

  it("start from a valid project with the skills, AGENTS.md and a check script", () => {
    const { root } = project("add-varfield");
    expect(existsSync(join(root, ".claude", "skills", "ics-authoring", "SKILL.md"))).toBe(true);
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n");
    expect(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.check).toMatch(/interactive-code-scroll\.mjs" check$/);
    expect(grade(root, root, [{ type: "check" }])[0].pass).toBe(true);
  });
});

describe("grade", () => {
  it("fails an untouched project and passes a correct solution (add-varfield)", () => {
    const { root, start } = project("add-varfield");
    expect(grade(root, start, task("add-varfield").assertions).filter((r) => !r.pass).map((r) => r.assertion.type)).toEqual(["grows", "grows", "grows", "grows"]);

    edit(join(root, "tutorial", "code", "main.js"), (js) =>
      js
        .replace("// #region run", '// #region greeting\nconst greeting = "Hello"; // @var greeting\n// #endregion greeting\n\n// #region run')
        .replace("`Hello, ${name}!`", "`${greeting}, ${name}!`"),
    );
    edit(join(root, "tutorial", "tutorial.mdx"), (mdx) => `${mdx}\n<Step id="greeting" file="main.js" region="greeting">\n\n## Pick the greeting\n\n<VarField name="greeting" label="Greeting" />\n\n</Step>\n`);
    expect(grade(root, start, task("add-varfield").assertions).every((r) => r.pass)).toBe(true);
  });

  it("reports what is missing: files, matches, counts and changes", () => {
    const { root, start } = project("review");
    const results = grade(root, start, task("review").assertions);
    expect(results.map((r) => [r.assertion.type, r.pass, r.detail])).toEqual([
      ["matches", false, "missing"],
      ["matches", false, "missing"],
      ["unchanged", true, "unchanged"],
      ["check", true, "no errors"],
    ]);
    writeFileSync(join(root, "REVIEW.md"), "# Review: Demo\n\n### config · minor · Prose\nShorter sentence.\n");
    edit(join(root, "tutorial", "tutorial.mdx"), (mdx) => mdx.replace("## Configure", "## Configure the name"));
    expect(grade(root, start, task("review").assertions).map((r) => r.pass)).toEqual([true, true, false, true]);
    expect(grade(root, start, [{ type: "count", path: "REVIEW.md", pattern: "^### ", min: 2 }])[0].detail).toBe("1 found, 2 needed");
  });

  it("fails check when there is no tutorial yet (migrate-post) and shows why", () => {
    const { root, start } = project("migrate-post");
    expect(existsSync(join(root, "post.md"))).toBe(true);
    const [check] = grade(root, start, [{ type: "check" }]);
    expect(check.pass).toBe(false);
    expect(check.detail).toContain("Tutorial file not found");
  });
});
