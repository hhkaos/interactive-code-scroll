import { expect, test, type Page } from "./fixtures.ts";

const tokenColor = (page: Page) =>
  page.locator('.code[data-file="main.js"] [data-var="clientId"]').evaluate((el) => getComputedStyle(el).color);
const docsBackground = (page: Page) => page.locator("main.docs").evaluate((el) => getComputedStyle(el).backgroundColor);
const previewColorScheme = (page: Page) =>
  page.locator(".preview iframe").evaluate((el) => getComputedStyle(el).colorScheme);
const docsWidth = (page: Page) => page.locator("main.docs").evaluate((el) => el.getBoundingClientRect().width);

test.describe("theme", () => {
  test.use({ colorScheme: "dark" });

  test("defaults to the OS preference; the toggle switches UI and code, and is remembered", async ({ page }) => {
    await page.goto("/#ui");
    await expect(page.locator("body")).toHaveClass(/calcite-mode-dark/);
    const dark = { docs: await docsBackground(page), code: await tokenColor(page) };

    await page.locator("#theme-toggle").click();
    await expect(page.locator("body")).toHaveClass(/calcite-mode-light/);
    await expect.poll(() => docsBackground(page)).not.toBe(dark.docs);
    await expect.poll(() => tokenColor(page)).not.toBe(dark.code);

    await page.reload();
    await expect(page.locator("body")).toHaveClass(/calcite-mode-light/);
  });
});

test.describe("preview theme", () => {
  test("the preview iframe color-scheme follows the page mode", async ({ page }) => {
    await page.goto("/#ui");
    await expect(page.locator("body")).toHaveClass(/calcite-mode-light/);
    await expect.poll(() => previewColorScheme(page)).toContain("light");
    await page.locator("#theme-toggle").click();
    await expect.poll(() => previewColorScheme(page)).toContain("dark");
  });
});

test("explanations scroll in their own panel, not the page", async ({ page }) => {
  await page.goto("/#styles");
  const page_ = await page.evaluate(() => ({ scroll: scrollY, overflow: document.documentElement.scrollHeight - innerHeight }));
  expect(page_).toEqual({ scroll: 0, overflow: 0 });
  expect(await page.locator("main.docs").evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test("dragging the splitter resizes the panels and is remembered", async ({ page }) => {
  await page.goto("/#ui");
  const box = (await page.locator(".splitter").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, 300);
  await page.mouse.down();
  await page.mouse.move(900, 300, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => docsWidth(page)).toBeGreaterThan(880);
  // The explanations reflow while resizing; the active step must not change.
  await expect(page).toHaveURL(/#ui$/);
  await expect(page.locator("section.step#ui")).toHaveAttribute("data-active", "");

  await page.reload();
  await expect.poll(() => docsWidth(page)).toBeGreaterThan(880);
  await expect(page).toHaveURL(/#ui$/);
});

test("dragging the preview splitter resizes the preview and is remembered", async ({ page }) => {
  await page.goto("/#ui");
  const previewHeight = () => page.locator(".preview").evaluate((el) => el.getBoundingClientRect().height);
  const before = await previewHeight();
  const box = (await page.locator(".preview-splitter").boundingBox())!;
  await page.mouse.move(700, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(700, box.y - 200, { steps: 5 });
  await page.mouse.up();
  await expect.poll(previewHeight).toBeGreaterThan(before + 150);

  await page.reload();
  await expect.poll(previewHeight).toBeGreaterThan(before + 150);
  // Keyboard too, without moving steps.
  const resized = await previewHeight();
  await page.locator(".preview-splitter").focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(previewHeight).toBeLessThan(resized);
  await expect(page).toHaveURL(/#ui$/);
});

test("the explanations handle shows on the splitter on hover or focus, and stays when they are hidden", async ({ page }) => {
  await page.goto("/#config");
  const handle = page.locator("#docs-toggle");
  const gutter = (await page.locator(".gutter").boundingBox())!;
  const box = (await handle.boundingBox())!;
  expect(box.x).toBeLessThan(gutter.x);
  expect(box.x + box.width).toBeGreaterThan(gutter.x + gutter.width);
  // Hidden (and not in the way of a drag) until the pointer is on the splitter; fades out after a delay.
  await expect(handle).toBeHidden();
  await page.locator(".layout .splitter").hover({ position: { x: 2, y: 40 } });
  await expect(handle).toBeVisible();
  await expect(handle).toHaveCSS("opacity", "1");
  await page.mouse.move(gutter.x - 200, gutter.y + 40);
  await expect(handle).toBeHidden();
  // Keyboard: focusing the splitter shows it at once, and Tab reaches it.
  await page.locator(".layout .splitter").focus();
  await expect(handle).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(handle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main.docs")).toBeHidden();
  // The only way back: a thin rail at the left edge, always shown; the whole rail is the handle.
  await page.mouse.move(gutter.x + 400, gutter.y + 40);
  await expect(handle).toBeVisible();
  const rail = (await page.locator(".gutter").boundingBox())!;
  expect(rail.x).toBe(0);
  expect(rail.width).toBeLessThanOrEqual(17);
  expect((await page.locator("aside.right").boundingBox())!.x).toBeGreaterThanOrEqual(rail.x + rail.width);
  await page.mouse.click(rail.x + rail.width / 2, rail.y + 20);
  await expect(page.locator("main.docs")).toBeVisible();
  // A pointer click leaves no focus (no ring), so the handle fades out with the pointer.
  await expect(handle).not.toBeFocused();
  await page.mouse.move(gutter.x + 400, gutter.y + 40);
  await expect(handle).toBeHidden();
});

test("the splitter works with the keyboard without moving steps", async ({ page }) => {
  await page.goto("/#config");
  const before = await docsWidth(page);
  await page.locator(".splitter").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => docsWidth(page)).toBeGreaterThan(before);
  await expect(page).toHaveURL(/#config$/);
});

test("code wrapping can be enabled by tutorial frontmatter", async ({ page }) => {
  await page.goto("/#config");
  await expect(page.locator("body")).toHaveAttribute("data-code-wrap", "");

  const pane = page.locator('.code[data-file="main.js"]');
  const overflow = await pane.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const longLineHeight = await pane
    .locator(".line", { hasText: "deliberately long fixture line" })
    .evaluate((line) => line.getBoundingClientRect().height);
  const firstLineHeight = await pane.locator(".line").first().evaluate((line) => line.getBoundingClientRect().height);
  expect(longLineHeight).toBeGreaterThan(firstLineHeight * 1.5);

  const blankLine = pane.locator('.line[data-line="3"]');
  const afterBlankLine = pane.locator('.line[data-line="4"]');
  const blankLineBox = await blankLine.evaluate((line) => {
    const rect = line.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  });
  const afterBlankLineTop = await afterBlankLine.evaluate((line) => line.getBoundingClientRect().top);
  expect(blankLineBox.height).toBeGreaterThan(firstLineHeight * 0.8);
  expect(afterBlankLineTop).toBeGreaterThanOrEqual(blankLineBox.bottom);
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

test("the layout keeps its hydrated geometry before Calcite loads", async ({ page, browser, baseURL }) => {
  const boxes = (p: Page) =>
    p.evaluate(() =>
      ["calcite-navigation", ".layout", "#copy-file"].map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return [s, Math.round(r.top), Math.round(r.height)];
      }),
    );
  await page.goto("/");
  await expect(page.locator("calcite-navigation")).toHaveAttribute("calcite-hydrated", "");
  await expect(page.locator("#copy-file")).toHaveAttribute("calcite-hydrated", "");
  const hydrated = await boxes(page);

  // Without scripts the components never hydrate: the page as it looks before they load.
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: page.viewportSize() });
  const unhydrated = await context.newPage();
  await unhydrated.goto("/");
  expect(await boxes(unhydrated)).toEqual(hydrated);
  await context.close();
});
