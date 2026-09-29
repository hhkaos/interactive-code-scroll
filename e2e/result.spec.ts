import { expect, test, type Page } from "./fixtures.ts";

const result = (page: Page) => page.locator("section.result");
const badge = (page: Page) => page.locator(".result-badge");
const body = (page: Page) => page.locator(".result-body");
const pick = (page: Page, id: string) => page.locator(`#variant-switcher calcite-segmented-control-item[value="${id}"]`).click();

test("non-web variants show the Result pane in the Preview's place, with an empty state before any output", async ({ page }) => {
  await page.goto("/#config");
  await expect(result(page)).toBeVisible();
  await expect(page.locator("section.preview")).toBeHidden();
  await expect(badge(page)).toBeHidden();
  await expect(body(page)).toContainText("No result yet");
  await pick(page, "web");
  await expect(result(page)).toBeHidden();
  await expect(page.locator("section.preview")).toBeVisible();
});

test("a step's captured JSON output is shown as text, with the variant's override first", async ({ page }) => {
  await page.goto("/#request");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
  await expect(body(page).locator("pre.result-json")).toContainText('"note": "<b>shown as text</b>"');
  await expect(body(page).locator("b")).toHaveCount(0);
  await pick(page, "curl");
  await expect(badge(page)).toHaveText("Captured · output/curl/request.json");
  await expect(body(page)).toContainText('"source": "curl override"');
  await pick(page, "node");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
});

test("steps without an output keep the last result, also on a deep link", async ({ page }) => {
  await page.goto("/#summary");
  await expect(badge(page)).toHaveText("Captured · output/deps.png");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#deps")).toHaveAttribute("data-active", "");
  await page.keyboard.press("ArrowUp");
  // "flags" is cURL-only: Python readers keep the result of the step before it.
  await expect(page.locator("#flags")).toHaveAttribute("data-active", "");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
});

test("text outputs look like a terminal and images are shown as images", async ({ page }) => {
  await page.goto("/?variant=curl#flags");
  await expect(badge(page)).toHaveText("Captured · output/flags.log");
  await expect(body(page).locator("pre.result-terminal")).toContainText("$ sh request.sh");
  await page.goto("/?variant=python#deps");
  const image = body(page).locator("img.result-image");
  await expect(image).toHaveAttribute("alt", "Captured output deps.png");
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(8);
});

test("the Result pane collapses to its header and keeps its content", async ({ page }) => {
  await page.goto("/#request");
  await page.locator("#result-toggle").click();
  await expect(page.locator(".result-frame")).toBeHidden();
  await expect(badge(page)).toBeVisible();
  await page.locator("#result-toggle").click();
  await expect(body(page)).toContainText('"items"');
});
