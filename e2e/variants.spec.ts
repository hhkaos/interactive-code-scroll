import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "./fixtures.ts";

const shown = (page: Page) => page.locator(".code:not([hidden])");
const focused = (page: Page) => page.locator(".code:not([hidden]) .line[data-focus]");
const tabs = (page: Page) => page.locator("calcite-tab-nav:not([hidden]) calcite-tab-title");
const pick = (page: Page, id: string) => page.locator(`#variant-switcher calcite-segmented-control-item[value="${id}"]`).click();

test("the first variant is active by default and shows only its own tabs", async ({ page }) => {
  await page.goto("/#config");
  await expect(shown(page)).toHaveAttribute("data-file", "python/request.py");
  await expect(tabs(page)).toHaveText(["request.py", "requirements.txt"]);
  await expect(focused(page).first()).toContainText("FIXTURE_TOKEN");
});

test("switching keeps the step and focuses the same region in the new variant's file", async ({ page }) => {
  await page.goto("/#request");
  await expect(focused(page).first()).toContainText('print(get("/items"))');
  await pick(page, "node");
  await expect(shown(page)).toHaveAttribute("data-file", "node/api.mjs");
  await expect(tabs(page)).toHaveText(["index.mjs", "config.mjs", "api.mjs"]);
  await expect(focused(page).first()).toContainText("listItems");
  await expect(page.locator("section.step#request")).toHaveAttribute("data-active", "");
  await expect(page).toHaveURL(/\?variant=node#request$/);
});

test("the choice is remembered, and ?variant= wins over it", async ({ page }) => {
  await page.goto("/#config");
  await pick(page, "curl");
  await page.goto("/#config");
  await expect(shown(page)).toHaveAttribute("data-file", "curl/request.sh");
  await page.goto("/?variant=node#config");
  await expect(shown(page)).toHaveAttribute("data-file", "node/config.mjs");
  await page.goto("/?variant=rust#config");
  await expect(shown(page)).toHaveAttribute("data-file", "curl/request.sh");
});

test("a step for other variants shows a notice that switches to them", async ({ page }) => {
  await page.goto("/?variant=node#request");
  await page.locator("section.step#flags h2").click();
  const notice = page.locator("#variant-notice");
  await expect(notice).toHaveJSProperty("open", true);
  await expect(notice.locator("[slot=message]")).toHaveText("This step applies to cURL.");
  await expect(shown(page)).toHaveAttribute("data-file", "node/api.mjs");
  await expect(focused(page)).toHaveCount(0);

  await notice.locator("[slot=link]").click();
  await expect(page).toHaveURL(/\?variant=curl#flags$/);
  await expect(notice).toHaveJSProperty("open", false);
  await expect(focused(page).first()).toContainText("--silent");
});

test("a notice lists every variant of the step", async ({ page }) => {
  await page.goto("/?variant=curl#client");
  await expect(page.locator("#variant-notice [slot=message]")).toHaveText("This step applies to Python and Node.js.");
  await expect(page.locator("#variant-notice [slot=link]")).toHaveText("Switch to Python");
});

test("a text-only step keeps the matching file, else the new variant's entry", async ({ page }) => {
  await page.goto("/#deps");
  await expect(shown(page)).toHaveAttribute("data-file", "python/requirements.txt");
  await page.locator("section.step#summary h2").click();
  await pick(page, "node");
  await expect(shown(page)).toHaveAttribute("data-file", "node/index.mjs");
});

test("a form value updates the var in every variant", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="fixtureToken"] input').fill("MY_TOKEN");
  await page.locator('calcite-input[data-var="fixtureToken"] [data-reveal]').click();
  await pick(page, "curl");
  await expect(shown(page).locator('[data-var="fixtureToken"]')).toHaveText("MY_TOKEN");
});

test("the switcher becomes a dropdown when the tabs would get too little room, and back", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });
  await page.goto("/#request");
  const segmented = page.locator("#variant-switcher");
  const dropdown = page.locator("#variant-dropdown");
  await expect(dropdown).toBeVisible();
  await expect(segmented).toBeHidden();

  await dropdown.locator("calcite-button").click();
  await dropdown.locator('calcite-dropdown-item[data-variant="node"]').click();
  await expect(shown(page)).toHaveAttribute("data-file", "node/api.mjs");
  await expect(dropdown.locator("calcite-button")).toHaveText("Node.js");

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(segmented).toBeVisible();
  await expect(dropdown).toBeHidden();
  await expect(segmented.locator('calcite-segmented-control-item[value="node"]')).toHaveJSProperty("checked", true);
});

test("the ZIP holds the active variant's folder, with form values and files not shown in tabs", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="fixtureToken"] input').fill("zip-token");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-zip").click()]);
  const folder = "variants-fixture-tutorial-python";
  expect(download.suggestedFilename()).toBe(`${folder}.zip`);
  const zip = (await download.path())!;
  const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n").sort();
  expect(listing).toEqual([`${folder}/request.py`, `${folder}/requirements.txt`, `${folder}/util.py`]);
  expect(execFileSync("unzip", ["-p", zip, `${folder}/request.py`], { encoding: "utf8" })).toContain('FIXTURE_TOKEN = "zip-token"');
});

test("the ZIP badge and tooltip count the active variant's files", async ({ page }) => {
  await page.goto("/#config");
  await expect(page.locator(".zip-action")).toHaveAttribute("data-count", "3");
  await expect(page.locator("#download-zip")).toHaveAttribute("text", "Download project (ZIP) · 3 files (1 not shown in tabs)");
  await pick(page, "curl");
  await expect(page.locator(".zip-action")).toHaveAttribute("data-count", "1");
  await expect(page.locator("#download-zip")).toHaveAttribute("text", "Download project (ZIP) · 1 file");
});

test("only web variants show the Preview, which runs from the variant's own page", async ({ page, baseURL }) => {
  await page.goto("/#request");
  await expect(page.locator("section.preview")).toBeHidden();
  await pick(page, "web");
  await expect(page.locator("section.preview")).toBeVisible();
  const iframe = page.locator(".preview iframe");
  if (!(await iframe.isVisible())) await page.locator("#preview-toggle").click();
  await expect(iframe).toHaveAttribute("src", `${baseURL}/preview/web/index.html?target=iframe`);
  const output = page.frameLocator(".preview iframe").locator("#output");
  await expect(output).toHaveText("https://api.fixture.test/v1/items?token=DEMO_TOKEN");

  await page.locator('calcite-input[data-var="fixtureToken"] input').fill("live-token");
  await expect(output).toHaveText("https://api.fixture.test/v1/items?token=live-token", { timeout: 10_000 });
  await pick(page, "node");
  await expect(page.locator("section.preview")).toBeHidden();
});
