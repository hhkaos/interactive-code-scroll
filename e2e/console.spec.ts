import { expect, test } from "./fixtures.ts";

test("Preview interactions produce expandable snapshots, retained across tabs, steps and collapse", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/#ui");
  const app = page.frameLocator(".preview iframe");
  await app.locator("#sign-in").click();
  await page.getByRole("tab", { name: /^Console/ }).click();
  const entry = page.locator(".console-entry").filter({ hasText: "getSelf()" });
  await expect(entry).toHaveCount(1);
  const line = await page.locator('.code[data-file="main.js"] .line').filter({ hasText: 'console.log("getSelf()"' }).getAttribute("data-line");
  await expect(entry.locator(".console-source")).toHaveText(`main.js:${line}`);
  await expect(entry.locator(".console-label")).toHaveText("getSelf()");
  expect(await entry.locator(".json-tree").evaluate((tree) => getComputedStyle(tree).listStyleType)).toBe("none");
  const colors = await entry.evaluate((row) => ({
    key: getComputedStyle(row.querySelector(".jt-key")!).color,
    string: getComputedStyle(row.querySelector(".jt-str")!).color,
    number: getComputedStyle(row.querySelector(".jt-num")!).color,
  }));
  expect(colors).toEqual({ key: "rgb(136, 19, 145)", string: "rgb(196, 26, 22)", number: "rgb(28, 0, 207)" });
  await expect(entry).toContainText('user: {…}, name: "Example organization"');
  const root = entry.getByRole("treeitem").first();
  await expect(root).toHaveAttribute("aria-expanded", "false");
  await expect(root.locator(":scope > .jt-row > .jt-when-open")).toBeHidden();
  await expect(root.locator(":scope > .jt-row > .jt-when-closed").first()).toBeVisible();
  await root.click();
  await expect(root).toHaveAttribute("aria-expanded", "true");
  await expect(entry).toContainText('"runs": 1');
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(app.locator("#sign-in")).toHaveText("Run 1");

  // Real author syntax selects Console and expands it; the same iframe and log remain.
  await page.evaluate(() => { location.hash = "#sign-in"; });
  await expect(page.getByRole("tab", { name: /^Console/ })).toHaveAttribute("aria-selected", "true");
  await expect(entry).toHaveCount(1);
  await page.locator("#preview-toggle").click();
  await expect(page.locator(".preview-frame")).toBeHidden();
  await page.locator("#preview-toggle").click();
  await expect(entry).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(app.locator("#sign-in")).toHaveText("Run 1");
});

test("Console handles all levels safely, ignores foreign messages, clears and resets on Run", async ({ page }) => {
  await page.goto("/#sign-in");
  await expect(page.frameLocator(".preview iframe").locator("#sign-in")).toBeAttached();
  await page.locator(".preview iframe").evaluate((element) => {
    const win = (element as HTMLIFrameElement).contentWindow!;
    const object: Record<string, unknown> = { html: '<img src=x onerror="alert(1)">' };
    object.self = object;
    win.console.info("Information", object);
    win.console.warn("Warning", 3, true, null);
    win.console.error("Error", new Error("fixture failure"));
    win.console.log("Order", [1, { nested: 2 }]);
    window.postMessage({ type: "ics:console", level: "log", args: '["FORGED"]' }, location.origin);
  });
  const rows = page.locator(".console-entry");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toHaveAttribute("data-level", "info");
  await expect(rows.nth(1)).toHaveAttribute("data-level", "warn");
  await expect(rows.nth(2)).toHaveAttribute("data-level", "error");
  await expect(page.locator("#preview-console img")).toHaveCount(0);
  await rows.nth(0).getByRole("treeitem").first().click();
  await expect(rows.nth(0)).toContainText("[Circular]");
  await expect(rows.nth(0)).toContainText("<img");
  await page.locator(".console-devtools summary").click();
  await page.locator("#preview-console-clear").click();
  await expect(rows).toHaveCount(0);
  await expect(page.locator("#preview-console-empty")).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.frameLocator(".preview iframe").locator("#sign-in").click();
  await page.getByRole("tab", { name: /^Console/ }).click();
  await expect(rows).toHaveCount(1);
  await page.locator("#preview-run").click();
  await expect(rows).toHaveCount(0);
});

test("Console tabs and trees support keyboard navigation and maximize the selected view", async ({ page }) => {
  await page.goto("/#sign-in");
  await page.getByRole("tab", { name: /^Console/ }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Preview", exact: true })).toBeFocused();
  await page.frameLocator(".preview iframe").locator("#sign-in").click();
  await page.getByRole("tab", { name: /^Console/ }).click();
  const root = page.locator(".console-entry").getByRole("treeitem").first();
  await root.focus();
  await page.keyboard.press("ArrowRight");
  await expect(root).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/#sign-in$/);
  await page.locator("#preview-maximize").click();
  await expect(page.locator("body")).toHaveAttribute("data-maximized", "preview");
  await expect(page.locator("#preview-console")).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(page.frameLocator(".preview iframe").locator("#sign-in")).toHaveText("Run 1");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
});

test("Console retention is bounded and background logs continue while the panel is collapsed", async ({ page }) => {
  await page.goto("/#sign-in");
  await expect(page.frameLocator(".preview iframe").locator("#sign-in")).toBeAttached();
  await page.locator("#preview-toggle").click();
  await page.locator(".preview iframe").evaluate((element) => {
    const win = (element as HTMLIFrameElement).contentWindow!;
    for (let i = 0; i < 205; i++) win.console.log(`message ${i}`);
  });
  await expect(page.locator(".console-entry")).toHaveCount(200);
  await expect(page.locator(".console-entry").first()).toContainText("message 5");
  await page.locator("#preview-toggle").click();
  await expect(page.locator("#preview-console-count")).toHaveText("(200+)");
});


test("a step can select and maximize Console with the public panel API", async ({ page }) => {
  await page.goto("/#ui");
  await page.frameLocator(".preview iframe").locator("#sign-in").click();
  await page.locator("section.step#sign-in").evaluate((step) => { (step as HTMLElement).dataset.maximize = "panel"; });
  await page.evaluate(() => { location.hash = "#sign-in"; });
  await expect(page.locator("body")).toHaveAttribute("data-maximized", "preview");
  await expect(page.getByRole("tab", { name: /^Console/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".console-entry")).toContainText("getSelf()");
});


test("the Console explains how to inspect native messages in browser DevTools", async ({ page }) => {
  await page.goto("/#sign-in");
  await expect(page.locator("#preview-console-clear")).toBeHidden();
  await page.getByText("This is a snapshot. View the output in browser DevTools.", { exact: true }).click();
  await expect(page.locator(".console-devtools")).toContainText("Selected context only");
  const position = await page.locator("#preview-console").evaluate((panel) => ({
    help: panel.querySelector(".console-devtools")!.getBoundingClientRect().top,
    messages: panel.querySelector(".console-messages")!.getBoundingClientRect().bottom,
  }));
  expect(position.help).toBeGreaterThanOrEqual(position.messages - 1);
  await expect(page.getByRole("link", { name: "Chrome Console guide" })).toHaveAttribute("href", "https://developer.chrome.com/docs/devtools/console/reference#context");
});


test("inline HTML logs keep the line numbers of the displayed HTML code", async ({ page }) => {
  await page.goto("/#sign-in");
  await expect(page.frameLocator(".preview iframe").locator("#sign-in")).toBeAttached();
  await page.locator(".preview iframe").evaluate((element) => {
    (element as HTMLIFrameElement).contentDocument!.dispatchEvent(new Event("fixture:inline-log"));
  });
  const line = await page.locator('.code[data-file="index.html"] .line').filter({ hasText: 'console.log("Inline script"' }).getAttribute("data-line");
  await expect(page.locator(".console-entry .console-source")).toHaveText(`index.html:${line}`);
});
