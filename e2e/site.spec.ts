import { expect, test } from "./fixtures.ts";

// The project website (site/): landing page under the Pages base path, with the
// REST geocoding tutorial built into showcase/ and embedded as the live demo.

const BASE = "/interactive-code-scroll/";
const demo = (page: import("./fixtures.ts").Page) => page.frameLocator(".browser iframe");

test("internal links carry the base path and resolve", async ({ page, request }) => {
  await page.goto(BASE);
  await expect(page.locator("h1")).toContainText("move with your story");
  const hrefs = await page.locator("a[href^='/'], img[src^='/']").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href") ?? element.getAttribute("src") ?? ""),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of new Set(hrefs)) {
    expect(href.startsWith(BASE), href).toBe(true);
    expect((await request.get(href.split("#")[0]!)).status(), href).toBe(200);
  }
});

test("the live demo embeds the tutorial on the request step and follows the page theme", async ({ page }) => {
  await page.goto(BASE);
  await page.locator("#demo").scrollIntoViewIfNeeded();
  const frame = demo(page);
  await expect(frame.locator(".result-badge")).toHaveText("Captured · output/geocode.json");
  await expect(frame.locator("body")).toHaveClass(/calcite-mode-dark/);

  await page.locator("#theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(frame.locator("body")).toHaveClass(/calcite-mode-light/);
});

test("the create command can be copied", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(BASE);
  const button = page.locator(".hero [data-copy]");
  await button.click();
  await expect(button).toContainText("Copied!");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm create interactive-code-scroll@latest");
});

test("phones get a screenshot link instead of the embedded demo, without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE);
  await expect(page.locator(".browser .viewport")).toBeHidden();
  await expect(page.locator(".browser .fallback")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});
