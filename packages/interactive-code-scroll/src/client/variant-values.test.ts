import { describe, expect, it } from "vitest";
import {
  counterpartFile,
  coversVariant,
  listLabels,
  nearestVisible,
  pickVariant,
  readStoredVariant,
  switcherKind,
  withVariantParam,
  writeStoredVariant,
} from "./variant-values.ts";

const ids = ["python", "curl", "node"];

describe("pickVariant", () => {
  it.each([
    ["", undefined, "python"],
    ["", "curl", "curl"],
    ["?variant=node", "curl", "node"],
    ["?variant=rust", "curl", "curl"],
    ["?variant=rust", "go", "python"],
  ])("search %j, stored %j → %s", (search, stored, expected) => {
    expect(pickVariant(ids, search, stored)).toBe(expected);
  });
});

describe("stored variant", () => {
  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readStoredVariant(broken)).toBeUndefined();
    expect(() => writeStoredVariant(broken, "curl")).not.toThrow();
  });
});

describe("coversVariant", () => {
  it("covers every variant without only=, else the listed ones", () => {
    expect(coversVariant(undefined, "curl")).toBe(true);
    expect(coversVariant("python node", "node")).toBe(true);
    expect(coversVariant("python node", "curl")).toBe(false);
  });
});

describe("withVariantParam", () => {
  it("sets the parameter and keeps the others and the hash", () => {
    expect(withVariantParam("https://x.test/t/?a=1&variant=python#step", "curl")).toBe("https://x.test/t/?a=1&variant=curl#step");
  });
});

describe("counterpartFile", () => {
  const python = { dir: "python", entry: "main.py" };
  const node = { dir: "node", entry: "index.mjs" };
  const tabs = new Set(["python/README.md", "node/README.md", "node/index.mjs"]);

  it("keeps the same path when the other variant has it as a tab", () => {
    expect(counterpartFile("python/README.md", python, node, tabs)).toBe("node/README.md");
  });

  it("falls back to the other variant's entry", () => {
    expect(counterpartFile("python/main.py", python, node, tabs)).toBe("node/index.mjs");
    expect(counterpartFile(undefined, python, node, tabs)).toBe("node/index.mjs");
  });
});

describe("listLabels", () => {
  it.each([
    [["Python"], "Python"],
    [["Python", "cURL"], "Python and cURL"],
    [["Python", "cURL", "Go"], "Python, cURL and Go"],
  ])("%j", (labels, expected) => {
    expect(listLabels(labels)).toBe(expected);
  });
});

describe("nearestVisible", () => {
  const all = ["a", "b", "c", "d"];

  it("finds the step itself, else the nearest earlier visible one, else the first", () => {
    expect(nearestVisible(all, ["a", "c", "d"], "c")).toBe(1);
    expect(nearestVisible(all, ["a", "d"], "c")).toBe(0);
    expect(nearestVisible(all, ["c", "d"], "b")).toBe(0);
  });
});

describe("switcherKind", () => {
  it("uses the segmented control for up to four variants whose tabs all fit", () => {
    expect(switcherKind(3, 500, 320)).toBe("segmented");
    expect(switcherKind(4, 320, 320)).toBe("segmented");
  });

  it("uses the dropdown from five variants, or when the tabs would overflow", () => {
    expect(switcherKind(5, 2000, 100)).toBe("dropdown");
    expect(switcherKind(3, 300, 320)).toBe("dropdown");
  });
});
