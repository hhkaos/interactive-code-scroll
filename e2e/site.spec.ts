import { expect, test } from "./fixtures.ts";

// The project website (site/): landing page under the Pages base path, with the
// REST geocoding tutorial built into showcase/ and embedded as the live demo.

const BASE = "/interactive-code-scroll/";
const demo = (page: import("./fixtures.ts").Page) => page.frameLocator(".browser iframe");

test("internal links carry the base path and resolve", async ({ page, request }) => {
  await page.goto(BASE);
  await expect(page.locator("h1")).toContainText("move with your story");
  const hrefs = await page.locator("a[href^='/'], img[src^='/']").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href") ?? element.getAttribute("src") ?? ""),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of new Set(hrefs)) {
    expect(href.startsWith(BASE), href).toBe(true);
    expect((await request.get(href.split("#")[0]!)).status(), href).toBe(200);
  }
});

test("the live demo embeds the tutorial on the request step and follows the page theme", async ({ page }) => {
  await page.goto(BASE);
  await page.locator("#demo").scrollIntoViewIfNeeded();
  const frame = demo(page);
  await expect(frame.locator(".result-badge")).toHaveText("Captured · output/geocode.json");
  await expect(frame.locator("body")).toHaveClass(/calcite-mode-dark/);

  await page.locator("#theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(frame.locator("body")).toHaveClass(/calcite-mode-light/);
});

test("the create command can be copied", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(BASE);
  const button = page.locator(".hero [data-copy]");
  await button.click();
  await expect(button).toContainText("Copied!");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm create interactive-code-scroll@latest");
});

test("phones get a screenshot link instead of the embedded demo, without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE);
  await expect(page.locator(".browser .viewport")).toBeHidden();
  await expect(page.locator(".browser .fallback")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});

// The docs (Starlight under <base>docs/) render docs/*.md in place.
const DOCS = ["quick-start", "features", "authoring", "presenting", "cli", "deployment", "upgrade"];

test("docs open on the quick start and list the pages in order", async ({ page }) => {
  await page.goto(`${BASE}docs/`);
  await expect(page).toHaveURL(`${BASE}docs/quick-start/`);
  await expect(page.locator("h1")).toHaveText(["Quick Start"]);
  const sidebar = page.locator("#starlight__sidebar ul.top-level a");
  await expect(sidebar).toHaveText(["Quick start", "Features", "Authoring reference", "Presenting", "CLI", "Deployment", "Upgrade guide"]);
  expect(await sidebar.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(
    DOCS.map((name) => `${BASE}docs/${name}/`),
  );
});

test("docs links carry the base path and resolve, anchors included; repository-only files go to GitHub", async ({ page, request }) => {
  const checked = new Set<string>();
  const ids = new Map<string, Set<string>>();
  const anchors: { from: string; path: string; hash: string }[] = [];
  for (const name of DOCS) {
    const url = `${BASE}docs/${name}/`;
    await page.goto(url);
    ids.set(url, new Set(await page.locator("[id]").evaluateAll((elements) => elements.map((element) => element.id))));
    const hrefs = await page.locator(".sl-markdown-content a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
    for (const href of hrefs) {
      if (href.startsWith("http")) continue;
      const [path = "", hash] = href.split("#");
      if (hash) anchors.push({ from: name, path: path || url, hash: decodeURIComponent(hash) });
      if (!path) continue;
      // A relative `page.md` link left unrewritten fails here.
      expect(href.startsWith(BASE), `${name}: ${href}`).toBe(true);
      if (checked.has(path)) continue;
      checked.add(path);
      expect((await request.get(path)).status(), href).toBe(200);
    }
  }
  // Every #hash into a docs page names a heading or element on it (catches sections moved between pages).
  for (const { from, path, hash } of anchors) {
    const targets = ids.get(path);
    if (targets) expect(targets.has(hash), `${from}: ${path}#${hash}`).toBe(true);
  }
  await page.goto(`${BASE}docs/features/`);
  await expect(page.locator(".sl-markdown-content a[href$='docs/dev/SPEC.md']").first()).toHaveAttribute(
    "href",
    "https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/dev/SPEC.md",
  );
});

test("docs screenshots load under the base and follow the page theme", async ({ page, request }) => {
  await page.goto(`${BASE}docs/features/`);
  const shots = page.locator(".sl-markdown-content .docs-shot");
  await expect(shots).toHaveCount(7);
  const srcs = await shots.locator("img").evaluateAll((images) => images.map((image) => image.getAttribute("src")!));
  for (const src of srcs) {
    expect(src).toMatch(new RegExp(`^${BASE}screenshots/[a-z-]+-(dark|light)\\.png$`));
    expect((await request.get(src)).status(), src).toBe(200);
  }
  const first = shots.first();
  await expect(first.locator(".docs-shot-dark")).toBeVisible();
  await expect(first.locator(".docs-shot-light")).toBeHidden();
  await page.locator("header .theme-toggle").click();
  await expect(first.locator(".docs-shot-light")).toBeVisible();
  await expect(first.locator(".docs-shot-dark")).toBeHidden();
});

test("the landing page and the docs share the theme choice", async ({ page }) => {
  await page.goto(`${BASE}docs/quick-start/`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.goto(BASE);
  await page.locator("#theme").click();
  await page.locator("nav[aria-label='Main'] a", { hasText: "Docs" }).click();
  await expect(page).toHaveURL(`${BASE}docs/quick-start/`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.locator("header .theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("header a.brand").click();
  await expect(page).toHaveURL(BASE);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the docs table of contents opens subsections only under the section being read", async ({ page }) => {
  await page.goto(`${BASE}docs/authoring/`);
  const toc = page.locator("starlight-toc");
  await expect(toc.getByRole("link", { name: "Components", exact: true })).toBeVisible();
  await expect(toc.getByRole("link", { name: "<Step>", exact: true })).toBeHidden();

  await page.locator("#step").scrollIntoViewIfNeeded();
  await expect(toc.getByRole("link", { name: "<Step>", exact: true })).toBeVisible();
  await expect(toc.getByRole("link", { name: "Regions", exact: true })).toBeHidden();
});
