import { describe, expect, it } from "vitest";
import { parseSource } from "./markers.ts";
import { resultVariants, stepFileOrder, stepFiles, variantVisible } from "./variants.ts";

const variants = [
  { id: "python", label: "Python", dir: "python", entry: "main.py", files: ["main.py", "*.txt"] },
  { id: "node", label: "Node.js", dir: "node", entry: "index.mjs" },
];
const parsed = new Map(
  [
    ["python/main.py", "# region auth\nx = 1\n# endregion"],
    ["node/index.mjs", "const a = 1;"],
    ["node/api.mjs", "// #region auth\nconst b = 2;\n// #endregion"],
  ].map(([path, source]) => [path!, parseSource(source!, path)]),
);

describe("variantVisible", () => {
  it("selects the variant's tabs with paths relative to code/", () => {
    expect(variantVisible(variants[0]!, ["python/main.py", "python/util.py", "python/req.txt", "node/index.mjs", "pythonic/x.py"])).toEqual({
      visible: ["python/main.py", "python/req.txt"],
      unmatched: [],
    });
    expect(variantVisible(variants[1]!, ["node/index.mjs", "node/api.mjs"]).visible).toEqual(["node/api.mjs", "node/index.mjs"]);
  });

  it("orders the variant's tabs by the steps when it has no files patterns", () => {
    expect(variantVisible(variants[1]!, ["node/index.mjs", "node/api.mjs"], ["python/main.py", "node/index.mjs"]).visible).toEqual(["node/index.mjs", "node/api.mjs"]);
  });
});

describe("stepFileOrder", () => {
  it("lists step files in first-reference order", () => {
    expect(stepFileOrder([{ file: "b.js" }, {}, { file: "a.js" }, { file: "b.js" }], undefined, parsed)).toEqual(["b.js", "a.js"]);
  });

  it("resolves each variant's file, including lone regions", () => {
    expect(stepFileOrder([{ region: "auth" }, { file: "index.mjs", only: "node" }], variants, parsed)).toEqual([
      "python/main.py",
      "node/api.mjs",
      "node/index.mjs",
    ]);
  });
});

describe("stepFiles", () => {
  it("resolves a lone region to the file that defines it in each variant", () => {
    expect(stepFiles(variants, parsed, { region: "auth" })).toEqual({ python: "python/main.py", node: "node/api.mjs" });
  });

  it("places a file in every covered variant folder", () => {
    expect(stepFiles(variants, parsed, { file: "README.md", only: "node" })).toEqual({ node: "node/README.md" });
  });

  it("is empty for text-only steps", () => {
    expect(stepFiles(variants, parsed, {})).toEqual({});
  });
});

describe("resultVariants", () => {
  it("keeps the covered variants that are not web code", () => {
    const ids = (list: { id: string }[]) => list.map((v) => v.id);
    expect(ids(resultVariants(variants, new Set()))).toEqual(["python", "node"]);
    expect(ids(resultVariants(variants, new Set(["node"])))).toEqual(["python"]);
    expect(ids(resultVariants(variants, new Set(), "node"))).toEqual(["node"]);
  });
});
