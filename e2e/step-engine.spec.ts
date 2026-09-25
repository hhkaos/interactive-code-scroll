import { expect, test, type Page } from "./fixtures.ts";

const focused = (page: Page) => page.locator(".code:not([hidden]) .line[data-focus]");

/** The focused region is fully inside the code pane, or (taller than the pane) starts at its top. */
const regionShown = (page: Page) =>
  page.evaluate(() => {
    const pane = document.querySelector(".code:not([hidden])")!;
    const lines = [...pane.querySelectorAll(".line[data-focus]")];
    const box = pane.getBoundingClientRect();
    const top = lines[0]!.getBoundingClientRect().top;
    const bottom = lines.at(-1)!.getBoundingClientRect().bottom;
    return bottom - top <= pane.clientHeight ? top >= box.top && bottom <= box.bottom : Math.abs(top - box.top) < 40;
  });

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

test("clicking a step activates it", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("section.step#load-sdk h2").click();
  await expect(page.locator("section.step#load-sdk")).toHaveAttribute("data-active", "");
  await expect(page).toHaveURL(/#load-sdk$/);
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "index.html");
  // Clicks on a step's own controls (here a field of another step) keep their meaning only.
  await page.locator('calcite-input[data-var="clientId"] input').click();
  await expect(page).toHaveURL(/#load-sdk$/);
  // Anywhere else in the step counts.
  await page.locator("section.step#config").click({ position: { x: 5, y: 5 } });
  await expect(page).toHaveURL(/#config$/);
});

test("each step shows its whole code region when it fits", async ({ page }) => {
  await page.goto("/#load-sdk");
  for (const id of ["ui", "register-app", "config", "oauth", "callback", "sign-in", "styles"]) {
    await page.keyboard.press("PageDown");
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    if (id === "register-app") {
      // Images, no code: page through the rest of the carousel.
      const images = await page.locator(".media-panel calcite-carousel-item").count();
      for (let i = 1; i < images; i++) await page.keyboard.press("PageDown");
      continue;
    }
    await expect.poll(() => regionShown(page), { message: id }).toBe(true);
  }
});

test("scrolling back to the top activates the first step", async ({ page }) => {
  await page.goto("/#oauth");
  await page.locator("main.docs").hover();
  await page.mouse.wheel(0, -5000);
  await expect(page.locator("section.step#load-sdk")).toHaveAttribute("data-active", "");
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
  await expect.poll(shown).toBe("credential-type-user-alp.png");

  await page.keyboard.press("ArrowDown");
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
  await page.keyboard.press("ArrowLeft");
  await expect.poll(shown).toBe("credential-type-user-alp.png");
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
