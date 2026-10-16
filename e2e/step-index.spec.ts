import { expect, test, type Page } from "./fixtures.ts";

const trigger = (page: Page) => page.locator("#step-position");
const index = (page: Page) => page.locator("#step-index");
const links = (page: Page) => index(page).locator(".step-index-list a");

test("the position opens the step index: where the reader is, seen steps and the current one", async ({ page }) => {
  await page.goto("/#oauth");
  await expect(trigger(page)).toHaveAttribute("aria-label", "5 / 10: all steps");
  await trigger(page).click();
  await expect(index(page)).toBeVisible();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(index(page).locator(".step-index-heading")).toHaveText("Step 5 of 10");
  await expect(links(page)).toHaveCount(10);
  await expect(links(page).first()).toContainText("Load the runtime");
  await expect(index(page).locator('a[data-state="seen"]')).toHaveCount(4);
  await expect(index(page).locator('[data-state="seen"] calcite-icon[icon="check"]')).toHaveCount(4);
  const current = index(page).locator('a[aria-current="step"]');
  await expect(current.locator(".step-index-title")).toHaveText("Register behavior");
  await expect(current).toBeFocused();
  // Above its trigger.
  const list = (await index(page).boundingBox())!;
  const button = (await trigger(page).boundingBox())!;
  expect(list.y + list.height).toBeLessThanOrEqual(button.y);
});

test("a step in the index jumps to it and closes the list", async ({ page }) => {
  await page.goto("/#oauth");
  await trigger(page).click();
  await links(page).nth(1).click();
  await expect(index(page)).toBeHidden();
  await expect(page.locator("section.step#ui")).toHaveAttribute("data-active", "");
  await expect(page).toHaveURL(/#ui$/);
  await expect(page.locator("#step-position-text")).toHaveText("2 / 10");
});

test("step keys move the real step while the index is open; Esc closes it", async ({ page }) => {
  await page.goto("/#oauth");
  await trigger(page).click();
  await page.keyboard.press("PageDown");
  await expect(page.locator("section.step#callback")).toHaveAttribute("data-active", "");
  await expect(index(page)).toBeVisible();
  await expect(index(page).locator(".step-index-heading")).toHaveText("Step 6 of 10");
  await expect(index(page).locator('a[aria-current="step"]')).toBeFocused();
  await expect(index(page).locator('a[aria-current="step"] .step-index-title')).toHaveText("Publish another file");
  await page.keyboard.press("Escape");
  await expect(index(page)).toBeHidden();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
});

test("at the intro the index has nothing seen; a click outside closes it", async ({ page }) => {
  await page.goto("/");
  await trigger(page).click();
  await expect(index(page).locator(".step-index-heading")).toHaveText("Introduction");
  await expect(index(page).locator('a[data-state="pending"]')).toHaveCount(10);
  await page.locator(".code-panel").click({ position: { x: 20, y: 200 } });
  await expect(index(page)).toBeHidden();
});

test("Esc closes the index before it restores a maximized pane", async ({ page }) => {
  await page.goto("/#oauth");
  await page.locator("#code-maximize").click();
  await expect(page.locator("body")).toHaveAttribute("data-maximized", "code");
  // The Back / Next bar is under the maximized pane: open the list the way a script would.
  await index(page).evaluate((el) => el.showPopover());
  await page.keyboard.press("Escape");
  await expect(index(page)).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute("data-maximized", "code");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the index is a bottom sheet over a scrim", async ({ page }) => {
    await page.goto("/#oauth");
    await trigger(page).click();
    await expect(index(page)).toBeVisible();
    // Wait for the sheet's slide-in to end.
    await expect.poll(async () => Math.round((await index(page).boundingBox())!.y + (await index(page).boundingBox())!.height)).toBe(844);
    const sheet = (await index(page).boundingBox())!;
    expect(sheet.x).toBe(0);
    expect(sheet.width).toBe(390);
  });
});
