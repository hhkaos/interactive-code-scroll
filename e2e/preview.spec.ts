import { expect, test, type Page } from "./fixtures.ts";

const frame = (page: Page) => page.frameLocator(".preview iframe");
const previewScript = (page: Page) => frame(page).locator("script:not([src])").last().textContent();

test("the iframe runs the code from a real same-origin preview URL", async ({ page, baseURL }) => {
  await page.goto("/#config");
  await expect(page.locator(".preview iframe")).toHaveAttribute("src", `${baseURL}/preview/?target=iframe`);
  await expect(frame(page).locator("arcgis-map")).toBeAttached();
  await expect.poll(() => previewScript(page)).toContain('const clientId = "YOUR_CLIENT_ID";');
});

test("form values reach the preview after the debounce, markers stripped", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').fill("preview-id");
  await expect.poll(() => previewScript(page), { timeout: 10_000 }).toContain('const clientId = "preview-id";');
  expect(await previewScript(page)).not.toContain("@var");
});

test("the preview can be collapsed and reopened", async ({ page }) => {
  await page.goto("/");
  await page.locator("#preview-toggle").click();
  await expect(page.locator(".preview")).toBeHidden();
  await page.locator("#preview-toggle").click();
  await expect(page.locator(".preview")).toBeVisible();
});

test("open in new tab shows the current code as a standalone page", async ({ page, context, baseURL }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').fill("tab-id");
  const [tab] = await Promise.all([context.waitForEvent("page"), page.locator("#preview-open").click()]);
  await expect(tab).toHaveURL(`${baseURL}/preview/?target=tab`);
  await expect(tab.locator("arcgis-map")).toBeAttached();
  expect(await tab.locator("script:not([src])").last().textContent()).toContain('"tab-id"');
});

test("clicker keys pressed inside the preview move the tutorial", async ({ page }) => {
  await page.goto("/#config");
  await expect(frame(page).locator("arcgis-map")).toBeAttached();
  await frame(page).locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#oauth$/);
});

test("code/ files are published next to the preview page, markers stripped", async ({ request }) => {
  const callback = await request.get("/preview/oauth-callback.html");
  expect(callback.status()).toBe(200);
  expect(callback.headers()["content-type"]).toContain("text/html");
  const html = await callback.text();
  expect(html).toContain("arcgis:auth:location:search");
  expect(html).not.toContain("#region");

  const main = await request.get("/preview/main.js");
  expect(main.headers()["content-type"]).toContain("text/javascript");
  expect(await main.text()).not.toContain("@var");
});

test.describe("with the real ArcGIS SDK (needs network)", () => {
  test.use({ network: true });

  test("sign-in from the iframe uses preview/oauth-callback.html as redirect_uri", async ({
    page,
    context,
    baseURL,
  }) => {
    test.slow();
    await page.goto("/#sign-in");
    const signIn = frame(page).locator("#sign-in");
    await expect(signIn).toBeAttached();
    await expect.poll(() => previewScript(page)).toContain("getCredential");
    await signIn.click();
    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      frame(page).locator(".esri-identity-modal calcite-button").getByText("OK").click(),
    ]);
    const url = new URL(popup.url());
    expect(url.searchParams.get("redirect_uri")).toBe(`${baseURL}/preview/oauth-callback.html`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});
