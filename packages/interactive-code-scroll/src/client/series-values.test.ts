import { describe, expect, it } from "vitest";
import {
  countLabel,
  familyMap,
  groupTags,
  highlightRanges,
  isEmptyState,
  knownState,
  matchesFilter,
  matchesTags,
  matchesText,
  normalize,
  readState,
  searchWords,
  suggestTags,
  tagCounts,
  topTags,
  writeState,
} from "./series-values.ts";

const empty = { q: "", tags: [], level: "" };

describe("series tag filter", () => {
  it("keeps every card without a selection, else cards with any selected tag", () => {
    expect(matchesTags([], [])).toBe(true);
    expect(matchesTags(["Web", "Python"], ["Python", "REST"])).toBe(true);
    expect(matchesTags(["Web"], ["Python"])).toBe(false);
  });

  it("matches OR within a family and AND across families", () => {
    const families = familyMap([
      { name: "Language", tags: ["Python", "JavaScript"] },
      { name: "Auth", tags: ["OAuth", "API keys"] },
    ]);
    expect(matchesTags(["JavaScript", "OAuth"], ["Python", "JavaScript", "OAuth"], families)).toBe(true);
    expect(matchesTags(["JavaScript"], ["Python", "JavaScript", "OAuth"], families)).toBe(false);
    // Tags outside tagGroups form one "Other" family.
    expect(matchesTags(["Python", "Maps"], ["Python", "Maps", "Portal"], families)).toBe(true);
    expect(matchesTags(["Maps"], ["Python", "Maps"], families)).toBe(false);
  });

  it("counts tutorials", () => {
    expect(countLabel(3, 3)).toBe("3 tutorials");
    expect(countLabel(1, 1)).toBe("1 tutorial");
    expect(countLabel(1, 3)).toBe("1 of 3 tutorials");
  });
});

describe("series text search", () => {
  const card = { title: "Geocoding with cURL", description: "Find an address. Café edition.", tags: ["REST API"], level: "Beginner" };

  it("ignores case and accents and needs every word", () => {
    expect(normalize("Café ÀÉÎ")).toBe("cafe aei");
    expect(searchWords("  Geo  geo cafe ")).toEqual(["geo", "cafe"]);
    expect(matchesText(card, searchWords("geocoding CAFÉ"))).toBe(true);
    expect(matchesText(card, searchWords("rest beginner"))).toBe(true);
    expect(matchesText(card, searchWords("geocoding python"))).toBe(false);
    expect(matchesText(card, [])).toBe(true);
  });

  it("combines text, tags and level", () => {
    expect(matchesFilter(card, empty)).toBe(true);
    expect(matchesFilter(card, { q: "address", tags: ["REST API"], level: "Beginner" })).toBe(true);
    expect(matchesFilter(card, { q: "address", tags: [], level: "Advanced" })).toBe(false);
    expect(matchesFilter(card, { q: "address", tags: ["Python"], level: "" })).toBe(false);
  });

  it("highlights matches in the original text, merging overlaps", () => {
    const mark = (text: string, query: string) =>
      highlightRanges(text, searchWords(query))
        .map(([start, end]) => text.slice(start, end))
        .join("|");
    expect(mark("Café and cafe", "cafe")).toBe("Café|cafe");
    expect(mark("Geocoding", "geo ding")).toBe("Geo|ding");
    expect(mark("Geocoding", "geo coding")).toBe("Geocoding");
    expect(mark("Geocoding", "geoc eoc")).toBe("Geoc");
    expect(mark("Ünïcode 🌍 map", "map")).toBe("map");
    expect(highlightRanges("Geocoding", [])).toEqual([]);
  });
});

describe("series tag lists", () => {
  const cards = [{ tags: ["Web", "Python"] }, { tags: ["Python", "Maps"] }, { tags: ["Python", "Web", "Auth"] }];
  const counts = tagCounts(cards);

  it("ranks the most used tags and keeps selected ones visible", () => {
    expect([...counts]).toEqual([
      ["Web", 2],
      ["Python", 3],
      ["Maps", 1],
      ["Auth", 1],
    ]);
    expect(topTags(counts, 3)).toEqual(["Python", "Web", "Maps"]);
    expect(topTags(counts, 2, ["Auth", "Web", "Gone"])).toEqual(["Python", "Web", "Auth"]);
  });

  it("groups tags by family in tagGroups order, the rest under Other", () => {
    const groups = [
      { name: "Platform", tags: ["Web", "Desktop"] },
      { name: "Language", tags: ["Python"] },
      { name: "Empty", tags: ["Rust"] },
    ];
    expect(groupTags([...counts.keys()], groups)).toEqual([
      { name: "Platform", tags: ["Web"] },
      { name: "Language", tags: ["Python"] },
      { name: "Other", tags: ["Auth", "Maps"] },
    ]);
    expect(groupTags(["Web"], [])).toEqual([{ name: "Other", tags: ["Web"] }]);
  });

  it("suggests tags containing the text, prefix matches first, never selected ones", () => {
    const many = new Map([
      ["ArcGIS REST JS", 2],
      ["REST API", 4],
      ["Restaurants", 1],
      ["Python", 3],
    ]);
    expect(suggestTags("rest", many, [])).toEqual(["REST API", "Restaurants", "ArcGIS REST JS"]);
    expect(suggestTags("rest", many, ["REST API"], 1)).toEqual(["Restaurants"]);
    expect(suggestTags("  ", many, [])).toEqual([]);
    expect(suggestTags("pýth", many, [])).toEqual(["Python"]);
  });
});

describe("series filter URL state", () => {
  it("reads and writes q, tags and level, keeping other parameters", () => {
    expect(readState("?q=geo%20code&tags=Python,REST%20API,Python&level=Beginner")).toEqual({
      q: "geo code",
      tags: ["Python", "REST API"],
      level: "Beginner",
    });
    expect(readState("")).toEqual(empty);
    expect(writeState({ q: "geo", tags: ["Python", "REST API"], level: "" }, "?ref=x&q=old")).toBe("?ref=x&q=geo&tags=Python%2CREST+API");
    expect(writeState(empty, "?q=old&level=x")).toBe("");
    expect(readState(writeState({ q: "a&b", tags: ["C++"], level: "Pro" }))).toEqual({ q: "a&b", tags: ["C++"], level: "Pro" });
  });

  it("drops unknown tags and levels and tells an empty state", () => {
    expect(knownState({ q: "x", tags: ["Python", "Gone"], level: "Gone" }, new Set(["Python"]), new Set(["Beginner"]))).toEqual({
      q: "x",
      tags: ["Python"],
      level: "",
    });
    expect(isEmptyState(empty)).toBe(true);
    expect(isEmptyState({ ...empty, q: "  " })).toBe(true);
    expect(isEmptyState({ ...empty, level: "Beginner" })).toBe(false);
  });
});
