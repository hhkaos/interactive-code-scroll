import { describe, expect, it } from "vitest";
import { carouselTarget, clampIndex, indexFromHash, isEditableTag, isMultilineTag, isPresentChord, keyToDelta, movesStep, presentationShortcut, shortcutHints, progressStates, revealScroll, stepButtons } from "./navigation.ts";

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

describe("stepButtons", () => {
  const base = { count: 9, hasIntro: false, image: 0, images: 0 };

  it("disables Back at the first step without an intro, and Next at the last step", () => {
    expect(stepButtons({ ...base, current: 0 })).toEqual({ back: false, next: true, finish: false, position: "1 / 9" });
    expect(stepButtons({ ...base, current: 8 })).toEqual({ back: true, next: false, finish: false, position: "9 / 9" });
  });

  it("lets Back return from the first step to the intro, and disables it there", () => {
    expect(stepButtons({ ...base, hasIntro: true, current: 0 }).back).toBe(true);
    expect(stepButtons({ ...base, hasIntro: true, current: -1 })).toEqual({ back: false, next: true, finish: false, position: "9 steps" });
  });

  it("pages through a carousel before leaving the step", () => {
    expect(stepButtons({ ...base, current: 0, image: 1, images: 3 }).back).toBe(true);
    expect(stepButtons({ ...base, current: 8, image: 1, images: 3 }).next).toBe(true);
    expect(stepButtons({ ...base, current: 8, image: 2, images: 3 }).next).toBe(false);
  });

  it("turns Next into Finish at the last step (and its last image) when the page has a closing panel", () => {
    const end = { ...base, completion: true };
    expect(stepButtons({ ...end, current: 7 })).toMatchObject({ next: true, finish: false });
    expect(stepButtons({ ...end, current: 8, image: 1, images: 3 })).toMatchObject({ next: true, finish: false });
    expect(stepButtons({ ...end, current: 8, image: 2, images: 3 })).toEqual({ back: true, next: true, finish: true, position: "9 / 9" });
  });

  it("shows Done on the closing panel, with Back enabled and Finish disabled", () => {
    expect(stepButtons({ ...base, completion: true, completed: true, current: 8 })).toEqual({ back: true, next: false, finish: true, position: "Done" });
  });

  it("says step in the singular", () => {
    expect(stepButtons({ ...base, count: 1, hasIntro: true, current: -1 }).position).toBe("1 step");
  });
});

describe("progressStates", () => {
  it("marks the steps before the current one as seen and the rest as pending", () => {
    expect(progressStates(2, 5)).toEqual(["seen", "seen", "current", "pending", "pending"]);
  });

  it("has nothing seen at the intro", () => {
    expect(progressStates(-1, 3)).toEqual(["pending", "pending", "pending"]);
  });

  it("marks every step seen on the closing panel", () => {
    expect(progressStates(2, 3, true)).toEqual(["seen", "seen", "seen"]);
  });
});

describe("presentationShortcut", () => {
  const presenting = { presenting: true, editable: false, modifier: false };

  it("maps O, b and . to the step index and E to the explanations, in either case", () => {
    expect(["o", "O", "b", "B", "."].map((key) => presentationShortcut(key, presenting))).toEqual(Array(5).fill("index"));
    expect(presentationShortcut("e", presenting)).toBe("explanations");
    expect(presentationShortcut("E", presenting)).toBe("explanations");
  });

  it.each([
    ["1", "collapse"], ["2", "size35"], ["3", "size50"], ["4", "size75"],
    ["5", "maximizePanel"], ["0", "maximizeCode"], ["h", "highlight"], ["H", "highlight"],
  ])("maps %s to %s only during presentation outside fields", (key, action) => {
    expect(presentationShortcut(key, presenting)).toBe(action);
    expect(presentationShortcut(key, { ...presenting, presenting: false })).toBeUndefined();
    expect(presentationShortcut(key, { ...presenting, editable: true })).toBeUndefined();
    expect(presentationShortcut(key, { ...presenting, modifier: true })).toBeUndefined();
  });

  it("ignores other keys", () => {
    for (const key of ["x", ">", "Escape", "PageDown", " "]) expect(presentationShortcut(key, presenting)).toBeUndefined();
  });

  it("works only while presenting, outside fields and without Ctrl, Alt or Meta", () => {
    expect(presentationShortcut("o", { ...presenting, presenting: false })).toBeUndefined();
    expect(presentationShortcut("o", { ...presenting, editable: true })).toBeUndefined();
    expect(presentationShortcut("e", { ...presenting, modifier: true })).toBeUndefined();
  });
});

describe("isPresentChord", () => {
  const chord = { code: "KeyP", altKey: true, ctrlKey: false, metaKey: false, shiftKey: false };

  it("is Alt+P by the physical key (Option+P types π on macOS)", () => {
    expect(isPresentChord(chord, false)).toBe(true);
    expect(isPresentChord({ ...chord, altKey: false }, false)).toBe(false);
    expect(isPresentChord({ ...chord, code: "KeyO" }, false)).toBe(false);
  });

  it("skips fields, AltGr (Ctrl+Alt) and other modifiers", () => {
    expect(isPresentChord(chord, true)).toBe(false);
    expect(isPresentChord({ ...chord, ctrlKey: true }, false)).toBe(false);
    expect(isPresentChord({ ...chord, metaKey: true }, false)).toBe(false);
    expect(isPresentChord({ ...chord, shiftKey: true }, false)).toBe(false);
  });
});

describe("shortcutHints", () => {
  it("lists reading and clicker chords in both modes, with no single keys outside presentation", () => {
    const hints = shortcutHints(false, false);
    expect(hints.map((h) => h.keys)).toEqual([
      ["Alt", "P"], ["←", "→", "↑", "↓"], ["PageUp", "PageDown"], ["Esc"], ["Alt", "Shift", "L"],
    ]);
    expect(hints.map((h) => h.group)).toEqual(["Navigation", "Navigation", "Navigation", "Navigation", "Audio"]);
  });

  it("lists all presentation commands, grouped by purpose, and localizes Option", () => {
    const hints = shortcutHints(true, true);
    expect(hints[0]).toEqual({ keys: ["⌥", "P"], label: "Exit presentation", group: "Navigation" });
    expect(hints.flatMap((h) => h.keys)).toEqual([
      "⌥", "P", "←", "→", "↑", "↓", "PageUp", "PageDown", "O", "B", ".", "Esc", "E", "1", "2", "3", "4", "5", "0", "H", "⌥", "Shift", "L",
    ]);
  });
});
