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
  await expect(focused(page).first()).toContainText("fixtureState");
  await expect(page.locator("#step-count")).toHaveText("Step 5 of 10");
  const bar = page.locator("#progress-bar");
  await expect(bar).toHaveAttribute("aria-valuenow", "5");
  await expect(bar).toHaveAttribute("aria-valuetext", "Step 5 of 10");
  await expect(bar.locator('[data-state="seen"]')).toHaveCount(4);
  await expect(bar.locator('[data-state="current"]')).toHaveCount(1);
  await expect(bar.locator('[data-state="pending"]')).toHaveCount(5);
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

test("going back to the intro clears the active step and focused region", async ({ page }) => {
  await page.goto("/#load-sdk");
  await expect(focused(page)).toHaveCount(1);
  await page.keyboard.press("ArrowUp");
  await expect(page).not.toHaveURL(/#/);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(focused(page)).toHaveCount(0);
  await expect(page.locator(".code[data-has-focus]")).toHaveCount(0);
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
  // Dispatched: the field is off screen, and scrolling it into view would activate steps by scroll.
  await page.locator('calcite-input[data-var="clientId"] input').dispatchEvent("click");
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
    const region = await page.locator(`section.step#${id}`).getAttribute("data-region");
    if (region) await expect.poll(() => regionShown(page), { message: id }).toBe(true);
    else await expect(focused(page)).toHaveCount(0);
  }
});

test("scrolling back to the top returns to the intro", async ({ page }) => {
  await page.goto("/#oauth");
  await page.locator("main.docs").hover();
  await page.mouse.wheel(0, -10_000);
  await expect.poll(() => page.locator("main.docs").evaluate((docs) => docs.scrollTop)).toBe(0);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(page).not.toHaveURL(/#/);
});

test("step keys enter the first step from the intro", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await page.keyboard.press("PageDown");
  await expect(page.locator("section.step#load-sdk")).toHaveAttribute("data-active", "");
  await expect(page).toHaveURL(/#load-sdk$/);
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
  await expect.poll(shown).toBe("fixture-one.svg");

  await page.keyboard.press("ArrowDown");
  await expect.poll(shown).toBe("fixture-two.svg");
  await page.keyboard.press("ArrowDown");
  await expect.poll(shown).toBe("fixture-three.svg");
  await expect(page).toHaveURL(/#register-app$/);

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#config$/);
  await expect(page.locator(".code-panel")).toBeVisible();

  // Backwards: enter at the last image, then page back to the first, then leave.
  await page.keyboard.press("ArrowUp");
  await expect(page).toHaveURL(/#register-app$/);
  await expect.poll(shown).toBe("fixture-three.svg");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(shown).toBe("fixture-two.svg");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(shown).toBe("fixture-one.svg");
  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/#ui$/);
});

test("Back / Next move like the step keys, carousel images first", async ({ page }) => {
  const back = page.locator("#step-back");
  const next = page.locator("#step-next");
  const shown = () =>
    page.locator(".media-panel calcite-carousel").evaluate((c: HTMLElement & { selectedItem?: Element }) =>
      c.selectedItem?.getAttribute("label"),
    );
  await page.goto("/");
  await expect(page.locator("#step-position")).toHaveText("10 steps");
  await expect(back).toHaveAttribute("disabled", "");
  await next.click();
  await expect(page).toHaveURL(/#load-sdk$/);
  await expect(page.locator("#step-position")).toHaveText("1 / 10");
  await expect(back).not.toHaveAttribute("disabled");
  await back.click();
  await expect(page).not.toHaveURL(/#/);

  await page.goto("/#register-app");
  await expect.poll(shown).toBe("fixture-one.svg");
  await next.click();
  await expect.poll(shown).toBe("fixture-two.svg");
  await expect(page).toHaveURL(/#register-app$/);
  await back.click();
  await back.click();
  await expect(page).toHaveURL(/#ui$/);

  await page.goto("/#embed-next-slide");
  await expect(page.locator("#step-position")).toHaveText("10 / 10");
  await expect(next).toHaveText("Finish");
  await expect(next).not.toHaveAttribute("disabled");
});

test("Finish opens the closing panel; Back and scrolling up return to the last step", async ({ page }) => {
  const next = page.locator("#step-next");
  const panel = page.locator(".completion");
  await page.goto("/#embed-next-slide");
  await next.click();
  await expect(page.locator("#step-position")).toHaveText("Done");
  await expect(page.locator("body")).toHaveAttribute("data-completed", "");
  await expect(next).toHaveAttribute("disabled", "");
  // The progress bar is full on the closing panel.
  await expect(page.locator('#progress-bar > :not([data-state="seen"])')).toHaveCount(0);
  await expect(panel).toBeInViewport();
  await expect(page.locator("#completion-heading")).toBeFocused();
  await expect(page.locator("#completion-heading")).toHaveText("You've completed Framework Fixture Tutorial");
  // The last step stays active underneath (for the code panel), but the panel carries the active marking.
  await expect(page.locator("section.step#embed-next-slide")).toHaveAttribute("data-active", "");
  await expect(page.locator("section.step#embed-next-slide")).toHaveCSS("box-shadow", "none");
  await expect(panel).toHaveCSS("box-shadow", /inset/);

  await page.locator("#step-back").click();
  await expect(page.locator("#step-position")).toHaveText("10 / 10");
  await expect(page.locator("body")).not.toHaveAttribute("data-completed");
  await expect(page.locator("section.step#embed-next-slide")).toHaveCSS("box-shadow", /inset/);
  await expect(panel).toHaveCSS("box-shadow", "none");
  await expect(next).toHaveText("Finish");

  // Step keys do the same.
  await page.keyboard.press("PageDown");
  await expect(page.locator("#step-position")).toHaveText("Done");
  await page.keyboard.press("PageUp");
  await expect(page.locator("#step-position")).toHaveText("10 / 10");
});

test("the closing panel holds the <Outro> and the code, Preview and feedback actions", async ({ page }) => {
  const panel = page.locator(".completion");
  await page.goto("/");
  // The <Outro> content moves from the end of the explanations into the panel, before the actions.
  await expect(panel.locator(".completion-outro .outro")).toBeVisible();
  await expect(panel.locator(".completion-outro strong")).toHaveText("Markdown");
  await expect(page.locator(".docs > .outro")).toHaveCount(0);
  // Single tutorial: no next tutorial and no index.
  await expect(panel.locator(".completion-next")).toHaveCount(0);
  await expect(panel.locator("calcite-button")).toHaveText(["Download code", "Open preview", "Send feedback"]);
  await expect(panel.locator("calcite-button", { hasText: "Send feedback" })).toHaveAttribute(
    "href",
    "https://github.com/example/fixture/issues/new?title=Framework%20Fixture%20Tutorial&body=",
  );
  const download = page.waitForEvent("download");
  await panel.locator("#completion-zip").click();
  expect((await download).suggestedFilename()).toBe("framework-fixture-tutorial.zip");
});

test("clicking a carousel image opens it large; step keys page it; leaving the step closes it", async ({ page }) => {
  const dialog = page.locator("#image-viewer");
  await page.goto("/#register-app");
  await page.locator(".media-panel .step-image").first().click();
  await expect(dialog).toHaveAttribute("open", "");
  await expect(dialog.locator("img")).toHaveAttribute("alt", "fixture-one.svg");
  await expect(dialog).toHaveJSProperty("heading", "fixture-one.svg (1 of 3)");
  const size = (await dialog.locator("img").boundingBox())!;
  expect(size.width).toBeGreaterThan(1200);

  await page.keyboard.press("PageDown");
  await expect(dialog.locator("img")).toHaveAttribute("alt", "fixture-two.svg");
  await page.keyboard.press("PageDown");
  await page.keyboard.press("PageDown");
  await expect(dialog).not.toHaveAttribute("open", "");
  await expect(page).toHaveURL(/#config$/);
});

test("Esc closes the image viewer", async ({ page }) => {
  await page.goto("/#register-app");
  await page.locator(".media-panel .step-image").first().click();
  await expect(page.locator("#image-viewer img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#image-viewer")).not.toHaveAttribute("open", "");
});

test("the last step and the closing panel are reachable by scrolling, with no more blank room than needed", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("main.docs").hover();
  await page.mouse.wheel(0, 10_000);
  // Scrolling to the closing panel completes the tutorial; the last step stays active underneath.
  await expect(page.locator("section.step#embed-next-slide")).toHaveAttribute("data-active", "");
  await expect(page.locator("#step-position")).toHaveText("Done");
  const room = await page.locator("main.docs").evaluate((docs) => {
    const last = docs.querySelector(".completion")!;
    const below = docs.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
    return { below, half: docs.clientHeight / 2 };
  });
  expect(room.below).toBeLessThanOrEqual(room.half);
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

test("steps that switch to another file name it in a chip on their heading", async ({ page }) => {
  await page.goto("/");
  const chips = page.locator("section.step .step-file");
  await expect(chips).toHaveText(["main.js", "oauth-callback.html", "main.js", "style.css"]);
  await expect(page.locator("section.step#config > h2 > .step-file")).toHaveAttribute("aria-hidden", "true");
  // Same file as the step before it, or images: no chip.
  await expect(page.locator("section.step#oauth .step-file, section.step#register-app .step-file")).toHaveCount(0);
});

test("a step's switch to another file is announced and animated; a deep link is not", async ({ page }) => {
  await page.goto("/#ui");
  await expect(page.locator(".file-announcer")).toHaveText("");
  await expect(page.locator("calcite-tab-title[data-entering]")).toHaveCount(0);
  await page.locator("section.step#config h2").click();
  await expect(page.locator(".file-announcer")).toHaveText("Showing main.js");
  await expect(page.locator(".file-announcer")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator('calcite-tab-title[data-file="main.js"]')).toHaveAttribute("data-entering", "");
  // The one-shot transitions clean up after themselves.
  await expect(page.locator("[data-entering]")).toHaveCount(0);
  expect(await regionShown(page)).toBe(true);
});
