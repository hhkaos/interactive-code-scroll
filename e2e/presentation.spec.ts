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
