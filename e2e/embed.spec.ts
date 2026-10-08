import { expect, test } from "./fixtures.ts";

const frame = (page: import("@playwright/test").Page) => page.locator(".media-panel iframe.step-embed");

test("an embed step shows its page from embeds/ instead of code", async ({ page }) => {
  await page.goto("/#embed-slides");
  await expect(frame(page)).toBeVisible();
  await expect(page.locator(".code-panel")).toBeHidden();
  await expect(frame(page)).toHaveAttribute("sandbox", "allow-scripts allow-popups allow-forms allow-same-origin allow-modals");
  await expect.poll(() => frame(page).evaluate((f: HTMLIFrameElement) => f.contentWindow?.location.hash)).toBe("#/2");
  await expect(page.locator("#embed-open")).toBeVisible();

  await page.goto("/#config");
  await expect(page.locator(".code-panel")).toBeVisible();
  await expect(frame(page)).toHaveCount(0);
  await expect(page.locator("#embed-open")).toBeHidden();
});

test("the next slide of the same deck navigates in place, and clicker keys inside it move steps", async ({ page }) => {
  await page.goto("/#embed-slides");
  const loaded = () => frame(page).evaluate((f: HTMLIFrameElement) => f.contentDocument?.readyState === "complete");
  await expect.poll(loaded).toBe(true);
  // Marks the embed's window: a reload would drop it.
  await frame(page).evaluate((f: HTMLIFrameElement) => ((f.contentWindow as Window & { marked?: boolean }).marked = true));

  // Focus inside the embed: PageDown is forwarded to the tutorial, not handled by the deck.
  await frame(page).click();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#embed-next-slide$/);
  await expect.poll(() => frame(page).evaluate((f: HTMLIFrameElement) => f.contentWindow?.location.hash)).toBe("#/3");
  expect(await frame(page).evaluate((f: HTMLIFrameElement) => (f.contentWindow as Window & { marked?: boolean }).marked)).toBe(true);

  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/#embed-slides$/);
  await expect.poll(() => frame(page).evaluate((f: HTMLIFrameElement) => f.contentWindow?.location.hash)).toBe("#/2");
});

test("an embed fills the window when maximized, with its actions on top", async ({ page }) => {
  await page.goto("/#embed-slides");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("ics:maximize", { detail: "code" })));
  const viewport = page.viewportSize()!;
  expect(await page.locator(".media-panel").boundingBox()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  await expect(page.locator("#media-restore")).toBeVisible();
  await expect(page.locator("#embed-open")).toBeVisible();
  await page.locator("#media-restore").click();
  await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
});
