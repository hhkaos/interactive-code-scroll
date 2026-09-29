import { expect, test, type Page } from "./fixtures.ts";

const visibleSteps = (page: Page) => page.locator("section.step:not([hidden])");
const pick = (page: Page, id: string) => page.locator(`#variant-switcher calcite-segmented-control-item[value="${id}"]`).click();

test("steps of other variants are hidden and left out of the numbering", async ({ page }) => {
  await page.goto("/#request");
  await expect(visibleSteps(page)).toHaveCount(3);
  await expect(page.locator("section.step#flags")).toBeHidden();
  await expect(page.locator("#step-count")).toHaveText("Step 3 of 3");
  await expect(page.locator("#variant-notice")).toHaveJSProperty("open", false);
});

test("switching shows the new variant's steps and keeps a shared active step", async ({ page }) => {
  await page.goto("/#request");
  await pick(page, "curl");
  await expect(page.locator("section.step#install")).toBeHidden();
  await expect(page.locator("section.step#flags")).toBeVisible();
  await expect(page.locator("section.step#request")).toHaveAttribute("data-active", "");
  await expect(page.locator("#step-count")).toHaveText("Step 3 of 3");
});

test("switching away from a variant-only step moves to the nearest earlier step", async ({ page }) => {
  await page.goto("/#install");
  await expect(page.locator("section.step#install")).toHaveAttribute("data-active", "");
  await pick(page, "curl");
  await expect(page.locator("section.step#config")).toHaveAttribute("data-active", "");
  await expect(page).toHaveURL(/\?variant=curl#config$/);
});

test("a link to a hidden step switches to its variant", async ({ page }) => {
  await page.goto("/#flags");
  await expect(page).toHaveURL(/\?variant=curl#flags$/);
  await expect(page.locator("section.step#flags")).toHaveAttribute("data-active", "");
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "curl/main.sh");
});
