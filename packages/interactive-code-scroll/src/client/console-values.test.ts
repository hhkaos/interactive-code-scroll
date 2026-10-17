import { expect, it } from "vitest";
import { consoleSummary } from "./console-values.ts";
import { JsonNumber } from "./json-tree-values.ts";

it("summarizes nested JSON in one line, preserving scalar types", () => {
  expect(consoleSummary({ user: { name: "demo" }, name: "Example", active: true })).toBe('{user: {…}, name: "Example", active: true}');
  expect(consoleSummary([new JsonNumber("123"), null, [], new JsonNumber("4")])).toBe('[123, null, […], …]');
});

it("bounds previews with large keys and values", () => {
  expect(consoleSummary({ text: "x".repeat(4000) }).length).toBeLessThanOrEqual(180);
});
