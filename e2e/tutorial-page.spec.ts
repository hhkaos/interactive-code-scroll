import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the author's tutorial.mdx with its frontmatter title", async ({ page }) => {
  await expect(page).toHaveTitle("Framework Fixture Tutorial");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Framework Fixture Tutorial");
});

test("shows the frontmatter logo in the header and as favicon", async ({ page }) => {
  // Vite inlines small assets as data: URIs; larger ones get a hashed URL.
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(favicon).toMatch(/^data:image\/svg\+xml|fixture-logo.*\.svg$/);
  await expect(page.locator("calcite-navigation-logo")).toHaveJSProperty("thumbnail", favicon);
  const shown = page.locator("calcite-navigation-logo img");
  await expect(shown).toBeVisible();
  expect(await shown.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test("numbers each step's heading", async ({ page }) => {
  const marker = await page
    .locator("section.step#config h2")
    .evaluate((h) => getComputedStyle(h, "::before").content);
  expect(marker).toBe("counter(step)");
});

test("renders <Intro> as non-step tutorial intro", async ({ page }) => {
  await expect(page.locator(".intro h2")).toHaveText("Before you start");
  await expect(page.locator(".intro")).toContainText("stable contract for E2E tests");
  await expect(page.locator(".intro").locator("section.step")).toHaveCount(0);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(page.locator("#progress-bar")).toHaveJSProperty("value", 0);
});

test("renders each <Step> as a section with its references", async ({ page }) => {
  const config = page.locator("section.step#config");
  await expect(config).toHaveAttribute("data-file", "main.js");
  await expect(config).toHaveAttribute("data-region", "config");
  await expect(page.locator("section.step")).toHaveCount(8);
  await expect(page.locator("section.step#register-app template.step-media")).toHaveCount(1);
});

test("renders <VarField> as a Calcite input with the code literal as placeholder", async ({ page }) => {
  const input = page.locator('calcite-input[data-var="clientId"]');
  await expect(input).toHaveAttribute("placeholder", "YOUR_CLIENT_ID");
  await expect(input).toHaveAttribute("data-default-value", "YOUR_CLIENT_ID");
  await expect(input).toHaveAttribute("data-secret", "");
  await expect(input).toHaveAttribute("data-persist", "");
});

test("renders custom <VarField> placeholder without changing the code default", async ({ page }) => {
  const input = page.locator('calcite-input[data-var="portalUrl"]');
  await expect(input).toHaveAttribute("placeholder", "https://portal.example.com");
  await expect(input).toHaveAttribute("data-default-value", "https://fixture.example.test");
});

test("renders build-time highlighted code with markers stripped", async ({ page }) => {
  const visibleCode = page.locator(".code:not([hidden])");
  const main = page.locator('.code[data-file="main.js"]');
  await expect(main.locator('[data-var="clientId"]')).toHaveText("YOUR_CLIENT_ID");
  await expect(visibleCode.locator(".line").first()).toHaveAttribute("data-line", "1");
  const [first, second] = await visibleCode.locator(".line").evaluateAll((lines) =>
    lines.slice(0, 2).map((line) => {
      const rect = line.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    }),
  );
  expect(second.top - first.top).toBeLessThan(first.height * 1.2);
  await expect(main.locator('.line[data-regions~="oauth"]').first()).toContainText("fixtureState");
  await expect(main).not.toContainText("#region");
  await expect(main).not.toContainText("@var");
  await expect(page.locator("calcite-tab-title")).toHaveText(["index.html", "main.js", "oauth-callback.html", "style.css"]);
});
