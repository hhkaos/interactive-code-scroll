import { test as base, expect } from "@playwright/test";
import type { SpikeOptions } from "../playwright.config.ts";

const test = base.extend<SpikeOptions>({
  focusedLine: [".line-focus", { option: true }],
  visibleCode: [".code", { option: true }],
});

test("deep link focuses the step region", async ({ page, focusedLine, visibleCode }) => {
  await page.goto("/#oauth");
  await expect(page.locator(focusedLine).first()).toContainText("$arcgis.import");
  await expect(page.locator(visibleCode)).toContainText("new OAuthInfo");
  await expect(page).toHaveURL(/#oauth$/);
});

test("keyboard moves to the next step and switches file", async ({ page, focusedLine }) => {
  await page.goto("/#sign-in");
  await expect(page.locator(focusedLine).first()).toContainText("signInButton");
  await page.locator("#sign-in h2").click();
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/#styles$/);
  await expect(page.locator(focusedLine).first()).toContainText("html");
});

test("form value replaces the @var literal, masked while secret", async ({ page, visibleCode }) => {
  await page.goto("/#config");
  const input = page.locator('calcite-input[data-var="clientId"] input');
  await input.fill("my-client-id");
  await expect(page.locator(visibleCode)).toContainText('const clientId = "••••••••••••";');
  await page.locator('calcite-input[data-var="clientId"] calcite-button').click();
  await expect(page.locator(visibleCode)).toContainText('const clientId = "my-client-id";');
  expect(await page.evaluate(() => localStorage.getItem("ics:var:clientId"))).toBe("my-client-id");
});

test("image step shows the carousel instead of code", async ({ page }) => {
  await page.goto("/#register-app");
  await expect(page.locator("calcite-carousel")).toBeVisible();
});

test("preview runs the code with form values at a real URL", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').fill("preview-id");
  const frame = page.frameLocator(".preview iframe");
  // Debounced reload: poll until the iframe runs the updated code.
  await expect
    .poll(() => frame.locator("script:not([src])").last().textContent(), { timeout: 15_000 })
    .toContain('"preview-id"');
  await expect(frame.locator("arcgis-map")).toBeAttached();
  expect(await page.locator(".preview iframe").getAttribute("src")).toMatch(/^http:\/\/localhost:\d+\/preview/);
});
