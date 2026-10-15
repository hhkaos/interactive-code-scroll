import { describe, expect, it } from "vitest";
import { favoritesKey, readFavorites, toggleFavorite } from "./favorites-values.ts";

const known = new Set(["alpha", "beta", "gamma"]);

describe("favoritesKey", () => {
  it("namespaces favorites by the site base", () => {
    expect(favoritesKey("/")).toBe("ics:favorites:/");
    expect(favoritesKey("/series-a/")).not.toBe(favoritesKey("/series-b/"));
  });
});

describe("readFavorites", () => {
  it("reads a list of slugs in stored order", () => {
    expect(readFavorites('["gamma","alpha"]', known)).toEqual(["gamma", "alpha"]);
  });

  it("ignores slugs no longer in the series, duplicates and non-strings", () => {
    expect(readFavorites('["alpha","removed",3,null,"alpha"]', known)).toEqual(["alpha"]);
  });

  it("treats a missing, corrupt or non-list value as no favorites", () => {
    expect(readFavorites(null, known)).toEqual([]);
    expect(readFavorites("{not json", known)).toEqual([]);
    expect(readFavorites('{"alpha":true}', known)).toEqual([]);
    expect(readFavorites('"alpha"', known)).toEqual([]);
  });
});

describe("toggleFavorite", () => {
  it("adds a slug that is not a favorite and removes one that is", () => {
    expect(toggleFavorite(["alpha"], "beta")).toEqual(["alpha", "beta"]);
    expect(toggleFavorite(["alpha", "beta"], "alpha")).toEqual(["beta"]);
  });
});
