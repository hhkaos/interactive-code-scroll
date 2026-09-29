import { expect, mockService, test, type Page } from "./fixtures.ts";

// Smoke tests for examples/rest-geocode: the public REST tutorial must keep working
// with the runner, captured outputs and the ArcGIS error rule. The service is mocked;
// fixtures.ts blocks every other external host.

const GEOCODE = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates**";
const CANDIDATES = '{ "candidates": [{ "address": "Live St", "score": 100 }] }';

const badge = (page: Page) => page.locator(".result-badge");
const body = (page: Page) => page.locator(".result-body");
const runButton = (page: Page) => page.locator("#result-run");
const requestLine = (page: Page) => page.locator(".result-request-line");
const tokenInput = (page: Page) => page.locator('calcite-input[data-var="accessToken"] input');

for (const variant of ["curl", "python", "node"]) {
  test(`the ${variant} variant shows the request region and the captured candidates`, async ({ page }) => {
    await page.goto(`/?variant=${variant}#request`);
    await expect(page.locator('.code:not([hidden]) .line[data-regions~="request"][data-focus]').first()).toBeVisible();
    await expect(badge(page)).toHaveText("Captured · output/geocode.json");
    await expect(body(page).getByRole("tree", { name: "JSON output/geocode.json" })).toContainText('"candidates"');
  });
}

test("GET sends the token in the query string, masked in the request line", async ({ page }) => {
  const calls = await mockService(page, GEOCODE, { body: CANDIDATES });
  await page.goto("/#request");
  await tokenInput(page).fill("my token");
  await expect(requestLine(page)).toContainText("&token=••••••••");
  await runButton(page).click();
  await expect(badge(page)).toHaveText(/^Live · 200( OK)? · \d+ ms$/);
  expect(calls).toHaveLength(1);
  const url = new URL(calls[0].url);
  expect(url.searchParams.get("singleLine")).toBe("380 New York St, Redlands, CA");
  expect(url.searchParams.get("token")).toBe("my token");
  await expect(body(page).getByRole("tree", { name: "JSON response of geocode-get" })).toContainText('"Live St"');
});

test("each request step runs only what its code shows: GET in the query, POST with the token in a header", async ({ page }) => {
  await page.goto("/#request");
  await expect(page.locator("#result-run-as")).toBeHidden();

  const calls = await mockService(page, GEOCODE, { body: CANDIDATES });
  for (const [variant, file] of [["curl", "geocode-post.sh"], ["python", "geocode_post.py"], ["node", "geocode-post.mjs"]]) {
    await page.goto(`/?variant=${variant}#header`);
    await expect(page.locator(`.code[data-file="${variant}/${file}"] .line[data-regions~="header-auth"][data-focus]`).first()).toBeVisible();
  }
  await tokenInput(page).fill("my-token");
  await expect(requestLine(page)).not.toContainText("token");
  await runButton(page).click();
  await expect(badge(page)).toHaveAttribute("data-state", "live");
  expect(calls).toMatchObject([{ method: "POST", url: GEOCODE.replace("**", "") }]);
  expect(calls[0].headers["x-esri-authorization"]).toBe("Bearer my-token");
  expect(calls[0].headers["content-type"]).toBe("application/x-www-form-urlencoded");
  expect(new URLSearchParams(calls[0].body ?? "").get("singleLine")).toBe("380 New York St, Redlands, CA");
});

test("an invalid token (error 498 in an HTTP 200 body) is explained from requests/errors.json", async ({ page }) => {
  await mockService(page, GEOCODE, { body: '{ "error": { "code": 498, "message": "Invalid Token", "details": [] } }' });
  await page.goto("/#errors");
  await runButton(page).click();
  await expect(badge(page)).toHaveText("Error 498 · HTTP 200");
  const message = page.locator("#result-error [slot=message]");
  await expect(message).toContainText("The access token is expired, revoked or mistyped.");
  await expect(message.locator("calcite-link")).toHaveAttribute("href", /rest-authentication-operations/);
});

test("with the service unreachable the step falls back to its captured output", async ({ page }) => {
  await page.goto("/?variant=python#request");
  await runButton(page).click();
  await expect(page.locator("#result-notice [slot=message]")).toContainText("network error");
  await expect(badge(page)).toHaveText("Captured (fallback) · output/geocode.json");
});
