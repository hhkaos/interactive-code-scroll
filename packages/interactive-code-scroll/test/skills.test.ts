import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TUTORIAL_COMPONENTS } from "../src/check.ts";

// Agent skills (agentskills.io format) shipped from the repository root and inside the package.
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const skillsDir = join(repo, "skills");
const src = join(repo, "packages", "interactive-code-scroll", "src");
const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const read = (path: string) => readFileSync(join(skillsDir, path), "utf8");
/** Every `` `name` `` mentioned in a skill file. */
const codeSpans = (text: string) => new Set([...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]!));
const mentions = (text: string, name: string) => codeSpans(text).has(name) || new RegExp("`[^`\\n]*\\b" + name + "\\b[^`\\n]*`").test(text);

describe("agent skills", () => {
  it("ships the authoring, verify, design, review, talk and migrate skills", () => {
    expect(skills.sort()).toEqual(["ics-authoring", "ics-migrate", "ics-talk", "ics-tutorial-design", "ics-tutorial-review", "ics-verify"]);
  });

  for (const skill of skills) {
    it(`${skill}: SKILL.md follows the Agent Skills specification`, () => {
      const text = read(`${skill}/SKILL.md`);
      const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
      expect(frontmatter, "YAML frontmatter").toBeDefined();
      const name = /^name: (.+)$/m.exec(frontmatter!)?.[1];
      const description = /^description: (.+)$/m.exec(frontmatter!)?.[1];
      expect(name).toBe(skill);
      expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(name!.length).toBeLessThanOrEqual(64);
      expect(description!.length).toBeGreaterThan(0);
      expect(description!.length).toBeLessThanOrEqual(1024);
      expect(text.split("\n").length).toBeLessThan(500);
    });

    it(`${skill}: relative links point at existing files, one level deep`, () => {
      const text = read(`${skill}/SKILL.md`);
      const links = [...text.matchAll(/\]\(((?!https?:)[^)#]+)\)/g)].map((m) => m[1]!);
      for (const link of links) {
        expect(existsSync(join(skillsDir, skill, link)), link).toBe(true);
        expect(link.split("/").length, link).toBeLessThanOrEqual(2);
      }
    });
  }
});

describe("ics-authoring covers the framework", () => {
  const components = read("ics-authoring/references/components.md");

  it("documents every MDX component and each of its props", () => {
    const names = [...TUTORIAL_COMPONENTS, "TutorialList", "TutorialFilter", "TutorialFavorites"];
    for (const name of names) {
      expect(components, `<${name}>`).toContain(`<${name}>`);
      const source = readFileSync(join(src, "components", `${name}.astro`), "utf8");
      const props = /interface Props \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
      for (const [, prop] of props.matchAll(/^\s+(\w+)\??:/gm)) expect(mentions(components, prop!), `<${name} ${prop}>`).toBe(true);
    }
  });

  it("documents every tutorial.mdx and index.mdx frontmatter field and variant key", () => {
    const frontmatter = read("ics-authoring/references/frontmatter.md");
    const source = readFileSync(join(src, "frontmatter.ts"), "utf8");
    const tutorialKeys = /export function readTutorialConfig[\s\S]*?const \{([\s\S]*?)\} = frontmatter;/.exec(source)![1]!;
    const fields = [...tutorialKeys.matchAll(/^\s+(\w+)/gm)].map((m) => m[1]!);
    const indexKeys = [...(/const INDEX_KEYS = new Set\(\[([^\]]*)\]/.exec(source)![1]!.matchAll(/"(\w+)"/g))].map((m) => m[1]!);
    expect(fields.length).toBeGreaterThan(20);
    for (const field of [...fields, ...indexKeys]) expect(mentions(frontmatter, field), field).toBe(true);
    const variants = read("ics-authoring/references/variants-and-series.md");
    const variantKeys = /const \{ ([^}]+) \} = item as/.exec(source)![1]!.split(",").map((key) => key.trim());
    for (const key of variantKeys) expect(mentions(variants, key), `variants[].${key}`).toBe(true);
  });

  it("documents every CLI command and option", () => {
    const setup = read("ics-authoring/references/project-setup.md");
    const cli = readFileSync(join(repo, "packages", "interactive-code-scroll", "bin", "interactive-code-scroll.mjs"), "utf8");
    const set = (name: string) => [...(new RegExp(`const ${name} = new Set\\(\\[([^\\]]*)\\]`).exec(cli)![1]!.matchAll(/"([\w-]+)"/g))].map((m) => m[1]!);
    for (const command of set("COMMANDS")) expect(mentions(setup, command), command).toBe(true);
    for (const option of [...set("VALUE_OPTIONS"), ...set("OPTIONAL_VALUE_OPTIONS"), ...set("BOOLEAN_OPTIONS")]) {
      expect(mentions(setup, option.replace(/^--/, "")), option).toBe(true);
    }
  });
});
