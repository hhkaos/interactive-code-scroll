import { expect, test } from "./fixtures.ts";

test("presentation mode goes full screen with a compact toolbar; Esc exits", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("#present-toggle").click();
  await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
  await expect(page.locator("#theme-toggle")).toBeHidden();
  await expect(page.locator("#download-zip")).toBeHidden();
  await expect(page.locator(".zip-action")).toBeHidden();
  await expect(page.locator("#step-count")).toBeVisible();
  await expect(page.locator("#step-count")).toHaveText("Step 4 of 10");
  await expect(page.locator(".step-nav")).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  await expect(page.locator("#theme-toggle")).toBeVisible();
  await expect(page.locator("#step-count")).toBeHidden();
  await expect(page.locator(".step-nav")).toBeVisible();
});

test("hiding the explanations gives code the full width; keys still move steps", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("#docs-toggle").click();
  await expect(page.locator("main.docs")).toBeHidden();
  const width = await page.locator("aside.right").evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(1400);

  await page.locator(".code:not([hidden])").click();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#oauth$/);
  await expect(page.locator(".code:not([hidden]) .line[data-focus]").first()).toContainText("fixtureState");

  await page.locator("#docs-toggle").click();
  await expect(page.locator("section.step#oauth h2")).toBeInViewport();
  await expect(page).toHaveURL(/#oauth$/);
});

test("in presentation mode the clicker ends on a full-screen closing slide with a QR code", async ({ page }) => {
  const slide = page.locator("body > .completion[data-slide]");
  await page.goto("/#embed-next-slide");
  await page.locator("#present-toggle").click();
  await page.keyboard.press("PageDown");
  await expect(slide).toBeVisible();
  await expect(page.locator("#completion-heading")).toBeFocused();
  // For the room: a QR code of the tutorial's URL (no presentationUrl or Astro site here: the page's own), no reader actions.
  await expect(slide.locator(".completion-qr svg")).toBeVisible();
  await expect(slide.locator(".completion-share-url")).toHaveAttribute("href", /^http:\/\/localhost:\d+\/$/);
  await expect(slide.locator(".completion-actions")).toBeHidden();
  const box = (await slide.locator(".completion-qr").boundingBox())!;
  expect(box.width).toBeGreaterThan(500);

  // PageUp returns to the last step; the panel goes back to the end of the explanations.
  await page.keyboard.press("PageUp");
  await expect(slide).toHaveCount(0);
  await expect(page.locator("main.docs > .completion")).toHaveCount(1);
  await expect(page.locator("#step-count")).toHaveText("Step 10 of 10");

  // Esc on the slide leaves presentation mode; the reader stays on the (completed) panel.
  await page.keyboard.press("PageDown");
  await expect(slide).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  await expect(page.locator("main.docs > .completion")).toBeInViewport();
  await expect(page.locator("#step-position")).toHaveText("Done");
});

test("the closing slide also opens with the explanations hidden", async ({ page }) => {
  await page.goto("/#embed-next-slide");
  await page.locator("#present-toggle").click();
  await page.locator("#docs-toggle").click();
  await page.keyboard.press("PageDown");
  await expect(page.locator("body > .completion[data-slide]")).toBeVisible();
  await expect(page.locator("#completion-heading")).toBeFocused();
});

test("entering and leaving presentation mode keeps the active step", async ({ page }) => {
  for (const id of ["config", "oauth", "sign-in", "embed-slides"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/#${id}`);
    await expect(page.locator(`section.step#${id}`)).toHaveAttribute("data-active", "");
    await page.locator("#present-toggle").click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    // Headless full screen keeps the window size; a real browser gives the toolbar height back on exit.
    await page.setViewportSize({ width: 1440, height: 780 });
    // Past the observer's settle time: a step switch would have happened by now.
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`section.step#${id}`)).toHaveAttribute("data-active", "");
  }
});

test.describe("step index in presentation mode", () => {
  const index = (page: import("@playwright/test").Page) => page.locator("#step-index");
  const headerButton = (page: import("@playwright/test").Page) => page.locator("#step-count-button");

  test("the header's 'Step X of N' opens a large centered index; step keys move the real step", async ({ page }) => {
    await page.goto("/#oauth");
    await expect(headerButton(page)).toBeHidden();
    await page.locator("#present-toggle").click();
    await expect(headerButton(page)).toBeVisible();
    await expect(headerButton(page)).toHaveAttribute("aria-keyshortcuts", "O");
    await headerButton(page).click();
    await expect(index(page)).toBeVisible();
    await expect(headerButton(page)).toHaveAttribute("aria-expanded", "true");
    await expect(index(page).locator(".step-index-eyebrow")).toBeVisible();
    await expect(index(page).locator(".step-index-hint")).toHaveText("Clicker or arrows move the step · Esc or O closes");
    await expect(index(page).locator('a[aria-current="step"]')).toBeFocused();
    // Centered in the window, much wider than the reader's popover (22rem).
    await expect.poll(async () => {
      const box = (await index(page).boundingBox())!;
      return Math.abs(box.x + box.width / 2 - 720) < 2 && Math.abs(box.y + box.height / 2 - 450) < 2 && box.width > 600;
    }).toBe(true);

    await page.keyboard.press("PageDown");
    await expect(page.locator("section.step#callback")).toHaveAttribute("data-active", "");
    await expect(page.locator("#step-count")).toHaveText("Step 6 of 10");
    await expect(index(page).locator('a[aria-current="step"]')).toBeFocused();

    // The same button closes it.
    await headerButton(page).click();
    await expect(index(page)).toBeHidden();
    await expect(headerButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("O, b and . open and close the index; E shows and hides the explanations", async ({ page }) => {
    await page.goto("/#oauth");
    await page.locator("#present-toggle").click();
    for (const key of ["o", "O", "b", "."]) {
      await page.keyboard.press(key);
      await expect(index(page)).toBeVisible();
      await page.keyboard.press(key === "O" ? "o" : key);
      await expect(index(page)).toBeHidden();
    }
    await page.mouse.move(1000, 500);
    await page.keyboard.press("e");
    await expect(page.locator("body")).toHaveAttribute("data-docs-hidden", "");
    await expect(page.locator("main.docs")).toBeHidden();
    await expect(page.locator("#docs-toggle")).toHaveAttribute("text", "Show explanations");
    // A key, not a pointer: the toggle's tooltip stays closed.
    await expect(page.locator("calcite-tooltip[open]")).toHaveCount(0);
    await page.keyboard.press("E");
    await expect(page.locator("body")).not.toHaveAttribute("data-docs-hidden", "");
    await expect(page.locator("main.docs")).toBeVisible();
  });

  test("the shortcuts are off outside presentation mode and in fields", async ({ page }) => {
    await page.goto("/#config");
    for (const key of ["o", "b", ".", "e"]) await page.keyboard.press(key);
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).not.toHaveAttribute("data-docs-hidden", "");

    await page.locator("#present-toggle").click();
    const field = page.locator('calcite-input[data-var="portalUrl"] input');
    await field.fill("");
    await field.pressSequentially("obe.");
    await expect(field).toHaveValue("obe.");
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).not.toHaveAttribute("data-docs-hidden", "");
  });

  test("Esc order: the index, then a maximized pane, then presentation mode", async ({ page }) => {
    await page.addInitScript(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new Error("denied"));
    });
    await page.goto("/#config");
    await page.locator("#present-toggle").click();
    await page.mouse.move(700, 450);
    await page.locator("#code-maximize").click();
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "code");
    await page.keyboard.press("o");
    await expect(index(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "code");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  });

  test("in browser full screen, Esc is locked for the page (Chromium): the index closes first, then presentation mode", async ({ page }) => {
    // Headless key presses never reach the browser's own full-screen Esc: check the lock is taken and released.
    await page.addInitScript(() => {
      const calls: string[] = [];
      (window as unknown as { lockCalls: string[] }).lockCalls = calls;
      Object.defineProperty(navigator, "keyboard", {
        value: { lock: async (keys: string[]) => void calls.push(`lock ${keys.join()}`), unlock: () => void calls.push("unlock") },
      });
    });
    const lockCalls = () => page.evaluate(() => (window as unknown as { lockCalls: string[] }).lockCalls);
    await page.goto("/#oauth");
    await page.locator("#present-toggle").click();
    await expect.poll(lockCalls).toEqual(["lock Escape"]);
    await page.keyboard.press("o");
    await expect(index(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    expect(await page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
    await expect.poll(lockCalls).toEqual(["lock Escape", "unlock"]);
  });

  test("leaving presentation mode closes the index", async ({ page }) => {
    await page.goto("/#oauth");
    await page.locator("#present-toggle").click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await page.keyboard.press("o");
    await expect(index(page)).toBeVisible();
    // The browser's own Esc leaves full screen without the page seeing the key.
    await page.evaluate(() => document.exitFullscreen());
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    await expect(index(page)).toBeHidden();
  });
});

test.describe("Alt+P and the shortcut hint", () => {
  const hint = (page: import("@playwright/test").Page) => page.locator("#shortcut-hint");

  test("Alt+P enters and leaves presentation mode, but not from a field", async ({ page }) => {
    await page.goto("/#config");
    await expect(page.locator("#present-toggle")).toHaveAttribute("aria-keyshortcuts", "Alt+P");
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await expect(page.locator("calcite-tooltip[open]")).toHaveCount(0);
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();

    await page.locator('calcite-input[data-var="portalUrl"] input').focus();
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  });

  test("a lone Alt shows the keys of the current mode; another key or Alt again hides them", async ({ page }) => {
    await page.goto("/#config");
    await expect(hint(page)).toBeHidden();
    await page.keyboard.press("Alt");
    await expect(hint(page)).toBeVisible();
    await expect(hint(page).locator(".shortcut-hint-item")).toHaveText([/P\s*Present$/, /Previous \/ next step/]);
    await page.keyboard.press("Alt");
    await expect(hint(page)).toBeHidden();

    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    // Alt+P is a chord, not a lone Alt: no hint.
    await expect(hint(page)).toBeHidden();
    await page.keyboard.press("Alt");
    await expect(hint(page).locator(".shortcut-hint-item")).toHaveText([/Exit presentation/, /Previous \/ next step/, /O\s*Step list/, /E\s*Explanations/, /Esc\s*Close \/ exit/]);
    // Centered at the bottom.
    const box = (await hint(page).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);
    expect(box.y + box.height).toBeGreaterThan(850);
    await page.keyboard.press("PageDown");
    await expect(hint(page)).toBeHidden();
  });

  test("Alt in a field shows no hint", async ({ page }) => {
    await page.goto("/#config");
    await page.locator('calcite-input[data-var="portalUrl"] input').focus();
    await page.keyboard.press("Alt");
    await expect(hint(page)).toBeHidden();
  });
});
