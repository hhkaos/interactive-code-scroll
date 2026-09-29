import { expect, test, type Page } from "./fixtures.ts";

const previewOutput = (page: Page) => page.frameLocator(".preview iframe").locator("#output");

test("the index links every tutorial and skips folders that are not tutorials", async ({ page }) => {
  await page.goto("/");
  const links = page.locator(".series-list a");
  await expect(links).toHaveText(["Alpha Series Tutorial", "Beta Series Tutorial", "Gamma Series Tutorial"]);
  await links.first().click();
  await expect(page).toHaveURL(/\/alpha\/$/);
  await expect(page.locator("calcite-navigation-logo")).toHaveAttribute("heading", "Alpha Series Tutorial");
});

test("each tutorial runs its Preview from its own URL and storage slot", async ({ page, baseURL }) => {
  await page.goto("/alpha/");
  await expect(page.locator(".preview iframe")).toHaveAttribute("src", `${baseURL}/alpha/preview/?target=iframe`);
  await expect(previewOutput(page)).toHaveText("Alpha app: DEMO_TOKEN");

  await page.goto("/gamma/");
  await expect(page.locator(".preview iframe")).toHaveAttribute("src", `${baseURL}/gamma/preview/?target=iframe`);
  await expect(previewOutput(page)).toHaveText("Gamma app");

  // A reload of the alpha Preview (e.g. the OAuth redirect) still gets alpha's code.
  await page.goto("/alpha/preview/?target=iframe");
  await expect(page.locator("#output")).toHaveText("Alpha app: DEMO_TOKEN");
});

test("captured outputs and published code live under the tutorial's URL", async ({ page, request }) => {
  await page.goto("/beta/?variant=python#render");
  await expect(page.locator(".result-body")).toContainText("Beta script ran");
  expect(await (await request.get("/beta/output/run.txt")).text()).toBe("Beta script ran\n");
  expect(await (await request.get("/beta/preview/python/main.py")).text()).toContain('SERIES_TOKEN = "DEMO_TOKEN"');
  expect((await request.get("/output/run.txt")).status()).toBe(404);
});

test("persisted fields are shared by every tutorial of the site", async ({ page }) => {
  await page.goto("/alpha/#config");
  await page.locator('calcite-input[data-var="seriesToken"] input').fill("shared-value");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ics:var:seriesToken"))).toBe("shared-value");
  await page.goto("/beta/#config");
  await expect(page.locator('calcite-input[data-var="seriesToken"] input')).toHaveValue("shared-value");
});
