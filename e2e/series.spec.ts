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

const openFamilyMenu = async (page: Page) => {
  await page.locator("#family-dropdown calcite-button").click();
  await expect(page.locator("#family-dropdown calcite-dropdown-item").first()).toBeVisible();
};
const familyItem = (page: Page, slug: string) => page.locator(`#family-dropdown calcite-dropdown-item[data-tutorial="${slug}"]`);

test("the family menu lists sibling tutorials by order, then label, as links", async ({ page }) => {
  await page.goto("/alpha/");
  const trigger = page.locator("#family-dropdown calcite-button");
  await expect(trigger).toHaveAttribute("label", "Tutorial for: JavaScript");
  await expect(trigger).toContainText("Tutorial for: JavaScript");
  const items = page.locator("#family-dropdown calcite-dropdown-item");
  await expect(items).toHaveText(["JavaScript", "REST API", "Python"]);
  await expect(familyItem(page, "alpha")).toHaveAttribute("selected", "");
  // Plain links in the page's HTML: they work before (or without) the client script.
  await expect(familyItem(page, "beta")).toHaveAttribute("href", "/beta/");
  // Gamma has no family: no menu.
  await page.goto("/gamma/");
  await expect(page.locator(".family-switcher")).toHaveCount(0);
});

test("switching to a sibling lands on the same step, else its top", async ({ page }) => {
  await page.goto("/alpha/#config");
  await openFamilyMenu(page);
  await familyItem(page, "delta").click();
  await expect(page).toHaveURL(/\/delta\/#config$/);
  await expect(page.locator("section.step#config")).toHaveAttribute("data-active", "");

  await page.goto("/delta/#setup");
  await openFamilyMenu(page);
  await familyItem(page, "alpha").click();
  await expect(page).toHaveURL(/\/alpha\/(#setup)?$/);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
});

test("<Intro preview> sets the Result pane on load and each time the reader returns to the intro", async ({ page }) => {
  // Short enough for the docs panel to scroll back to the intro.
  await page.setViewportSize({ width: 1440, height: 420 });
  const frame = page.locator(".result-frame");
  await page.goto("/delta/");
  await expect(page.locator("section.result")).toBeVisible();
  await expect(frame).toBeHidden();

  // A deep link applies the step's own state, not the intro's.
  await page.goto("/delta/#setup");
  await expect(frame).toBeVisible();
  await page.goto("/delta/#config");
  await expect(frame).toBeHidden();

  await page.goto("/delta/#setup");
  await expect(frame).toBeVisible();
  await page.locator("main.docs").hover();
  await page.mouse.wheel(0, -10_000);
  await expect.poll(() => page.locator("main.docs").evaluate((docs) => docs.scrollTop)).toBe(0);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(frame).toBeHidden();

  // Step keys back from the first step return to the intro too.
  await page.goto("/delta/#config");
  await page.locator("section.result calcite-action#result-toggle").click();
  await expect(frame).toBeVisible();
  await page.keyboard.press("PageUp");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(frame).toBeHidden();
});

test("switching to a sibling carries the variant only when the sibling has it", async ({ page }) => {
  await page.goto("/beta/?variant=python#config");
  await openFamilyMenu(page);
  await expect(familyItem(page, "delta")).toHaveAttribute("href", /\/delta\/\?variant=python#config$/);
  await familyItem(page, "delta").click();
  await expect(page).toHaveURL(/\/delta\/\?variant=python#config$/);

  await page.goto("/beta/?variant=web#config");
  await openFamilyMenu(page);
  await expect(familyItem(page, "delta")).toHaveAttribute("href", /\/delta\/#config$/);
});

test("a narrow header keeps the current label and drops the prefix", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 800 });
  await page.goto("/alpha/");
  await expect(page.locator(".family-prefix")).toBeHidden();
  await expect(page.locator("#family-dropdown calcite-button")).toHaveAttribute("label", "Tutorial for: JavaScript");
  await openFamilyMenu(page);
  await familyItem(page, "beta").click();
  await expect(page).toHaveURL(/\/beta\/$/);
});

// Small SVGs are inlined as data URLs: match the file name or the logo's fill color.
const logoSrc = (name: string, fill: string) => new RegExp(`${name}.*\\.svg$|%23${fill}`);

test("cards show the tutorial logo, else the variant logos, at fixed sizes", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".series-list").nth(0).locator(".series-card");
  // Alpha: tutorial logo next to the title (decorative).
  const alphaLogo = cards.nth(0).locator(".series-card-logo");
  await expect(alphaLogo).toHaveAttribute("src", logoSrc("alpha-logo", "2b7bd6"));
  await expect(alphaLogo).toHaveAttribute("alt", "");
  await expect(alphaLogo).toHaveCSS("width", "32px");
  // Beta: no tutorial logo, so one logo per variant, labelled.
  await expect(cards.nth(1).locator(".series-card-logo")).toHaveCount(0);
  expect(await cards.nth(1).locator(".series-card-variant-logo").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("alt")))).toEqual([
    "Browser",
    "Python",
  ]);
  // Gamma: no logo at all.
  await expect(cards.nth(2).locator("img")).toHaveCount(0);
});

test("the variant switcher shows variant logos and the header follows the active one", async ({ page }) => {
  await page.goto("/beta/");
  const header = page.locator(".app-header calcite-navigation-logo");
  const items = page.locator("#variant-switcher calcite-segmented-control-item");
  await expect(items.nth(0).locator("img.variant-logo")).toHaveAttribute("src", logoSrc("browser", "e8a317"));
  await expect(items.nth(1).locator("img.variant-logo")).toHaveAttribute("alt", "");
  await expect(header).toHaveJSProperty("thumbnail", await items.nth(0).locator("img").getAttribute("src"));
  await items.nth(1).click();
  await expect(header).toHaveJSProperty("thumbnail", await items.nth(1).locator("img").getAttribute("src"));
  // The favicon stays on the first variant's logo (beta has no tutorial logo).
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", logoSrc("browser", "e8a317"));
});

test("the header keeps its hydrated height before Calcite loads", async ({ page, browser, baseURL }) => {
  const mainTop = (p: Page) => p.locator(".series-main").evaluate((el) => Math.round(el.getBoundingClientRect().top));
  await page.goto("/");
  await expect(page.locator("calcite-navigation")).toHaveAttribute("calcite-hydrated", "");
  const hydrated = await mainTop(page);

  // Without scripts the components never hydrate: the page as it looks before they load.
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: page.viewportSize() });
  const unhydrated = await context.newPage();
  await unhydrated.goto("/");
  expect(await mainTop(unhydrated)).toBe(hydrated);
  await context.close();
});
