import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { anchors, changes, checkDocs } from "../../../scripts/check-docs.mjs";
import { docsPages, docsSourceUrl } from "../../../site/docs-config.mjs";

const roots = [];
const version = "0.2.0-beta.10";
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const write = (root, path, text) => {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text);
};
const json = (root, path, data) => write(root, path, JSON.stringify(data));
const read = (root, path) => readFileSync(join(root, path), "utf8");
const manifestPath = "docs/dev/documentation-review.json";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ics-doc-review-"));
  roots.push(root);
  execFileSync("git", ["init", "--quiet", root]);
  for (const name of ["interactive-code-scroll", "create-interactive-code-scroll"]) {
    json(root, `packages/${name}/package.json`, { version });
  }
  write(root, "packages/interactive-code-scroll/src/example.ts", "export const example = true;\n");
  write(root, "CHANGELOG.md", `# Changelog\n\n## [Unreleased]\n\n## [${version}] - 2026-10-17\n\n### Added\n\n- Optional setting.\n`);
  write(root, "docs/authoring.md", "# Authoring\n\n## Settings\n\nUse the optional setting.\n");
  write(root, "docs/upgrade.md", "# Upgrade\n\n## Migration\n");
  json(root, manifestPath, { changes: [{ change: "Optional setting.", docs: ["docs/authoring.md#settings"] }] });
  checkDocs(root, { refresh: true });
  return root;
}
function update(root, callback) {
  const manifest = JSON.parse(read(root, manifestPath));
  callback(manifest);
  json(root, manifestPath, manifest);
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

it("accepts documented non-breaking additions and a ready release", () => {
  const root = fixture();
  expect(checkDocs(root)).toContain("1 changelog");
  expect(checkDocs(root, { release: true })).toContain("1 changelog");
});

it("requires a review for every bullet, including compatible fixes", () => {
  const root = fixture();
  write(root, "CHANGELOG.md", read(root, "CHANGELOG.md") + "\n### Fixed\n\n- Compatible fix.\n");
  expect(() => checkDocs(root, { refresh: true })).toThrow("expected one documentation review");
});

it("rejects missing files and anchors, even during refresh", () => {
  const root = fixture();
  for (const link of ["docs/absent.md#missing", "docs/authoring.md#missing", "../secret#settings"]) {
    update(root, (m) => { m.changes[0].docs = [link]; });
    expect(() => checkDocs(root, { refresh: true })).toThrow(/Missing documentation|Use a public/);
  }
});

it("requires either section links or a specific no-docs reason", () => {
  const root = fixture();
  update(root, (m) => { m.changes[0] = { change: "Optional setting.", reason: "No docs" }; });
  expect(() => checkDocs(root, { refresh: true })).toThrow("specific no-docs reason");
  update(root, (m) => { m.changes[0].reason = "Internal maintenance with no change to author or reader behavior."; });
  expect(checkDocs(root, { refresh: true })).toContain("1 changelog");
  update(root, (m) => { m.changes[0].docs = ["docs/authoring.md#settings"]; });
  expect(() => checkDocs(root, { refresh: true })).toThrow("Choose documentation links OR");
});

it("requires breaking changes to link to a migration section", () => {
  const root = fixture();
  update(root, (m) => { m.changes[0].breaking = true; });
  expect(() => checkDocs(root, { refresh: true })).toThrow("Breaking changes require");
  update(root, (m) => { m.changes[0].docs.push("docs/upgrade.md#migration"); });
  expect(checkDocs(root, { refresh: true })).toContain("1 changelog");
});

it("recognizes labelled breaking changes without treating non-breaking notes as migrations", () => {
  const root = fixture();
  const replaceChange = (change) => {
    write(root, "CHANGELOG.md", `## [Unreleased]\n\n## [${version}] - 2026-10-17\n\n### Changed\n\n- ${change}\n`);
    update(root, (m) => { m.changes[0].change = change; });
  };
  replaceChange("Non-breaking optional setting.");
  expect(checkDocs(root, { refresh: true })).toContain("1 changelog");
  replaceChange("**Breaking authoring change:** a renamed setting.");
  expect(() => checkDocs(root, { refresh: true })).toThrow("Breaking changes require");
});

it("detects tracked and untracked package changes and prevents blind refresh", () => {
  const root = fixture();
  execFileSync("git", ["add", "packages"], { cwd: root });
  expect(checkDocs(root)).toContain("1 changelog");
  write(root, "packages/interactive-code-scroll/src/new.ts", "export const added = true;");
  expect(() => checkDocs(root)).toThrow("Package inputs changed");
  expect(() => checkDocs(root, { refresh: true })).toThrow("without a changelog review change");
  write(root, "CHANGELOG.md", read(root, "CHANGELOG.md") + "\n- New optional API.\n");
  update(root, (m) => { m.changes.push({ change: "New optional API.", docs: ["docs/authoring.md#settings"] }); });
  expect(checkDocs(root, { refresh: true })).toContain("2 changelog");
  write(root, "packages/interactive-code-scroll/src/example.ts", "export const example = false;");
  expect(() => checkDocs(root)).toThrow("Package inputs changed");
});

it("detects document drift but excludes test-only changes from package fingerprints", () => {
  const root = fixture();
  write(root, "packages/interactive-code-scroll/src/example.test.ts", "// Focused regression test");
  expect(checkDocs(root)).toContain("1 changelog");
  write(root, "docs/authoring.md", read(root, "docs/authoring.md") + "\nMore usage guidance.\n");
  expect(() => checkDocs(root)).toThrow("Reviewed documents changed");
  expect(checkDocs(root, { refresh: true })).toContain("1 changelog");
});

it("rejects duplicate and obsolete review records", () => {
  const root = fixture();
  update(root, (m) => { m.changes.push(m.changes[0]); });
  expect(() => checkDocs(root)).toThrow("expected one documentation review");
  update(root, (m) => { m.changes[1].change = "Removed entry."; });
  expect(() => checkDocs(root)).toThrow("Stale documentation review");
});

it("blocks pending notes, absent release notes and mismatched package versions", () => {
  const root = fixture();
  write(root, "CHANGELOG.md", read(root, "CHANGELOG.md").replace("## [Unreleased]", "## [Unreleased]\n\n### Changed\n\n- Internal maintenance."));
  update(root, (m) => { m.changes.push({ change: "Internal maintenance.", reason: "Internal tooling change with no public behavior difference." }); });
  checkDocs(root, { refresh: true });
  expect(() => checkDocs(root, { release: true })).toThrow("Move Unreleased entries");
  for (const name of ["interactive-code-scroll", "create-interactive-code-scroll"]) {
    json(root, `packages/${name}/package.json`, { version: "0.2.0-beta.11" });
  }
  expect(() => checkDocs(root, { release: true })).toThrow("Latest changelog release must match");
  json(root, "packages/create-interactive-code-scroll/package.json", { version });
  expect(() => checkDocs(root)).toThrow("Package versions must match");
});

it("parses multiline entries and ignores code fences when locating headings", () => {
  expect(changes("## [Unreleased]\n### Added\n- One.\n\n  Details.\n\n- Two.\n")).toEqual([
    { version: "Unreleased", change: "One.\n\n  Details." }, { version: "Unreleased", change: "Two." },
  ]);
  expect([...anchors('# Title\n## `<Step>` settings\n```md\n## Fake\n```\n## Title')]).toEqual(["title", "step-settings", "title-1"]);
});

it("gates both npm publications and site deployment, and the local release preflight", () => {
  for (const workflow of ["ci", "publish-site", "publish-npm"]) {
    const text = read(repo, `.github/workflows/${workflow}.yml`);
    const guard = text.indexOf("run: node scripts/check-docs.mjs");
    expect(guard).toBeGreaterThan(0);
    if (workflow === "publish-npm") {
      expect(text).toContain("run: node scripts/check-docs.mjs --release");
      expect(guard).toBeLessThan(text.indexOf("npm publish"));
    }
    if (workflow === "publish-site") expect(guard).toBeLessThan(text.indexOf("Upload Pages artifact"));
  }
  expect(JSON.parse(read(repo, "package.json")).scripts["preflight:release"]).toMatch(/^node scripts\/check-docs.mjs --release &&/);
});

it("links each website doc directly to its repository Markdown source", () => {
  for (const { file } of docsPages) {
    expect(docsSourceUrl(`docs/${file}`)).toBe(`https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/${file}.md`);
  }
  expect(docsSourceUrl("404")).toBeUndefined();
});
