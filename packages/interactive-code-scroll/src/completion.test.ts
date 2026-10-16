import { describe, expect, it } from "vitest";
import { fillUrl, nextProblems, nextTutorial } from "./completion.ts";

const series = [
  { slug: "alpha", title: "Alpha" },
  { slug: "beta", title: "Beta", next: "delta" },
  { slug: "gamma", title: "Gamma", next: false as const },
  { slug: "delta", title: "Delta" },
];

describe("nextTutorial", () => {
  it("follows the series order without `next`", () => {
    expect(nextTutorial(series, "alpha")?.slug).toBe("beta");
  });

  it("uses `next` when set, and none with `next: false`", () => {
    expect(nextTutorial(series, "beta")?.slug).toBe("delta");
    expect(nextTutorial(series, "gamma")).toBeUndefined();
  });

  it("has none after the last tutorial or for an unknown slug", () => {
    expect(nextTutorial(series, "delta")).toBeUndefined();
    expect(nextTutorial(series, "omega")).toBeUndefined();
  });
});

describe("nextProblems", () => {
  it("accepts slugs of the series and `false`", () => {
    expect(nextProblems(series)).toEqual([]);
  });

  it("reports unknown slugs and self references", () => {
    expect(nextProblems([{ slug: "alpha", title: "A", next: "alpha" }, { slug: "beta", title: "B", next: "omega" }])).toEqual([
      'tutorials/alpha: "next" points at the tutorial itself',
      'tutorials/beta: "next" tutorial "omega" is not in the series',
    ]);
  });
});

describe("fillUrl", () => {
  it("fills {slug} and {title}, URL-encoded", () => {
    expect(fillUrl("https://github.com/o/r/issues/new?title=Feedback:%20{title}&labels={slug}", { slug: "display-map", title: "Display a map & pan" })).toBe(
      "https://github.com/o/r/issues/new?title=Feedback:%20Display%20a%20map%20%26%20pan&labels=display-map",
    );
  });

  it("leaves URLs without placeholders as they are", () => {
    expect(fillUrl("mailto:docs@example.com", { slug: "", title: "T" })).toBe("mailto:docs@example.com");
  });
});
