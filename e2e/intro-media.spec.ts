import { expect, test, type Page } from "./fixtures.ts";

// Tutorials with no code and `preview: off` (fixtures/framework-fixture-media): the intro shows media on load.
/** The image the carousel shows (small SVGs are inlined as data URIs: match the alt, which is the file name). */
const image = (page: Page) => page.locator(".media-panel calcite-carousel-item[selected] img.step-image");
const frame = (page: Page) => page.locator(".media-panel iframe.step-embed");
const frameHash = (page: Page) => frame(page).evaluate((f: HTMLIFrameElement) => f.contentWindow?.location.hash);
const marked = (page: Page) => frame(page).evaluate((f: HTMLIFrameElement) => (f.contentWindow as Window & { marked?: boolean }).marked);

test("the intro shows its own image on load and again when the reader returns", async ({ page }) => {
  await page.goto("/intro-images/");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(image(page)).toBeVisible();
  await expect(image(page)).toHaveAttribute("alt", "intro.svg");
  await expect(page.locator(".code-panel")).toBeHidden();

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#text-only$/);
  await expect(page.locator(".media-panel")).toBeHidden();
  await expect(page.locator(".code-panel")).toBeVisible();

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#step-image$/);
  await expect(image(page)).toHaveAttribute("alt", "step.svg");

  await page.keyboard.press("PageUp");
  await page.keyboard.press("PageUp");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(image(page)).toHaveAttribute("alt", "intro.svg");
});

test("intro and step embeds of the same page change the fragment without reloading", async ({ page }) => {
  await page.goto("/intro-embed/");
  await expect(frame(page)).toBeVisible();
  await expect.poll(() => frame(page).evaluate((f: HTMLIFrameElement) => f.contentDocument?.readyState === "complete")).toBe(true);
  expect(await frameHash(page)).toBe("#intro");
  // Marks the embed's window: a reload would drop it.
  await frame(page).evaluate((f: HTMLIFrameElement) => ((f.contentWindow as Window & { marked?: boolean }).marked = true));

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#first-slide$/);
  await expect.poll(() => frameHash(page)).toBe("#first");
  // The very same URL (fragment included) is left alone.
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#same-slide$/);
  await page.keyboard.press("PageUp");
  await page.keyboard.press("PageUp");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect.poll(() => frameHash(page)).toBe("#intro");
  expect(await marked(page)).toBe(true);
});

test("an intro without media shows the first step media, kept as is when that step activates", async ({ page }) => {
  await page.goto("/intro-fallback/");
  await expect(image(page)).toBeVisible();
  await expect(image(page)).toHaveAttribute("alt", "first.svg");
  await expect(page.locator(".code-panel")).toBeHidden();
  // Marks the carousel: a re-render would replace it.
  await page.locator(".media-panel calcite-carousel").evaluate((c) => c.setAttribute("data-marked", ""));

  await page.locator("#first-media h2").click();
  await expect(page).toHaveURL(/#first-media$/);
  await expect(page.locator(".media-panel calcite-carousel[data-marked]")).toHaveCount(1);
  // Step keys page through the step's images now.
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#first-media$/);
  await expect(image(page)).toHaveAttribute("alt", "second.svg");
});

test("step keys from an intro fallback move to the first step, even one without media", async ({ page }) => {
  await page.goto("/intro-fallback/");
  await expect(image(page)).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#text-only$/);
  await expect(page.locator(".media-panel")).toBeHidden();
  await expect(page.locator(".code-panel")).toBeVisible();
});

test("the intro shows its file with no focus on load and again when the reader returns", async ({ page }) => {
  const tabs = page.locator("calcite-tab-title[data-file]");
  const shown = page.locator(".code:not([hidden])");
  await page.goto("/intro-file/");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  // The intro's file comes first in the tabs (step order), and it is shown.
  await expect(tabs.first()).toHaveAttribute("data-file", "overview.js");
  await expect(shown).toHaveAttribute("data-file", "overview.js");
  await expect(page.locator(".code .line[data-focus]")).toHaveCount(0);

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#setup$/);
  await expect(shown).toHaveAttribute("data-file", "setup.js");
  await expect(shown.locator(".line[data-focus]")).not.toHaveCount(0);

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#text-only$/);
  await page.keyboard.press("PageUp");
  await page.keyboard.press("PageUp");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(shown).toHaveAttribute("data-file", "overview.js");
  await expect(page.locator(".code .line[data-focus]")).toHaveCount(0);
});
