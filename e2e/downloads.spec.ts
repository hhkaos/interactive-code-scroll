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
  const folder = "framework-fixture-tutorial";
  expect(download.suggestedFilename()).toBe(`${folder}.zip`);
  const zip = (await download.path())!;
  const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n").sort();
  // .env.example ships through frontmatter include; state.json is gitignored in code/.gitignore.
  expect(listing).toEqual([
    `${folder}/.env.example`,
    `${folder}/README.md`,
    `${folder}/assets/pixel.png`,
    `${folder}/index.html`,
    `${folder}/main.js`,
    `${folder}/oauth-callback.html`,
    `${folder}/pages/signed-out.html`,
    `${folder}/report.py`,
    `${folder}/settings.json`,
    `${folder}/shared.js`,
    `${folder}/style.css`,
  ]);
  const png = execFileSync("unzip", ["-p", zip, `${folder}/assets/pixel.png`]);
  expect(png.equals(readFileSync("fixtures/framework-fixture/tutorial/code/assets/pixel.png"))).toBe(true);
  // The page itself, not the loader page preview/ serves for it.
  expect(execFileSync("unzip", ["-p", zip, `${folder}/pages/signed-out.html`], { encoding: "utf8" })).toContain('<p id="signed-out">');
  const report = execFileSync("unzip", ["-p", zip, `${folder}/report.py`], { encoding: "utf8" });
  expect(report).toContain('CLIENT_ID = "secret-id"');
  expect(report).toContain('MAX_RESULTS = 10\nVERBOSE = False\nREFERRER = ""\nPORTAL = "https://www.arcgis.com"');
  const settings = JSON.parse(execFileSync("unzip", ["-p", zip, `${folder}/settings.json`], { encoding: "utf8" }));
  expect(settings.report).toEqual({ maxResults: 10, verbose: false });
  expect(report).not.toMatch(/# region|@var/);
  const main = execFileSync("unzip", ["-p", zip, `${folder}/main.js`], { encoding: "utf8" });
  expect(main).toContain('const clientId = "secret-id";');
  expect(main).not.toMatch(/#region|@var/);
});
