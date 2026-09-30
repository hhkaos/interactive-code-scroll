import { expect, test, type Page } from "./fixtures.ts";

const previewOutput = (page: Page) => page.frameLocator(".preview iframe").locator("#output");

test("index.mdx gives the index its title, prose and TutorialList sections in order", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Series Fixture");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A stable contract for the E2E tests of series sites.");
  await expect(page.locator("calcite-navigation-logo")).toHaveAttribute("heading", "Series Fixture");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /logo.*\.png$/);
  const lists = page.locator(".series-list");
  // `order` first (alpha 1, beta 2), then by title; the Python section only lists beta.
  await expect(lists.nth(0).locator(".series-card-title")).toHaveText(["Alpha Series Tutorial", "Beta Series Tutorial", "Gamma Series Tutorial"]);
  await expect(lists.nth(1).locator(".series-card-title")).toHaveText(["Beta Series Tutorial"]);
  const alpha = lists.nth(0).locator(".series-card").first();
  await expect(alpha.locator(".series-card-description")).toHaveText("A web app with a persisted token field and a Preview.");
  await expect(alpha.locator(".series-card-meta")).toContainText("Beginner");
  await expect(alpha.locator(".series-card-meta")).toContainText("10 min");
  await expect(alpha.locator(".series-card-tags li")).toHaveText(["Web", "JavaScript"]);
});

test("the tag filter hides cards without a selected tag and counts tutorials", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#series-count")).toHaveText("3 tutorials");
  await page.locator('calcite-chip[value="Python"]').click();
  await expect(page.locator(".series-list").nth(0).locator(".series-card-title:visible")).toHaveText(["Beta Series Tutorial"]);
  await expect(page.locator("#series-count")).toHaveText("1 of 3 tutorials");
  await page.locator('calcite-chip[value="JavaScript"]').click();
  await expect(page.locator("#series-count")).toHaveText("2 of 3 tutorials");
  await page.locator('calcite-chip[value="Python"]').click();
  await page.locator('calcite-chip[value="JavaScript"]').click();
  await expect(page.locator("#series-count")).toHaveText("3 tutorials");
});

test("the index fits a phone without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".series-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("cards open their tutorial and the header links back to the index", async ({ page }) => {
  await page.goto("/");
  await page.locator(".series-card", { hasText: "Alpha Series Tutorial" }).first().click();
  await expect(page).toHaveURL(/\/alpha\/$/);
  await expect(page.locator("calcite-navigation-logo")).toHaveAttribute("heading", "Alpha Series Tutorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A web app with a persisted token field and a Preview.");
  await page.getByRole("link", { name: "All tutorials" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("calcite-navigation-logo")).toHaveAttribute("heading", "Series Fixture");
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

test('persist="tutorial" keeps a field to its tutorial', async ({ page }) => {
  const layer = page.locator('calcite-input[data-var="layerName"] input');
  await page.goto("/alpha/#config");
  await layer.fill("alpha-layer");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ics:var:alpha:layerName"))).toBe("alpha-layer");

  await page.goto("/beta/#config");
  await expect(layer).toHaveValue("");
  await expect(page.locator('.code [data-var="layerName"]').first()).toContainText("Demo layer");
  await layer.fill("beta-layer");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ics:var:beta:layerName"))).toBe("beta-layer");

  await page.goto("/alpha/#config");
  await expect(layer).toHaveValue("alpha-layer");
  expect(await page.evaluate(() => localStorage.getItem("ics:var:layerName"))).toBeNull();
});

test("the family switcher lists sibling tutorials by order, then label", async ({ page }) => {
  await page.goto("/alpha/");
  const switcher = page.locator("#family-switcher");
  await expect(switcher).toHaveAttribute("label", "Tutorial language");
  await expect(switcher.locator("calcite-segmented-control-item")).toHaveText(["JavaScript", "Browser and Python", "Python only"]);
  await expect(switcher.locator("calcite-segmented-control-item[checked]")).toHaveText("JavaScript");
  // Gamma has no family: no switcher.
  await page.goto("/gamma/");
  await expect(page.locator(".family-switcher")).toHaveCount(0);
});

test("switching to a sibling lands on the same step, else its top", async ({ page }) => {
  await page.goto("/alpha/#config");
  await page.locator('#family-switcher calcite-segmented-control-item[value="delta"]').click();
  await expect(page).toHaveURL(/\/delta\/#config$/);
  await expect(page.locator("section.step#config")).toHaveAttribute("data-active", "");

  await page.goto("/delta/#setup");
  await page.locator('#family-switcher calcite-segmented-control-item[value="alpha"]').click();
  await expect(page).toHaveURL(/\/alpha\/(#setup)?$/);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
});

test("switching to a sibling carries the variant only when the sibling has it", async ({ page }) => {
  await page.goto("/beta/?variant=python#config");
  await page.locator('#family-switcher calcite-segmented-control-item[value="delta"]').click();
  await expect(page).toHaveURL(/\/delta\/\?variant=python#config$/);

  await page.goto("/beta/?variant=web#config");
  await page.locator('#family-switcher calcite-segmented-control-item[value="delta"]').click();
  await expect(page).toHaveURL(/\/delta\/#config$/);
});

test("the family switcher becomes a dropdown when the header is narrow", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 800 });
  await page.goto("/alpha/");
  await expect(page.locator("#family-dropdown")).toBeVisible();
  await expect(page.locator("#family-switcher")).toBeHidden();
  await page.locator("#family-dropdown calcite-button").click();
  await page.locator('#family-dropdown calcite-dropdown-item[data-tutorial="beta"]').click();
  await expect(page).toHaveURL(/\/beta\/$/);
});
