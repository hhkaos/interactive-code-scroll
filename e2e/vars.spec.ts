import { expect, test } from "./fixtures.ts";

const code = (page: import("@playwright/test").Page) => page.locator('.code[data-file="main.js"]');
const clientIdInput = (page: import("@playwright/test").Page) => page.locator('calcite-input[data-var="clientId"] input');

test("typing a value replaces the literal in place, keeping its highlighting", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="portalUrl"] input').fill("https://example.com/portal");
  const token = code(page).locator('[data-var="portalUrl"]');
  await expect(token).toHaveText("https://example.com/portal");
  await expect(token).toHaveAttribute("style", /--shiki-light/);
});

test("secret values are masked until revealed", async ({ page }) => {
  await page.goto("/#config");
  await clientIdInput(page).fill("my-client-id");
  await expect(code(page)).toContainText('const clientId = "••••••••••••";');
  await page.locator('calcite-input[data-var="clientId"] calcite-button[data-reveal]').click();
  await expect(code(page)).toContainText('const clientId = "my-client-id";');
});

test("clearing a field restores the default from the code", async ({ page }) => {
  await page.goto("/#config");
  await clientIdInput(page).fill("abc");
  await clientIdInput(page).fill("");
  await expect(code(page).locator('[data-var="clientId"]')).toHaveText("YOUR_CLIENT_ID");
});

test("persisted fields survive a reload", async ({ page }) => {
  await page.goto("/#config");
  await clientIdInput(page).fill("kept-id");
  await page.reload();
  await expect(clientIdInput(page)).toHaveValue("kept-id");
  await expect(code(page).locator('[data-var="clientId"]')).toHaveText("•••••••");
});
