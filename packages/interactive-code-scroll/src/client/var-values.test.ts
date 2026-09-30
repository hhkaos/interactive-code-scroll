import { describe, expect, it } from "vitest";
import { displayValue, readStored, storageKey, valueFromInput, writeStored } from "./var-values.ts";

describe("displayValue", () => {
  it("shows plain values as-is", () => {
    expect(displayValue("abc", "DEFAULT", false, false)).toBe("abc");
  });

  it("masks secrets unless revealed or still the default", () => {
    expect(displayValue("abc", "DEFAULT", true, false)).toBe("•••");
    expect(displayValue("abc", "DEFAULT", true, true)).toBe("abc");
    expect(displayValue("DEFAULT", "DEFAULT", true, false)).toBe("DEFAULT");
  });
});

describe("valueFromInput", () => {
  it("falls back to the default when empty", () => {
    expect(valueFromInput("", "DEFAULT")).toBe("DEFAULT");
    expect(valueFromInput("x", "DEFAULT")).toBe("x");
  });
});

describe("storageKey", () => {
  it("shares persisted values across the site by default", () => {
    expect(storageKey("apiKey")).toBe("ics:var:apiKey");
    expect(storageKey("apiKey", "site", "alpha")).toBe("ics:var:apiKey");
  });

  it("scopes tutorial values by slug", () => {
    expect(storageKey("apiKey", "tutorial", "alpha")).toBe("ics:var:alpha:apiKey");
    expect(storageKey("apiKey", "tutorial", "beta")).toBe("ics:var:beta:apiKey");
  });

  it("uses the site key in a single-tutorial site", () => {
    expect(storageKey("apiKey", "tutorial", "")).toBe("ics:var:apiKey");
  });
});

describe("storage", () => {
  it("round-trips values and removes them", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    writeStored(storage, "k", "abc");
    expect(map.get("k")).toBe("abc");
    expect(readStored(storage, "k")).toBe("abc");
    writeStored(storage, "k", undefined);
    expect(readStored(storage, "k")).toBeUndefined();
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readStored(broken, "a")).toBeUndefined();
    expect(() => writeStored(broken, "a", "x")).not.toThrow();
  });
});
