import { expect, test, type Page } from "@playwright/test";

const focused = (page: Page) => page.locator(".code:not([hidden]) .line[data-focus]");

test("a deep link activates its step, file and region", async ({ page }) => {
  await page.goto("/#oauth");
  await expect(page.locator("section.step#oauth")).toHaveAttribute("data-active", "");
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "main.js");
  await expect(focused(page).first()).toContainText("$arcgis.import");
  await expect(page.locator(".progress")).toHaveText("Step 5 of 7");
  await expect(page).toHaveURL(/#oauth$/);
});

test("keyboard and clicker keys move between steps", async ({ page }) => {
  await page.goto("/#sign-in");
  await expect(focused(page).first()).toContainText("signInButton");
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#styles$/);
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "style.css");
  await page.keyboard.press("ArrowUp");
  await expect(page).toHaveURL(/#sign-in$/);
});

test("scrolling activates the step crossing the center line", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.getElementById("config")!.scrollIntoView({ block: "center" }));
  await expect(page).toHaveURL(/#config$/);
  await expect(focused(page)).toHaveCount(2);
});

test("an image step shows the carousel; arrows still move steps", async ({ page }) => {
  await page.goto("/#register-app");
  await expect(page.locator(".media-panel calcite-carousel")).toBeVisible();
  await expect(page.locator(".code-panel")).toBeHidden();
  await page.locator(".media-panel calcite-carousel").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#config$/);
  await expect(page.locator(".code-panel")).toBeVisible();
});

test("typing in a field does not move steps", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').press("ArrowDown");
  await expect(page).toHaveURL(/#config$/);
});

test("file tabs switch the visible file", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-tab-title[data-file="index.html"]').click();
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "index.html");
});
