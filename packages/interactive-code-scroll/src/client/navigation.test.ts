import { describe, expect, it } from "vitest";
import { carouselTarget, clampIndex, indexFromHash, isEditableTag, isMultilineTag, keyToDelta, movesStep, revealScroll } from "./navigation.ts";

describe("navigation", () => {
  it.each([
    ["ArrowDown", 1],
    ["PageDown", 1],
    ["ArrowRight", 1],
    ["ArrowUp", -1],
    ["PageUp", -1],
    ["ArrowLeft", -1],
    ["Enter", 0],
    [" ", 0],
  ] as const)("keyToDelta(%j) = %d", (key, delta) => {
    expect(keyToDelta(key)).toBe(delta);
  });

  it("treats fields and contenteditable as editable, but not carousels", () => {
    expect(isEditableTag("input")).toBe(true);
    expect(isEditableTag("CALCITE-INPUT")).toBe(true);
    expect(isEditableTag("calcite-carousel")).toBe(false);
    expect(isEditableTag("DIV", true)).toBe(true);
    expect(isEditableTag("BODY")).toBe(false);
  });

  it("treats textareas and contenteditable as multi-line", () => {
    expect(isMultilineTag("textarea")).toBe(true);
    expect(isMultilineTag("CALCITE-TEXT-AREA")).toBe(true);
    expect(isMultilineTag("CALCITE-INPUT")).toBe(false);
    expect(isMultilineTag("DIV", true)).toBe(true);
  });

  describe("movesStep", () => {
    const page = { editable: false, multiline: false, ownsArrows: false };
    const field = { editable: true, multiline: false, ownsArrows: false };
    const textArea = { editable: true, multiline: true, ownsArrows: false };
    const widget = { editable: false, multiline: false, ownsArrows: true };

    it("moves steps with any step key from the page", () => {
      for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "PageDown", "PageUp"]) expect(movesStep(key, page)).toBe(true);
      expect(movesStep("Enter", page)).toBe(false);
    });

    it("lets clicker keys through fields and widgets that own arrows, but not multi-line text", () => {
      for (const key of ["PageDown", "PageUp"]) {
        expect(movesStep(key, field)).toBe(true);
        expect(movesStep(key, widget)).toBe(true);
        expect(movesStep(key, textArea)).toBe(false);
      }
    });

    it("leaves arrows to fields and widgets that use them", () => {
      for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]) {
        expect(movesStep(key, field)).toBe(false);
        expect(movesStep(key, widget)).toBe(false);
      }
    });
  });

  it("clamps indexes", () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });

  it("resolves deep links", () => {
    const ids = ["intro", "config", "sign-in"];
    expect(indexFromHash(ids, "#config")).toBe(1);
    expect(indexFromHash(ids, "#nope")).toBe(0);
    expect(indexFromHash(ids, "")).toBe(0);
  });

  it("moves through carousel images before leaving the step", () => {
    expect(carouselTarget(0, 3, 1)).toBe(1);
    expect(carouselTarget(2, 3, 1)).toBeUndefined();
    expect(carouselTarget(1, 3, -1)).toBe(0);
    expect(carouselTarget(0, 3, -1)).toBeUndefined();
  });
});

describe("revealScroll", () => {
  // Viewport 400 px at scrollTop 1000; margin 16.
  it("does not move when the range is fully visible", () => {
    expect(revealScroll(1100, 1300, 1000, 400)).toBeUndefined();
  });

  it("centers a range that fits but is (partly) out of view", () => {
    expect(revealScroll(1350, 1450, 1000, 400)).toBe(1200);
    expect(revealScroll(900, 1000, 1000, 400)).toBe(750);
  });

  it("aligns a range taller than the viewport to its top", () => {
    expect(revealScroll(1500, 2500, 1000, 400)).toBe(1484);
  });

  it("always centers with `center`", () => {
    expect(revealScroll(1100, 1300, 1000, 400, { center: true })).toBe(1000);
    expect(revealScroll(1100, 1300, 1000, 300, { center: true })).toBe(1050);
  });
});
