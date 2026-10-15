import { expect, test, type Page } from "./fixtures.ts";

const previewOutput = (page: Page) => page.frameLocator(".preview iframe").locator("#output");

test("index.mdx gives the index its title, prose and TutorialList sections in order", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Series Fixture");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A stable contract for the E2E tests of series sites.");
  await expect(page.locator("calcite-navigation-logo")).toHaveAttribute("heading", "Series Fixture");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /logo.*\.png$/);
  const lists = page.locator(".series-list");
  // `order` first (alpha 1, beta 2), then by title; delta has no tags, but its Python variant makes it a Python tutorial.
  await expect(lists.nth(0).locator(".series-card-title")).toHaveText(["Alpha Series Tutorial", "Beta Series Tutorial", "Gamma Series Tutorial"]);
  await expect(lists.nth(1).locator(".series-card-title")).toHaveText(["Beta Series Tutorial", "Delta Series Tutorial"]);
  const alpha = lists.nth(0).locator(".series-card").first();
  await expect(alpha.locator(".series-card-description")).toHaveText("A web app with a persisted token field and a Preview.");
  await expect(alpha.locator(".series-card-meta")).toContainText("Beginner");
  await expect(alpha.locator(".series-card-meta")).toContainText("10 min");
  // JavaScript has a logo in tagGroups: it replaces the family dot. No variants, so no "Available in" band.
  await expect(alpha.locator(".series-card-tags li")).toHaveText(["Web", "JavaScript"]);
  await expect(alpha.locator(".series-card-tags li.has-logo img")).toHaveAttribute("src", logoSrc("javascript", "f7df1e"));
  await expect(alpha.locator(".series-card-variants")).toHaveCount(0);
});

test("the tag filter hides cards without a selected tag and counts tutorials", async ({ page }) => {
  await page.goto("/");
  const tag = (name: string) => page.locator(`#series-tags-top .series-tag[data-tag="${name}"]`);
  await expect(page.locator("#series-count")).toHaveText("4 tutorials");
  // Most used first, with the number of tutorials on the page.
  await expect(page.locator("#series-tags-top .series-tag").first()).toHaveAttribute("data-tag", "Web");
  await expect(tag("Web").locator(".series-tag-count")).toHaveText(", 3 tutorials");
  await tag("Python").click();
  await expect(tag("Python")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".series-list").nth(0).locator(".series-card-title:visible")).toHaveText(["Beta Series Tutorial"]);
  await expect(page.locator("#series-count")).toHaveText("2 of 4 tutorials");
  await expect(page).toHaveURL(/\?tags=Python$/);
  // Same family (Language): either tag.
  await tag("JavaScript").click();
  await expect(page.locator("#series-count")).toHaveText("3 of 4 tutorials");
  await tag("Python").click();
  await tag("JavaScript").click();
  await expect(page.locator("#series-count")).toHaveText("4 tutorials");
  await expect(page).toHaveURL(/\/$/);
});

test("the popular tags fit one line and +N more groups every tag by family", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await page.goto("/");
  const top = page.locator("#series-tags-top");
  const all = page.locator("#series-tags-all");
  const shown = top.locator(".series-tag:visible");
  await expect(page.locator("#series-more")).toBeVisible();
  const count = await shown.count();
  expect(count).toBeGreaterThan(1);
  expect(count).toBeLessThan(10);
  await expect(page.locator("#series-more")).toHaveText(`+${10 - count} more`);
  // One line: every visible tag shares the first one's top.
  const tops = await shown.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);

  await page.locator("#series-more").click();
  await expect(top).toBeHidden();
  await expect(page.locator("#series-more")).toHaveAttribute("aria-expanded", "true");
  await expect(all.locator(".series-tag-group-name")).toHaveText(["Language", "Auth", "Other"]);
  await expect(all.locator(".series-tag-group").nth(0)).toHaveAttribute("data-family", "0");
  await expect(all.locator(".series-tag-group").nth(2)).not.toHaveAttribute("data-family");
  await expect(all.locator(".series-tag[data-family]")).toHaveCount(0);
  await all.locator('.series-tag[data-tag="Node.js"]').click();
  await all.locator('.series-tag[data-tag="JavaScript"]').click();
  await expect(page.locator("#series-count")).toHaveText("2 of 4 tutorials");
  await all.locator('.series-tag[data-tag="OAuth"]').click();
  await expect(page.locator("#series-count")).toHaveText("1 of 4 tutorials");
  await expect(page.locator(".series-card-title:visible")).toHaveText(["Gamma Series Tutorial"]);
  // The Scripts section has no match left.
  await expect(page.locator(".series-list").nth(1).locator(".series-empty")).toBeVisible();
  // Back to the row: selected tags stay visible even when rarer tags are left out.
  await page.locator("#series-fewer").click();
  for (const name of ["Node.js", "JavaScript", "OAuth"]) {
    await expect(top.locator(`.series-tag[data-tag="${name}"]`)).toBeVisible();
    await expect(top.locator(`.series-tag[data-tag="${name}"]`)).toHaveAttribute("aria-pressed", "true");
  }
});

test("tag counts follow the search: no tag leads to zero results", async ({ page }) => {
  await page.goto("/");
  // Beta by its title, delta by its description.
  await page.locator("#series-search input").pressSequentially("beta");
  await expect(page.locator("#series-count")).toHaveText("2 of 4 tutorials");
  // The row keeps only tags with results, by live count; JavaScript (0) is gone.
  await expect(page.locator("#series-tags-top .series-tag:visible")).toHaveText([/^Python.*2/, /^Web.*1/]);
  // Every other tag has no result: the panel is still reachable, without promising more matches.
  await expect(page.locator("#series-more")).toHaveText("All tags");
  await page.locator("#series-more").click();
  await expect(page.locator('#series-tags-all .series-tag[data-tag="JavaScript"]')).toBeDisabled();
  await expect(page.locator('#series-tags-all .series-tag[data-tag="Python"]')).toBeEnabled();
  await expect(page.locator('#series-tags-all .series-tag[data-tag="Python"] .series-tag-count')).toHaveText(", 2 tutorials");
});

test("every tag shows on one line when it fits, without +N more", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 });
  await page.goto("/");
  await expect(page.locator("#series-tags-top .series-tag:visible")).toHaveCount(10);
  await expect(page.locator("#series-more")).toBeHidden();
});

test("the search filters by text and level, highlights matches and keeps the state in the URL", async ({ page }) => {
  await page.goto("/");
  await page.locator("#series-search input").pressSequentially("TOKEN");
  await expect(page.locator("#series-count")).toHaveText("2 of 4 tutorials");
  await expect(page.locator(".series-card-description:visible mark").first()).toHaveText("token");
  await expect(page).toHaveURL(/\?q=TOKEN$/);
  await page.locator("#series-level").evaluate((select: HTMLElement & { value: string }) => {
    select.value = "Beginner";
    select.dispatchEvent(new CustomEvent("calciteSelectChange", { bubbles: true }));
  });
  await expect(page.locator(".series-card-title:visible")).toHaveText(["Alpha Series Tutorial"]);
  await expect(page).toHaveURL(/\?q=TOKEN&level=Beginner$/);

  await page.reload();
  await expect(page.locator("#series-search")).toHaveJSProperty("inputValue", "TOKEN");
  await expect(page.locator("#series-count")).toHaveText("1 of 4 tutorials");
  await page.locator("#series-clear").click();
  await expect(page.locator("#series-count")).toHaveText("4 tutorials");
  await expect(page.locator("mark")).toHaveCount(0);
  await expect(page.locator("#series-clear")).toBeHidden();
  await expect(page).toHaveURL(/\/$/);

  // An unknown tag or level in the URL is ignored.
  await page.goto("/?tags=Nope,Python&level=Expert");
  await expect(page.locator("#series-count")).toHaveText("2 of 4 tutorials");
});

test("typing suggests tags, and picking one selects it", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("/");
  await page.keyboard.type("oau");
  const item = page.locator("calcite-autocomplete-item");
  await expect(item).toHaveCount(1);
  await expect(item).toHaveJSProperty("heading", "OAuth");
  await expect(item.locator(".series-suggestion-meta")).toHaveText("Auth · 1");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?tags=OAuth$/);
  await expect(page.locator("#series-search")).toHaveJSProperty("inputValue", "");
  await expect(page.locator('#series-tags-top .series-tag[data-tag="OAuth"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".series-card-tags li.is-match:visible")).toHaveText(["OAuth"]);
});

test("card tags are plain labels with their family", async ({ page }) => {
  await page.goto("/");
  const gamma = page.locator(".series-card", { hasText: "Gamma Series Tutorial" });
  await expect(gamma.locator('.series-card-tags li[data-family="1"]')).toHaveText(["OAuth", "API keys"]);
  await expect(gamma.locator("button")).toHaveCount(0);
});

test("without JavaScript the search bar is hidden and every card shows", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/?tags=Python");
  await expect(page.locator(".series-filter")).toBeHidden();
  await expect(page.locator(".series-list").nth(0).locator(".series-card-title")).toHaveCount(3);
  await context.close();
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

test("cards link to each variant when a tutorial has two or more", async ({ page }) => {
  await page.goto("/");
  const card = (title: string) => page.locator(".series-list").nth(0).locator(".series-card", { hasText: title });
  // No logo next to the title: alpha's tutorial logo is for its page header.
  await expect(page.locator(".series-card-heading img")).toHaveCount(0);
  // Card links keep the card's text color (the index.mdx prose link color is for prose).
  const colors = await card("Beta Series Tutorial").evaluate((el) =>
    [el, el.querySelector(".series-card-title")!, el.querySelector(".series-card-variant")!].map((node) => getComputedStyle(node).color),
  );
  expect(new Set(colors).size).toBe(1);
  // Beta: one link per variant, the tagGroups logo first (Python), else the variant's (Web); labels leave the tag line.
  const beta = card("Beta Series Tutorial");
  const links = beta.locator("a.series-card-variant");
  await expect(beta.locator(".series-card-variants-label")).toHaveText("Available in");
  await expect(links).toHaveText(["Web: Beta Series Tutorial", "Python: Beta Series Tutorial"]);
  await expect(links.nth(0)).toHaveAttribute("href", /\/beta\/\?variant=web$/);
  await expect(links.nth(0).locator("img")).toHaveAttribute("src", logoSrc("browser", "e8a317"));
  await expect(links.nth(1).locator("img")).toHaveAttribute("src", logoSrc("python", "3776ab"));
  await expect(links.nth(1).locator("img")).toHaveAttribute("alt", "");
  expect((await links.nth(1).boundingBox())!.height).toBeGreaterThanOrEqual(28);
  await expect(beta.locator(".series-card-tags")).toHaveCount(0);
  // Delta has one variant, no choice: its label stays a tag, with its tagGroups logo.
  const delta = page.locator(".series-list").nth(1).locator(".series-card", { hasText: "Delta Series Tutorial" });
  await expect(delta.locator(".series-card-variants")).toHaveCount(0);
  await expect(delta.locator(".series-card-tags li.has-logo")).toHaveText(["Python"]);

  // Selecting a variant's tag marks its link, and the title opens the tutorial in that variant.
  await page.locator('#series-tags-top .series-tag[data-tag="Python"]').click();
  await expect(beta.locator("a.series-card-variant.is-match")).toHaveText(["Python: Beta Series Tutorial"]);
  await expect(beta.locator(".series-card-title")).toHaveAttribute("href", /\/beta\/\?variant=python$/);
  await page.locator('#series-tags-top .series-tag[data-tag="Python"]').click();
  await expect(beta.locator(".series-card-title")).toHaveAttribute("href", /\/beta\/$/);

  // A variant link opens that variant.
  await links.nth(1).click();
  await expect(page).toHaveURL(/\/beta\/\?variant=python$/);
  await expect(page.locator('#variant-switcher calcite-segmented-control-item[value="python"]')).toHaveJSProperty("checked", true);
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

test("the search bar keeps its hydrated height before Calcite loads", async ({ page, browser, baseURL }) => {
  const listTop = (p: Page) => p.locator(".series-list").first().evaluate((el) => Math.round(el.getBoundingClientRect().top));
  await page.goto("/");
  await expect(page.locator("#series-search")).toHaveAttribute("calcite-hydrated", "");
  const hydrated = await listTop(page);

  // Scripts blocked but JavaScript on: the bar shows (no <noscript>) and its components never hydrate.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const unhydrated = await context.newPage();
  await unhydrated.route(/\.js($|\?)/, (route) => route.abort());
  await unhydrated.goto("/");
  expect(await listTop(unhydrated)).toBe(hydrated);
  await context.close();
});
