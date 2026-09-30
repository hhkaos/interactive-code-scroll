import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { allTags, discoverTutorials, familyOf, familyProblems, parseTagList, selectCards, sortCards } from "./series.ts";

function seriesWith(folders: Record<string, boolean>): string {
  const dir = mkdtempSync(join(tmpdir(), "ics-series-"));
  for (const [name, withMdx] of Object.entries(folders)) {
    mkdirSync(join(dir, name));
    if (withMdx) writeFileSync(join(dir, name, "tutorial.mdx"), "# T\n");
  }
  return dir;
}

describe("discoverTutorials", () => {
  it("lists subfolders with tutorial.mdx by slug, skipping the rest", () => {
    const dir = seriesWith({ rest: true, "a-2": true, shared: false, images: false, _drafts: true, ".cache": true });
    writeFileSync(join(dir, "index.mdx"), "# Index\n");
    const warn = vi.fn();
    expect(discoverTutorials(dir, warn)).toEqual([
      { slug: "a-2", dir: join(dir, "a-2") },
      { slug: "rest", dir: join(dir, "rest") },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/skipped .*shared: no tutorial\.mdx/));
  });

  it("rejects folder names that are not URL slugs", () => {
    const dir = seriesWith({ ok: true, "My Tutorial": true, Rest: true });
    expect(() => discoverTutorials(dir)).toThrow(/must match .*: My Tutorial, Rest/);
  });

  it("fails when the folder is missing or holds no tutorial", () => {
    expect(() => discoverTutorials(join(tmpdir(), "ics-missing-series"))).toThrow(/tutorials folder not found/);
    expect(() => discoverTutorials(seriesWith({ empty: false }), () => {})).toThrow(/no tutorial found/);
  });
});

describe("index cards", () => {
  const cards = [
    { title: "Gamma", tags: ["Web"] },
    { title: "Beta", tags: ["Web", "Python"], level: "Intermediate", order: 2 },
    { title: "Alpha", tags: ["Web", "JavaScript"], level: "Beginner", order: 1 },
    { title: "Delta", tags: [] },
  ];

  it("sorts by order, then by title", () => {
    expect(sortCards(cards).map((c) => c.title)).toEqual(["Alpha", "Beta", "Delta", "Gamma"]);
  });

  it("selects any of the tags and the exact level", () => {
    expect(parseTagList(" Python, JavaScript ,,Python")).toEqual(["Python", "JavaScript"]);
    expect(parseTagList(undefined)).toEqual([]);
    expect(selectCards(cards, { tags: ["Python", "JavaScript"] }).map((c) => c.title)).toEqual(["Beta", "Alpha"]);
    expect(selectCards(cards, { level: "Beginner" }).map((c) => c.title)).toEqual(["Alpha"]);
    expect(selectCards(cards, { tags: ["Web"], level: "Intermediate" }).map((c) => c.title)).toEqual(["Beta"]);
    expect(selectCards(cards, {})).toHaveLength(4);
  });

  it("lists every tag once in first-seen order", () => {
    expect(allTags(cards)).toEqual(["Web", "Python", "JavaScript"]);
  });
});

describe("sibling tutorials", () => {
  const js = { slug: "map-js", family: { id: "map", label: "JavaScript" }, order: 1 };
  const py = { slug: "map-py", family: { id: "map", label: "Python" } };
  const kt = { slug: "map-kt", family: { id: "map", label: "Kotlin" } };
  const lone = { slug: "rest", family: { id: "rest", label: "cURL" } };
  const plain = { slug: "intro" };

  it("orders a family by order, then label, and leaves others out", () => {
    expect(familyOf([py, plain, kt, js], "map-py").map((m) => m.slug)).toEqual(["map-js", "map-kt", "map-py"]);
    expect(familyOf([py, js, plain], "intro")).toEqual([]);
  });

  it("shows no switcher for a family of one", () => {
    expect(familyOf([lone, js, py], "rest")).toEqual([]);
  });

  it("reports duplicate labels as errors and families of one as warnings", () => {
    const { errors, warnings } = familyProblems([js, py, { slug: "map-ts", family: { id: "map", label: "JavaScript" } }, lone, plain]);
    expect(errors).toEqual(['tutorials "map-js", "map-ts" use the same familyLabel "JavaScript" in family "map"']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"rest" is the only one in family "rest"');
  });

  it("accepts a valid family", () => {
    expect(familyProblems([js, py, plain])).toEqual({ errors: [], warnings: [] });
  });
});
