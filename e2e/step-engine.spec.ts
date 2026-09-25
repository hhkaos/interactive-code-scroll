import { expect, test, type Page } from "./fixtures.ts";

const focused = (page: Page) => page.locator(".code:not([hidden]) .line[data-focus]");

test("a deep link activates its step, file and region", async ({ page }) => {
  await page.goto("/#oauth");
  await expect(page.locator("section.step#oauth")).toHaveAttribute("data-active", "");
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "main.js");
  await expect(focused(page).first()).toContainText("$arcgis.import");
  await expect(page.locator("#step-count")).toHaveText("Step 5 of 8");
  await expect(page.locator("#progress-bar")).toHaveJSProperty("value", 62.5);
  await expect(page).toHaveURL(/#oauth$/);
});

test("keyboard and clicker keys move between steps", async ({ page }) => {
  await page.goto("/#sign-in");
  await expect(focused(page).first()).toContainText("signInButton");
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#styles$/);
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "style.css");
  await page.keyboard.press("ArrowUp");
  await expect(page).toHaveURL(/#sign-in$/);
});

test("the focused region keeps its colors; the rest of the file turns gray", async ({ page }) => {
  await page.goto("/#oauth");
  const colors = (selector: string) =>
    page.locator(`.code[data-file="main.js"] ${selector} span`).evaluateAll((spans) => [
      ...new Set(spans.filter((s) => s.textContent!.trim()).map((s) => getComputedStyle(s).color)),
    ]);
  // Polled: colors transition when the focus changes.
  await expect.poll(async () => (await colors(".line:not([data-focus])")).length).toBe(1);
  expect((await colors(".line[data-focus]")).length).toBeGreaterThan(1);
});

test("in-page links to a step center and activate it", async ({ page }) => {
  await page.goto("/#config");
  await page.evaluate(() => (location.hash = "#sign-in"));
  await expect(page.locator("section.step#sign-in")).toHaveAttribute("data-active", "");
  await expect(focused(page).first()).toContainText("signInButton");
});

test("a deep link stays centered while the layout settles, until the user scrolls", async ({ page }) => {
  await page.goto("/#oauth");
  await expect(page.locator("section.step#oauth")).toHaveAttribute("data-active", "");
  // A late layout shift above the step (as when Calcite renders after fetching its translations).
  await page.locator("section.step#load-sdk").evaluate((el) => (el.style.paddingTop = "600px"));
  await expect(page.locator("section.step#oauth h2")).toBeInViewport();
  await expect(page).toHaveURL(/#oauth$/);
});

test("scrolling activates the step crossing the center line", async ({ page }) => {
  await page.goto("/");
  // Any user input (here a wheel tick) hands scrolling over from the deep-link restore.
  await page.locator("main.docs").hover();
  await page.mouse.wheel(0, 10);
  await page.evaluate(() => document.getElementById("config")!.scrollIntoView({ block: "center" }));
  await expect(page).toHaveURL(/#config$/);
  await expect(focused(page)).toHaveCount(2);
});

test("step keys page through a carousel before leaving the step", async ({ page }) => {
  // What the carousel shows (its own selectedItem), not just the items' `selected` flags.
  const shown = () =>
    page.locator(".media-panel calcite-carousel").evaluate((c: HTMLElement & { selectedItem?: Element }) =>
      c.selectedItem?.getAttribute("label"),
    );
  await page.goto("/#register-app");
  await expect(page.locator(".media-panel calcite-carousel")).toBeVisible();
  await expect(page.locator(".code-panel")).toBeHidden();
  await expect.poll(shown).toBe("oauth-step-1.svg");

  await page.keyboard.press("ArrowDown");
  await expect.poll(shown).toBe("oauth-step-2.svg");
  await expect(page).toHaveURL(/#register-app$/);

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#config$/);
  await expect(page.locator(".code-panel")).toBeVisible();

  // Backwards: enter at the last image, then page back to the first, then leave.
  await page.keyboard.press("ArrowUp");
  await expect(page).toHaveURL(/#register-app$/);
  await expect.poll(shown).toBe("oauth-step-2.svg");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(shown).toBe("oauth-step-1.svg");
  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/#ui$/);
});

test("typing in a field does not move steps", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').press("ArrowDown");
  await expect(page).toHaveURL(/#config$/);
});

test("file tabs switch the visible file", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-tab-title[data-file="index.html"]').click();
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "index.html");
});
