import { expect, test, type Page } from "./fixtures.ts";

const focused = (page: Page) => page.locator(".code:not([hidden]) .line[data-focus]");

test("a JSON Pointer region focuses the member's lines of package.json", async ({ page }) => {
  await page.goto("/#install");
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "package.json");
  await expect(focused(page)).toHaveCount(4);
  await expect(focused(page).first()).toHaveText('  "dependencies": {');
  await expect(focused(page).nth(1)).toContainText('"express"');
  await expect(focused(page).last()).toHaveText("  }");
});

test("pointer and marker regions switch like any other region", async ({ page }) => {
  await page.goto("/#install");
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#start$/);
  await expect(focused(page)).toHaveCount(1);
  await expect(focused(page)).toHaveText('    "start": "node server.js"');
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#listen$/);
  await expect(page.locator(".code:not([hidden])")).toHaveAttribute("data-file", "server.js");
  await expect(focused(page)).toHaveCount(2);
  await expect(focused(page).first()).toContainText("const port = 3000;");
});
