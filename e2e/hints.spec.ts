import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/#oauth");
  await page.locator("#oauth .hint-label").first().scrollIntoViewIfNeeded();
});

test("switching hints before the close delay closes the previous popover", async ({ page }) => {
  const hints = page.locator("#oauth .hint");
  const first = hints.nth(0);
  const second = hints.nth(1);
  await first.locator(".hint-label").hover();
  await expect(first.locator(".hint-popover")).toHaveCSS("visibility", "visible");

  // Dispatch both events in one task so the 180 ms close timer cannot run between them.
  await hints.evaluateAll(([first, second]) => {
    first.dispatchEvent(new PointerEvent("pointerleave"));
    second.dispatchEvent(new PointerEvent("pointerenter"));
  });
  await expect(second.locator(".hint-popover")).toHaveCSS("visibility", "visible");
  await expect(first.locator(".hint-popover")).toHaveCSS("visibility", "hidden");

  await second.dispatchEvent("pointerleave");
  await expect(second.locator(".hint-popover")).toHaveCSS("visibility", "hidden");
});

test("focus switches hints and leaving focus closes the last popover", async ({ page }) => {
  const hints = page.locator("#oauth .hint");
  await hints.nth(0).locator(".hint-label").focus();
  await expect(hints.nth(0).locator(".hint-popover")).toHaveCSS("visibility", "visible");
  await hints.nth(1).locator(".hint-label").focus();
  await expect(hints.nth(0).locator(".hint-popover")).toHaveCSS("visibility", "hidden");
  await expect(hints.nth(1).locator(".hint-popover")).toHaveCSS("visibility", "visible");
  await hints.nth(1).locator(".hint-label").evaluate((label: HTMLButtonElement) => label.blur());
  await expect(hints.nth(1).locator(".hint-popover")).toHaveCSS("visibility", "hidden");
});

test("moving into rich hint content cancels its pending close", async ({ page }) => {
  const hint = page.locator("#oauth .hint").first();
  await hint.locator(".hint-label").hover();
  await hint.evaluate((hint) => {
    hint.dispatchEvent(new PointerEvent("pointerleave"));
    hint.querySelector(".hint-popover")!.dispatchEvent(new PointerEvent("pointerenter"));
  });
  // Wait past the close delay to verify the popover stays interactive.
  await page.waitForTimeout(250);
  await expect(hint.locator(".hint-popover")).toHaveCSS("visibility", "visible");
  await hint.getByRole("link", { name: "example docs" }).focus();
  await expect(hint.locator(".hint-popover")).toHaveCSS("visibility", "visible");
});
