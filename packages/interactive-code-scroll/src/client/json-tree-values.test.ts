import { describe, expect, it } from "vitest";
import { entries, JsonNumber, literal, nextShown, PAGE, parseJson, startsExpanded, summary, treeKey } from "./json-tree-values.ts";

describe("parseJson", () => {
  it("parses JSON and keeps numbers as their source text", () => {
    const result = parseJson('{"id": 9007199254740993, "score": 98.10, "ok": true, "none": null}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const value = result.value as Record<string, unknown>;
    expect(value.id).toBeInstanceOf(JsonNumber);
    // Node supports source text access: no rounding to ...992 and trailing zeros kept.
    expect(literal(value.id as JsonNumber)).toBe("9007199254740993");
    expect(literal(value.score as JsonNumber)).toBe("98.10");
    expect(value.ok).toBe(true);
    expect(value.none).toBeNull();
  });

  it("reports invalid JSON instead of throwing", () => {
    expect(parseJson("{ not json")).toEqual({ ok: false });
    expect(parseJson("")).toEqual({ ok: false });
  });
});

describe("literal", () => {
  it("shows strings as JSON with visible escapes, and booleans and null as keywords", () => {
    expect(literal('a "b"\n<i>')).toBe('"a \\"b\\"\\n<i>"');
    expect(literal(false)).toBe("false");
    expect(literal(null)).toBe("null");
  });
});

describe("tree shape", () => {
  it("starts containers down to depth 2 expanded and deeper ones collapsed", () => {
    expect([0, 1, 2, 3, 4].map(startsExpanded)).toEqual([true, true, true, false, false]);
  });

  it("summarizes containers with singular and plural nouns", () => {
    expect(summary({ a: null })).toBe("1 key");
    expect(summary({})).toBe("0 keys");
    expect(summary([null, null, null])).toBe("3 items");
    expect(summary([true])).toBe("1 item");
  });

  it("labels object entries by key and array items by nothing", () => {
    expect(entries({ a: true, b: null })).toEqual([["a", true], ["b", null]]);
    expect(entries([true, null])).toEqual([[undefined, true], [undefined, null]]);
  });

  it("shows more entries one page at a time", () => {
    expect(PAGE).toBe(100);
    expect(nextShown(250, 100)).toBe(200);
    expect(nextShown(250, 200)).toBe(250);
    expect(nextShown(40, 0)).toBe(40);
  });
});

describe("treeKey", () => {
  const leaf = { expandable: false, expanded: false };
  const open = { expandable: true, expanded: true };
  const closed = { expandable: true, expanded: false };

  it("moves between visible items", () => {
    expect(treeKey("ArrowDown", leaf)).toBe("next");
    expect(treeKey("ArrowUp", leaf)).toBe("prev");
    expect(treeKey("Home", open)).toBe("first");
    expect(treeKey("End", closed)).toBe("last");
  });

  it("expands, then enters; collapses, then leaves", () => {
    expect(treeKey("ArrowRight", closed)).toBe("expand");
    expect(treeKey("ArrowRight", open)).toBe("child");
    expect(treeKey("ArrowRight", leaf)).toBe("none");
    expect(treeKey("ArrowLeft", open)).toBe("collapse");
    expect(treeKey("ArrowLeft", closed)).toBe("parent");
    expect(treeKey("ArrowLeft", leaf)).toBe("parent");
  });

  it("toggles containers with Enter and Space", () => {
    expect(treeKey("Enter", open)).toBe("toggle");
    expect(treeKey(" ", closed)).toBe("toggle");
    expect(treeKey("Enter", leaf)).toBe("none");
    expect(treeKey("a", open)).toBe("none");
  });
});
