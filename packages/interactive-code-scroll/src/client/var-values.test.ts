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

describe("storage", () => {
  it("round-trips values and removes them", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    writeStored(storage, "clientId", "abc");
    expect(map.get(storageKey("clientId"))).toBe("abc");
    expect(readStored(storage, "clientId")).toBe("abc");
    writeStored(storage, "clientId", undefined);
    expect(readStored(storage, "clientId")).toBeUndefined();
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
