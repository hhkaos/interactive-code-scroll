import { expect, it } from "vitest";
import { consoleSummary, consoleSummaryTokens } from "./console-values.ts";
import { JsonNumber } from "./json-tree-values.ts";

it("summarizes nested JSON in one line, preserving scalar types", () => {
  expect(consoleSummary({ user: { name: "demo" }, name: "Example", active: true })).toBe('{user: {…}, name: "Example", active: true}');
  expect(consoleSummary([new JsonNumber("123"), null, [], new JsonNumber("4")])).toBe('[123, null, […], …]');
});

it("bounds previews with large keys and values", () => {
  expect(consoleSummary({ text: "x".repeat(4000) }).length).toBeLessThanOrEqual(180);
});


it("keeps token types for colored collapsed previews, including untrusted text", () => {
  const tokens = consoleSummaryTokens({ text: "<img onerror=alert(1)>", count: new JsonNumber("2"), active: true });
  expect(tokens).toContainEqual({ kind: "jt-key", text: "text" });
  expect(tokens).toContainEqual({ kind: "jt-str", text: '\"<img onerror=alert(1)>\"' });
  expect(tokens).toContainEqual({ kind: "jt-num", text: "2" });
  expect(tokens).toContainEqual({ kind: "jt-lit", text: "true" });
});
