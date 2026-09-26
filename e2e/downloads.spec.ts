import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').fill("secret-id");
});

test("copies the visible file with form values and without markers", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#copy-file").click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('const clientId = "secret-id";');
  expect(text).not.toMatch(/#region|@var/);
  await expect(page.locator("#copy-file")).toHaveAttribute("icon", "check");
});

test("downloads the visible file", async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-file").click()]);
  expect(download.suggestedFilename()).toBe("main.js");
  const text = readFileSync((await download.path())!, "utf8");
  expect(text).toContain('const clientId = "secret-id";');
  expect(text).not.toMatch(/#region|@var/);
});

test("downloads the project as a ZIP with form values applied", async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-zip").click()]);
  const folder = "user-authentication-with-the-arcgis-maps-sdk-for-javascript";
  expect(download.suggestedFilename()).toBe(`${folder}.zip`);
  const zip = (await download.path())!;
  const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n").sort();
  expect(listing).toEqual([
    `${folder}/index.html`,
    `${folder}/main.js`,
    `${folder}/oauth-callback.html`,
    `${folder}/style.css`,
  ]);
  const main = execFileSync("unzip", ["-p", zip, `${folder}/main.js`], { encoding: "utf8" });
  expect(main).toContain('const clientId = "secret-id";');
  expect(main).not.toMatch(/#region|@var/);
});
