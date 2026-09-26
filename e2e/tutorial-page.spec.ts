import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the author's tutorial.mdx with its frontmatter title", async ({ page }) => {
  await expect(page).toHaveTitle("OAuth 2.0 with the ArcGIS Maps SDK for JavaScript");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("OAuth 2.0 with the ArcGIS Maps SDK for JavaScript");
});

test("shows the frontmatter logo in the header and as favicon", async ({ page }) => {
  // Vite inlines small assets as data: URIs; larger ones get a hashed URL.
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(favicon).toMatch(/^data:image\/svg\+xml|arcgis-maps-sdk-for-javascript-glyph-32.*\.svg$/);
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

test("renders each <Step> as a section with its references", async ({ page }) => {
  const config = page.locator("section.step#config");
  await expect(config).toHaveAttribute("data-file", "main.js");
  await expect(config).toHaveAttribute("data-region", "config");
  await expect(page.locator("section.step")).toHaveCount(9);
  await expect(page.locator("section.step#register-app template.step-media")).toHaveCount(1);
});

test("renders <VarField> as a Calcite input with the code literal as placeholder", async ({ page }) => {
  const input = page.locator('calcite-input[data-var="clientId"]');
  await expect(input).toHaveAttribute("placeholder", "YOUR_CLIENT_ID");
  await expect(input).toHaveAttribute("data-secret", "");
  await expect(input).toHaveAttribute("data-persist", "");
});

test("renders build-time highlighted code with markers stripped", async ({ page }) => {
  const main = page.locator('.code[data-file="main.js"]');
  await expect(main.locator('[data-var="clientId"]')).toHaveText("YOUR_CLIENT_ID");
  await expect(main.locator('.line[data-regions~="oauth"]').first()).toContainText("$arcgis.import");
  await expect(main).not.toContainText("#region");
  await expect(main).not.toContainText("@var");
  await expect(page.locator("calcite-tab-title")).toHaveText(["index.html", "main.js", "oauth-callback.html", "style.css"]);
});
