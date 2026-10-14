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
  await page.locator('calcite-input[data-var="clientId"] [data-reveal]').click();
  await expect(code(page)).toContainText('const clientId = "my-client-id";');
});

test("one field updates every file that marks the same var", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] [data-reveal]').click();
  await clientIdInput(page).fill("shared-id");
  await expect(code(page).locator('[data-var="clientId"]')).toHaveText("shared-id");
  await expect(page.locator('.code[data-file="report.py"] [data-var="clientId"]')).toHaveText("shared-id");
});

test("number and boolean fields write unquoted literals in the file's spelling", async ({ page }) => {
  await page.goto("/#config");
  const report = page.locator('.code[data-file="report.py"]');
  const maxResults = page.locator('calcite-input[data-var="maxResults"]');
  await expect(maxResults).toHaveAttribute("type", "number");
  await maxResults.locator("input").fill("25");
  await expect(report.locator('[data-var="maxResults"]')).toHaveText("25");
  await maxResults.locator("input").fill("");
  await expect(report.locator('[data-var="maxResults"]')).toHaveText("10");

  const verbose = page.locator('calcite-switch[data-var="verbose"]');
  await expect(verbose).not.toHaveAttribute("checked");
  await verbose.click();
  await expect(report.locator('[data-var="verbose"]')).toHaveText("True");
  await page.reload();
  await expect(page.locator('.code[data-file="report.py"] [data-var="verbose"]')).toHaveText("True");
  await expect(page.locator('calcite-switch[data-var="verbose"]')).toHaveAttribute("checked");
});

test("a JSON value targeted by pointer follows the shared field", async ({ page }) => {
  await page.goto("/#config");
  const settings = page.locator('.code[data-file="settings.json"]');
  await page.locator('calcite-input[data-var="maxResults"] input').fill("25");
  await expect(settings.locator('[data-var="maxResults"]')).toHaveText("25");
  await page.locator('calcite-switch[data-var="verbose"]').click();
  await expect(settings.locator('[data-var="verbose"]')).toHaveText("true");
  await expect(page.locator('.code[data-file="report.py"] [data-var="verbose"]')).toHaveText("True");
});

test("an empty literal fills in and clears again", async ({ page }) => {
  await page.goto("/#config");
  const token = page.locator('.code[data-file="report.py"] [data-var="referrer"]');
  await expect(token).toHaveText("");
  const input = page.locator('calcite-input[data-var="referrer"] input');
  await input.fill("https://a.example");
  await expect(token).toHaveText("https://a.example");
  await expect(page.locator('.code[data-file="report.py"]')).toContainText('REFERRER = "https://a.example"');
  await input.fill("");
  await expect(token).toHaveText("");
});

test("clearing a field restores the default from the code", async ({ page }) => {
  await page.goto("/#config");
  await clientIdInput(page).fill("abc");
  await clientIdInput(page).fill("");
  await expect(code(page).locator('[data-var="clientId"]')).toHaveText("YOUR_CLIENT_ID");
});

test("clearing a field with custom placeholder restores the code default", async ({ page }) => {
  await page.goto("/#config");
  const input = page.locator('calcite-input[data-var="portalUrl"] input');
  await input.fill("https://example.com/portal");
  await input.fill("");
  await expect(code(page).locator('[data-var="portalUrl"]')).toHaveText("https://fixture.example.test");
});

test("persisted fields survive a reload", async ({ page }) => {
  await page.goto("/#config");
  await clientIdInput(page).fill("kept-id");
  await page.reload();
  await expect(clientIdInput(page)).toHaveValue("kept-id");
  await expect(code(page).locator('[data-var="clientId"]')).toHaveText("•••••••");
});

test("clicker keys move steps from a field; arrows stay in it", async ({ page }) => {
  await page.goto("/#config");
  await clientIdInput(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#config")).toHaveAttribute("data-active", "");
  await page.keyboard.press("PageDown");
  await expect(page.locator("#oauth")).toHaveAttribute("data-active", "");
});
