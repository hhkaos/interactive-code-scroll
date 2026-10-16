import { expect, test, type Page } from "./fixtures.ts";

const box = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);

test.describe("portrait phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("stacks the code above the explanations, without desktop-only controls", async ({ page }) => {
    await page.goto("/#config");
    const right = await box(page, "aside.right");
    const docs = await box(page, ".docs-column");
    expect(right.bottom).toBeLessThanOrEqual(docs.top + 2);
    expect(docs.width).toBeGreaterThan(380);
    await expect(page.locator(".step-nav")).toBeVisible();
    for (const hidden of [".layout .splitter", "#docs-toggle", "#present-toggle", "#copy-file", "#download-file", ".zip-action", ".preview-frame"]) {
      await expect(page.locator(hidden)).toBeHidden();
    }
    await expect(page.locator("#code-maximize")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("the Preview header opens the Preview maximized and restores the layout", async ({ page }) => {
    await page.goto("/#config");
    await page.locator("#preview-toggle").click();
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "preview");
    await expect(page.locator(".preview-frame")).toBeVisible();
    await page.locator("#preview-toggle").click();
    await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
    await expect(page.locator(".preview-frame")).toBeHidden();
  });

  test("scrolling the explanations activates steps", async ({ page }) => {
    await page.goto("/#load-sdk");
    const docs = await box(page, "main.docs");
    await page.mouse.move(docs.x + docs.width / 2, docs.y + docs.height / 2);
    await page.mouse.wheel(0, 600);
    await expect(page).not.toHaveURL(/#load-sdk$/);
    await expect(page.locator("section.step[data-active]")).not.toHaveId("load-sdk");
  });
});

test.describe("narrow phone", () => {
  // Narrow enough to clip the fixture's title (no logo and a smaller font on phones).
  test.use({ viewport: { width: 200, height: 700 }, hasTouch: true });

  test("tapping a clipped title shows it in full; a title that fits does nothing", async ({ page }) => {
    await page.goto("/#config");
    const title = page.locator("#header-title");
    await expect(title).toHaveAttribute("data-clipped", "");
    await title.locator("h1").click();
    await expect(page.locator("#title-popover")).toHaveAttribute("open", "");
    await expect(page.locator("#title-popover")).toContainText("Framework Fixture Tutorial");

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(title).not.toHaveAttribute("data-clipped");
    await expect(page.locator("#title-popover")).not.toHaveAttribute("open");
  });
});

test.describe("landscape phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test("keeps the panels side by side; the Preview keeps only its header", async ({ page }) => {
    await page.goto("/#config");
    const right = await box(page, "aside.right");
    const docs = await box(page, ".docs-column");
    expect(docs.right).toBeLessThanOrEqual(right.left + 1);
    await expect(page.locator(".preview-frame")).toBeHidden();
    await expect(page.locator("#preview-toggle")).toBeVisible();
    await expect(page.locator("#copy-file")).toBeHidden();
  });
});
