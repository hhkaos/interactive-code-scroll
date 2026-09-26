import { expect, test } from "./fixtures.ts";

test("presentation mode goes full screen with a compact toolbar; Esc exits", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("#present-toggle").click();
  await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
  await expect(page.locator("#theme-toggle")).toBeHidden();
  await expect(page.locator("#download-zip")).toBeHidden();
  await expect(page.locator("#step-count")).toBeVisible();
  await expect(page.locator("#step-count")).toHaveText("Step 5 of 9");

  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  await expect(page.locator("#theme-toggle")).toBeVisible();
  await expect(page.locator("#step-count")).toBeHidden();
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
  await expect(page.locator(".code:not([hidden]) .line[data-focus]").first()).toContainText("$arcgis.import");

  await page.locator("#docs-toggle").click();
  await expect(page.locator("section.step#oauth h2")).toBeInViewport();
  await expect(page).toHaveURL(/#oauth$/);
});
