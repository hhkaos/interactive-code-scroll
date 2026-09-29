import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { discoverTutorials } from "./series.ts";

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
    const dir = seriesWith({ rest: true, "a-2": true, shared: false, _drafts: true, ".cache": true });
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
