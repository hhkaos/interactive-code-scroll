import { expect, test, type Page } from "./fixtures.ts";

const VIEWPORT = { x: 0, y: 0, width: 1440, height: 900 };
const maximized = (page: Page) => page.locator("body").getAttribute("data-maximized");
const box = (page: Page, selector: string) => page.locator(selector).boundingBox();
const splits = (page: Page) =>
  page.evaluate(() => ({
    docs: document.querySelector<HTMLElement>(".layout")!.style.getPropertyValue("--split"),
    preview: document.querySelector<HTMLElement>(".right")!.style.getPropertyValue("--preview-split"),
  }));

test("the code panel's icon maximizes it over the page; the icon and Esc restore the layout and its splitter sizes", async ({ page }) => {
  await page.goto("/#config");
  await page.locator(".layout .splitter").focus();
  await page.keyboard.press("Shift+ArrowRight");
  const before = await splits(page);
  const layoutBox = await box(page, ".code-panel");

  await page.locator("#code-maximize").click();
  await expect.poll(() => maximized(page)).toBe("code");
  expect(await box(page, ".code-panel")).toEqual(VIEWPORT);
  await expect(page.locator("#code-maximize")).toHaveAttribute("icon", "minimize");
  await expect(page.locator("#code-maximize")).toHaveAttribute("text", "Restore layout");

  await page.locator("#code-maximize").click();
  await expect.poll(() => maximized(page)).toBeNull();
  expect(await box(page, ".code-panel")).toEqual(layoutBox);
  await expect(page.locator("#code-maximize")).toHaveAttribute("text", "Maximize code");

  await page.locator("#code-maximize").click();
  await page.keyboard.press("Escape");
  await expect.poll(() => maximized(page)).toBeNull();
  expect(await splits(page)).toEqual(before);
  expect(await box(page, ".code-panel")).toEqual(layoutBox);
});

test("step keys keep moving steps while the code is maximized, and the code focus follows", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("#code-maximize").click();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#oauth$/);
  await expect(page.locator(".code:not([hidden]) .line[data-focus]").first()).toContainText("fixtureState");
  expect(await maximized(page)).toBe("code");
});

test("a step's images fill the window while the code area is maximized, with a restore action", async ({ page }) => {
  await page.goto("/#ui");
  await page.locator("#code-maximize").click();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#register-app$/);
  await expect(page.locator(".media-panel calcite-carousel")).toBeVisible();
  expect(await box(page, ".media-panel")).toEqual(VIEWPORT);
  await expect(page.locator("#media-restore")).toBeVisible();
  await page.locator("#media-restore").click();
  await expect.poll(() => maximized(page)).toBeNull();
  await expect(page.locator("#media-restore")).toBeHidden();
});

test("the Preview maximizes without reloading; a collapsed one expands; collapsing it restores the layout", async ({ page }) => {
  await page.goto("/#ui");
  const iframe = page.locator(".preview iframe");
  await expect(iframe).toHaveAttribute("src", /preview\//);
  await page.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.readyState === "complete");
  await page.evaluate(() => ((document.querySelector("iframe")!.contentWindow as Window & { marker?: number }).marker = 1));
  const codeBox = await box(page, ".code-panel");

  await page.locator("#preview-maximize").click();
  await expect.poll(() => maximized(page)).toBe("preview");
  expect(await box(page, "section.preview")).toEqual(VIEWPORT);
  expect(await page.evaluate(() => (document.querySelector("iframe")!.contentWindow as Window & { marker?: number }).marker)).toBe(1);
  // The code panel keeps its size underneath.
  expect(await box(page, ".code-panel")).toEqual(codeBox);

  await page.locator("#preview-toggle").click();
  await expect.poll(() => maximized(page)).toBeNull();
  await expect(page.locator(".preview-frame")).toBeHidden();

  await page.locator("#preview-maximize").click();
  await expect.poll(() => maximized(page)).toBe("preview");
  await expect(page.locator(".preview-frame")).toBeVisible();
});

test("Esc pressed inside the Preview restores the layout", async ({ page }) => {
  await page.goto("/#ui");
  await page.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.readyState === "complete");
  await page.locator("#preview-maximize").click();
  await page.frameLocator(".preview iframe").locator("body").click();
  await page.keyboard.press("Escape");
  await expect.poll(() => maximized(page)).toBeNull();
});

test("in presentation mode without browser full screen, Esc restores the pane first, then leaves presentation", async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error("denied"));
  });
  await page.goto("/#config");
  await page.locator("#present-toggle").click();
  // Away from the toolbar, whose tooltip covers the code header's end.
  await page.mouse.move(700, 450);
  await page.locator("#code-maximize").click();
  await page.keyboard.press("Escape");
  await expect.poll(() => maximized(page)).toBeNull();
  await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
});

test("a maximized pane is not remembered across reloads", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("#code-maximize").click();
  await expect.poll(() => maximized(page)).toBe("code");
  await page.reload();
  await expect(page.locator("#code-maximize")).toHaveAttribute("icon", "maximize");
  expect(await maximized(page)).toBeNull();
});
