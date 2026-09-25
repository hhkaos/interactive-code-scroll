import { expect, test, type Page } from "./fixtures.ts";

const tokenColor = (page: Page) =>
  page.locator('.code[data-file="main.js"] [data-var="clientId"]').evaluate((el) => getComputedStyle(el).color);
const docsBackground = (page: Page) => page.locator("main.docs").evaluate((el) => getComputedStyle(el).backgroundColor);
const docsWidth = (page: Page) => page.locator("main.docs").evaluate((el) => el.getBoundingClientRect().width);

test.describe("theme", () => {
  test.use({ colorScheme: "dark" });

  test("defaults to the OS preference; the toggle switches the UI and is remembered", async ({ page }) => {
    await page.goto("/#config");
    await expect(page.locator("body")).toHaveClass(/calcite-mode-dark/);
    const dark = { docs: await docsBackground(page), code: await tokenColor(page) };

    await page.locator("#theme-toggle").click();
    await expect(page.locator("body")).toHaveClass(/calcite-mode-light/);
    await expect.poll(() => docsBackground(page)).not.toBe(dark.docs);
    // codeTheme defaults to dark: the code panel keeps its colors in both modes.
    expect(await tokenColor(page)).toBe(dark.code);

    await page.reload();
    await expect(page.locator("body")).toHaveClass(/calcite-mode-light/);
  });
});

test("explanations scroll in their own panel, not the page", async ({ page }) => {
  await page.goto("/#styles");
  const page_ = await page.evaluate(() => ({ scroll: scrollY, overflow: document.documentElement.scrollHeight - innerHeight }));
  expect(page_).toEqual({ scroll: 0, overflow: 0 });
  expect(await page.locator("main.docs").evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test("dragging the splitter resizes the panels and is remembered", async ({ page }) => {
  await page.goto("/");
  const box = (await page.locator(".splitter").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, 300);
  await page.mouse.down();
  await page.mouse.move(900, 300, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => docsWidth(page)).toBeGreaterThan(880);

  await page.reload();
  await expect.poll(() => docsWidth(page)).toBeGreaterThan(880);
});

test("the splitter works with the keyboard without moving steps", async ({ page }) => {
  await page.goto("/#config");
  const before = await docsWidth(page);
  await page.locator(".splitter").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => docsWidth(page)).toBeGreaterThan(before);
  await expect(page).toHaveURL(/#config$/);
});

test.describe("high zoom", () => {
  // 1440×900 at 200 % browser zoom.
  test.use({ viewport: { width: 720, height: 450 } });

  test("stays usable: no page-level horizontal scroll, both panels visible", async ({ page }) => {
    await page.goto("/#oauth");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator("section.step#oauth h2")).toBeInViewport();
    await expect(page.locator('.code[data-file="main.js"] .line[data-focus]').first()).toBeInViewport();
    await expect(page.locator("#progress-bar")).toBeInViewport();
  });
});
