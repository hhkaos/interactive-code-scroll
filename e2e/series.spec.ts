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
  // Usual levels get difficulty bars (Beginner: one filled) instead of the generic gauge icon.
  await expect(alpha.locator(".series-card-meta .series-level-bars")).toHaveAttribute("data-rank", "1");
  await expect(lists.nth(0).locator(".series-card").nth(1).locator(".series-level-bars")).toHaveAttribute("data-rank", "2");
  // JavaScript has a logo in tagGroups: it replaces the family dot. No variants, so no "Available in" band.
  await expect(alpha.locator(".series-card-tags li")).toHaveText(["Web", "JavaScript"]);
  await expect(alpha.locator(".series-card-tags li.has-logo img")).toHaveAttribute("src", logoSrc("javascript", "f7df1e"));
  await expect(alpha.locator(".series-card-variants")).toHaveCount(0);
});

test("updated shows on the card and above the explanations, not in presentation mode", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".series-list").first().locator(".series-card");
  // Unquoted in the fixture: YAML's Date reaches the page as the same calendar day.
  await expect(cards.first().locator(".series-card-updated time")).toHaveAttribute("datetime", "2026-10-16");
  await expect(cards.first().locator(".series-card-updated")).toHaveText("Updated Oct 16, 2026");
  await expect(cards.nth(1).locator(".series-card-updated")).toHaveCount(0);

  await page.goto("/alpha/");
  const updated = page.locator(".docs > .docs-updated");
  await expect(updated).toHaveText("Updated Oct 16, 2026");
  await expect(page.locator(".docs > :first-child")).toHaveClass("docs-updated");
  await page.locator("#present-toggle").click();
  await expect(updated).toBeHidden();
  await page.goto("/gamma/");
  await expect(page.locator(".docs-updated")).toHaveCount(0);
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
  const gamma = page.locator(".series-list").nth(0).locator(".series-card", { hasText: "Gamma Series Tutorial" });
  await expect(gamma.locator('.series-card-tags li[data-family="1"]')).toHaveText(["OAuth", "API keys"]);
  await expect(gamma.locator(".series-card-tags button")).toHaveCount(0);
});

test("without JavaScript the search bar is hidden and every card shows", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/?tags=Python");
  await expect(page.locator(".series-filter")).toBeHidden();
  await expect(page.locator(".series-list").nth(0).locator(".series-card-title")).toHaveCount(3);
  // Favorites need storage and the client: no section, no toggle.
  await expect(page.locator(".series-favorites")).toBeHidden();
  await expect(page.locator(".series-card-favorite")).toHaveCount(0);
  await context.close();
});

test("a star marks a favorite, and the Favorites section lists them in series order across reloads", async ({ page }) => {
  await page.goto("/");
  const section = page.locator(".series-favorites");
  const star = (list: number, title: string) => page.locator(".series-list").nth(list).locator(".series-card", { hasText: title }).locator(".series-card-favorite");
  await expect(section).toBeHidden();
  await expect(star(0, "Gamma Series Tutorial")).toHaveAttribute("aria-pressed", "false");
  await expect(star(0, "Gamma Series Tutorial")).toHaveAccessibleName("Favorite: Gamma Series Tutorial");

  await star(0, "Gamma Series Tutorial").click();
  await star(1, "Beta Series Tutorial").click();
  // The star sits above the stretched title link: the page stays.
  await expect(page).toHaveURL(/\/$/);
  await expect(section).toBeVisible();
  await expect(section.locator(".series-favorites-title")).toHaveText(/Favorites\s*2/);
  await expect(section.locator(".series-card-title:visible")).toHaveText(["Beta Series Tutorial", "Gamma Series Tutorial"]);
  // Card titles keep the card's text color, as in the lists (not the index.mdx prose link color).
  const colors = await section.locator(".series-card:visible").first().evaluate((el) => [el, el.querySelector(".series-card-title")!].map((node) => getComputedStyle(node).color));
  expect(colors[1]).toBe(colors[0]);
  // Every card of a favorite shows it pressed, in each section.
  await expect(star(0, "Beta Series Tutorial")).toHaveAttribute("aria-pressed", "true");
  await expect(section.locator('.series-card-favorite[aria-pressed="true"]:visible')).toHaveCount(2);
  expect(await page.evaluate(() => localStorage.getItem("ics:favorites:/"))).toBe('["gamma","beta"]');

  await page.reload();
  await expect(section.locator(".series-card-title:visible")).toHaveText(["Beta Series Tutorial", "Gamma Series Tutorial"]);
  // Unmarking from the section removes the card; focus moves to the section heading.
  await section.locator(".series-card", { hasText: "Beta Series Tutorial" }).locator(".series-card-favorite").click();
  await expect(section.locator(".series-card-title:visible")).toHaveText(["Gamma Series Tutorial"]);
  await expect(section.locator(".series-favorites-title")).toBeFocused();
  await star(0, "Gamma Series Tutorial").click();
  await expect(section).toBeHidden();
});

test("the filters apply to favorites; unknown stored slugs are ignored", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ics:favorites:/", JSON.stringify(["delta", "removed", "alpha"])));
  await page.goto("/");
  const section = page.locator(".series-favorites");
  await expect(section.locator(".series-card-title:visible")).toHaveText(["Alpha Series Tutorial", "Delta Series Tutorial"]);
  await page.locator('#series-tags-top .series-tag[data-tag="Python"]').click();
  await expect(section.locator(".series-card-title:visible")).toHaveText(["Delta Series Tutorial"]);
  await expect(section.locator(".series-favorites-title")).toHaveText(/Favorites\s*1/);
  // No favorite matches: the section hides.
  await page.goto("/?q=gamma");
  await expect(page.locator("#series-count")).toHaveText("1 of 4 tutorials");
  await expect(section).toBeHidden();
});

test("favorites work for the visit when storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await page.locator(".series-list").nth(0).locator(".series-card", { hasText: "Alpha Series Tutorial" }).locator(".series-card-favorite").click();
  await expect(page.locator(".series-favorites .series-card-title:visible")).toHaveText(["Alpha Series Tutorial"]);
});

test("the index fits a phone without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".series-card:visible").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("cards open their tutorial and the header links back to the index", async ({ page }) => {
  await page.goto("/");
  await page.locator(".series-list .series-card", { hasText: "Alpha Series Tutorial" }).first().click();
  await expect(page).toHaveURL(/\/alpha\/$/);
  await expect(page.locator("#header-title h1")).toHaveText("Alpha Series Tutorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A web app with a persisted token field and a Preview.");
  // The header's link (the closing panel has another one).
  await page.locator(".app-header").getByRole("link", { name: "All tutorials" }).click();
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
  await expect(trigger).toHaveText("JavaScript");
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

test("the family menu shows each sibling's logo and keeps labels aligned without one", async ({ page }) => {
  await page.goto("/alpha/");
  await openFamilyMenu(page);
  // Alpha: its tutorial logo. Beta: no tutorial logo, so its first variant's. Delta: none, an empty slot.
  await expect(familyItem(page, "alpha").locator("img.family-logo")).toHaveAttribute("src", logoSrc("alpha-logo", "2b7bd6"));
  await expect(familyItem(page, "beta").locator("img.family-logo")).toHaveAttribute("src", logoSrc("browser", "e8a317"));
  await expect(familyItem(page, "delta").locator("img")).toHaveCount(0);
  await expect(familyItem(page, "delta").locator("span.family-logo")).toHaveCount(1);
  const labelLeft = (slug: string) =>
    familyItem(page, slug).evaluate((el) => {
      const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
      const range = document.createRange();
      range.selectNodeContents(text);
      return Math.round(range.getBoundingClientRect().left);
    });
  expect(await labelLeft("delta")).toBe(await labelLeft("alpha"));
});

test("the family menu sits after the title with even 16px gaps around its divider", async ({ page }) => {
  await page.goto("/alpha/");
  const trigger = page.locator("#family-dropdown calcite-button");
  await expect(trigger).toBeVisible();
  const gaps = await page.evaluate(() => {
    const text = document.createRange();
    text.selectNodeContents(document.querySelector("#header-title h1")!);
    const divider = document.querySelector(".family-switcher")!;
    const before = getComputedStyle(divider, "::before");
    const dividerLeft = divider.getBoundingClientRect().left;
    const button = document.querySelector("#family-dropdown calcite-button")!.getBoundingClientRect();
    return {
      titleToDivider: Math.round(dividerLeft - text.getBoundingClientRect().right),
      dividerToButton: Math.round(button.left - dividerLeft - parseFloat(before.width)),
    };
  });
  expect(gaps).toEqual({ titleToDivider: 16, dividerToButton: 16 });
});

test("the family menu button shows its focus ring for keyboard focus only", async ({ page }) => {
  await page.goto("/alpha/");
  const trigger = page.locator("#family-dropdown calcite-button");
  const ring = () => trigger.evaluate((el) => getComputedStyle(el).getPropertyValue("--calcite-color-focus").trim());
  await trigger.click();
  await expect(trigger).toBeFocused();
  expect(await ring()).toBe("transparent");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  expect(await ring()).not.toBe("transparent");
});

test("a narrow header keeps the menu usable", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 800 });
  await page.goto("/alpha/");
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
  const header = page.locator("#header-title .page-title-logo");
  const items = page.locator("#variant-switcher calcite-segmented-control-item");
  await expect(items.nth(0).locator("img.variant-logo")).toHaveAttribute("src", logoSrc("browser", "e8a317"));
  await expect(items.nth(1).locator("img.variant-logo")).toHaveAttribute("alt", "");
  await expect(header).toHaveAttribute("src", (await items.nth(0).locator("img").getAttribute("src"))!);
  await items.nth(1).click();
  await expect(header).toHaveAttribute("src", (await items.nth(1).locator("img").getAttribute("src"))!);
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

test("a tutorial with a single variant shows no variant switcher", async ({ page }) => {
  await page.goto("/delta/");
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "python/main.py");
  await expect(page.locator("#variant-switcher")).toHaveCount(0);
  await expect(page.locator("#variant-dropdown")).toHaveCount(0);
  await expect(page.locator(".code-panel .header-divider")).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the sibling menu becomes the title's second line; tapping the title opens it", async ({ page }) => {
    await page.goto("/beta/#config");
    const title = page.locator("#header-title");
    await expect(title.locator("#family-dropdown calcite-button")).toHaveText("REST API");
    await expect(title.locator(".page-title-logo")).toBeHidden();
    await expect(title).not.toHaveAttribute("data-clipped");
    // The label lines up with the h1 and both sit inside the 64px bar.
    const h1 = (await title.locator("h1").boundingBox())!;
    const label = await page.evaluate(() => {
      const text = document.createRange();
      text.selectNodeContents(document.querySelector("#family-dropdown calcite-button")!);
      return text.getBoundingClientRect().left;
    });
    expect(Math.abs(label - h1.x)).toBeLessThanOrEqual(10);
    for (const control of ["#header-title", "#theme-toggle"]) {
      const box = (await page.locator(control).boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await title.locator("h1").click();
    await expect(page.locator("#family-dropdown")).toHaveAttribute("open", "");
    await expect(page.locator("#family-dropdown calcite-dropdown-item")).toHaveCount(3);
    // Menu styles follow the menu under the title (they once hung on .family-switcher: full-size logos).
    const logo = (await page.locator("#family-dropdown .family-logo").first().boundingBox())!;
    expect(logo.width).toBeLessThanOrEqual(20);
    // The title tap is not a pointer focus on the trigger, so no ring either way; a tap on the trigger hides it.
    await page.keyboard.press("Escape");
    await page.locator("#family-dropdown calcite-button").click();
    await expect(page.locator("#family-dropdown calcite-button")).toHaveCSS("--calcite-color-focus", "transparent");
    // The title fits: the menu does not repeat it.
    await expect(page.locator("#family-dropdown .family-title")).toHaveCount(0);
  });

  test("a clipped title ends in an ellipsis and heads the sibling menu in full", async ({ page }) => {
    // Narrow enough to clip this short title (no logo and a smaller font on phones).
    await page.setViewportSize({ width: 220, height: 700 });
    await page.goto("/beta/#config");
    await expect(page.locator("#header-title")).toHaveAttribute("data-clipped", "");
    await expect(page.locator("#header-title h1")).toHaveCSS("text-overflow", "ellipsis");
    await page.locator("#header-title h1").click();
    await expect(page.locator("#family-dropdown .family-title")).toHaveAttribute("group-title", "Beta Series Tutorial");
  });

  test("on a desktop the menu stays a separate button after the title", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/beta/#config");
    await expect(page.locator(".family-switcher #family-dropdown")).toHaveCount(1);
    await expect(page.locator("#family-dropdown > calcite-button")).toHaveAttribute("appearance", "outline");
    await expect(page.locator("#header-title .page-title-logo")).toBeVisible();
  });
});

test("the closing panel links the next tutorial: next, else series order; none after the last or with next: false", async ({ page }) => {
  const panel = page.locator(".completion");
  const nextLink = panel.locator(".completion-next");
  // alpha has no `next`: the next one in index order.
  await page.goto("/alpha/");
  await expect(nextLink).toHaveAttribute("href", /\/beta\/$/);
  await expect(nextLink.locator(".completion-next-title")).toHaveText("Beta Series Tutorial");
  await expect(panel.locator("calcite-button", { hasText: "All tutorials" })).toHaveAttribute("href", /\/$/);
  // The series default feedback link, with {title} and {slug} filled in.
  await expect(panel.locator("calcite-button", { hasText: "Send feedback" })).toHaveAttribute(
    "href",
    "https://github.com/example/series-fixture/issues/new?title=Feedback:%20Alpha%20Series%20Tutorial&labels=alpha",
  );
  // beta: `next: gamma` skips delta.
  await page.goto("/beta/");
  await expect(nextLink).toHaveAttribute("href", /\/gamma\/$/);
  // delta: `next: false`.
  await page.goto("/delta/");
  await expect(nextLink).toHaveCount(0);
  // gamma is the last one; its own feedbackUrl overrides the series one.
  await page.goto("/gamma/");
  await expect(nextLink).toHaveCount(0);
  await expect(panel.locator("calcite-button", { hasText: "Send feedback" })).toHaveAttribute("href", "mailto:docs@example.com");
});

test("the closing slide's QR code points at the series presentationUrl, with {slug} filled in", async ({ page }) => {
  await page.goto("/alpha/#render");
  await page.locator("#present-toggle").click();
  await page.keyboard.press("PageDown");
  const slide = page.locator("body > .completion[data-slide]");
  await expect(slide.locator(".completion-share-url")).toHaveAttribute("href", "https://example.com/series-fixture/alpha/");
  await expect(slide.locator(".completion-share-url")).toHaveText("example.com/series-fixture/alpha/");
  await expect(slide.locator(".completion-qr svg")).toBeVisible();
  await expect(slide.locator(".completion-next")).toBeVisible();
});

test("when the QR encoder fails to load, the slide keeps the URL without an empty box", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => void (message.type() === "error" && errors.push(message.text())));
  await page.route(/\/_astro\/qrcode\.[^/]+\.js$/, (route) => route.abort());
  await page.goto("/alpha/#render");
  // Entering presentation mode loads the encoder: it fails.
  await page.locator("#present-toggle").click();
  await expect.poll(() => errors.some((text) => text.includes("the QR code could not be drawn"))).toBe(true);
  await page.keyboard.press("PageDown");
  const slide = page.locator("body > .completion[data-slide]");
  await expect(slide).toBeVisible();
  await expect(slide.locator(".completion-qr")).toBeHidden();
  await expect(slide.locator(".completion-share-url")).toHaveText("example.com/series-fixture/alpha/");
});
