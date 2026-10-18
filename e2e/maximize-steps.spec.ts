import { expect, test, type Page } from "./fixtures.ts";

const VIEWPORT = { x: 0, y: 0, width: 1440, height: 900 };
const maximized = (page: Page) => page.locator("body").getAttribute("data-maximized");
const box = (page: Page, selector: string) => page.locator(selector).boundingBox();

test("a step's maximize= maximizes the Result pane or the code, and none restores; step keys keep working", async ({ page }) => {
  await page.goto("/#present-result");
  await expect.poll(() => maximized(page)).toBe("preview");
  expect(await box(page, "section.result")).toEqual(VIEWPORT);
  await expect(page.locator("#result-maximize")).toHaveAttribute("text", "Restore layout");

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#present-code$/);
  await expect.poll(() => maximized(page)).toBe("code");
  expect(await box(page, ".code-panel")).toEqual(VIEWPORT);

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#restore-layout$/);
  await expect.poll(() => maximized(page)).toBeNull();
});

test('maximize="panel" maximizes the Preview for web code', async ({ page }) => {
  await page.goto("/?variant=web#present-result");
  await expect.poll(() => maximized(page)).toBe("preview");
  await expect(page.locator("section.result")).toBeHidden();
  expect(await box(page, "section.preview")).toEqual(VIEWPORT);
});

test("steps without maximize= keep the current state", async ({ page }) => {
  await page.goto("/#create");
  await page.locator("#code-maximize").click();
  await page.keyboard.press("ArrowUp");
  await expect(page).not.toHaveURL(/#create$/);
  expect(await maximized(page)).toBe("code");
});


test("presentation presets resize and restore the Result pane without changing its contents", async ({ page }) => {
  await page.goto("/#request");
  await page.keyboard.press("Alt+KeyP");
  const frame = page.locator(".result-frame");
  const before = await page.locator(".result-frame").textContent();
  await page.keyboard.press("4");
  await expect.poll(() => page.locator(".right").evaluate((el) => el.style.getPropertyValue("--preview-split"))).toBe("75%");
  await page.keyboard.press("1");
  await expect(frame).toBeHidden();
  await page.keyboard.press("1");
  await expect(frame).toBeVisible();
  await page.keyboard.press("5");
  await expect.poll(() => maximized(page)).toBe("preview");
  await page.keyboard.press("Escape");
  await expect.poll(() => maximized(page)).toBeNull();
  expect(await page.locator(".result-frame").textContent()).toBe(before);
  await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
});
