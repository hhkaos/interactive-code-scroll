import { expect, mockService, test, type Page } from "./fixtures.ts";

const result = (page: Page) => page.locator("section.result");
const badge = (page: Page) => page.locator(".result-badge");
const body = (page: Page) => page.locator(".result-body");
const pick = (page: Page, id: string) => page.locator(`#variant-switcher calcite-segmented-control-item[value="${id}"]`).click();

test("non-web variants show the Result pane in the Preview's place, with an empty state before any output", async ({ page }) => {
  await page.goto("/#config");
  await expect(result(page)).toBeVisible();
  await expect(page.locator("section.preview")).toBeHidden();
  await expect(badge(page)).toBeHidden();
  await expect(body(page)).toContainText("No result yet");
  await pick(page, "web");
  await expect(result(page)).toBeHidden();
  await expect(page.locator("section.preview")).toBeVisible();
});

test("a step's captured JSON output is shown as a text-only tree, with the variant's override first", async ({ page }) => {
  await page.goto("/#request");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
  const tree = body(page).getByRole("tree", { name: "JSON output/request.json" });
  await expect(tree).toContainText('"note": "<b>shown as text</b>"');
  await expect(body(page).locator("b")).toHaveCount(0);
  await expect(tree.locator(".jt-key", { hasText: '"note"' })).toBeVisible();
  await expect(tree.locator(".jt-str", { hasText: "shown as text" })).toBeVisible();
  await pick(page, "curl");
  await expect(badge(page)).toHaveText("Captured · output/curl/request.json");
  await expect(body(page)).toContainText('"source": "curl override"');
  await pick(page, "node");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
});

test("steps without an output keep the last result, also on a deep link", async ({ page }) => {
  await page.goto("/#summary");
  await expect(badge(page)).toHaveText("Captured · output/deps.png");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#deps")).toHaveAttribute("data-active", "");
  await page.keyboard.press("ArrowUp");
  // "flags" is cURL-only: Python readers keep the result of the step before it.
  await expect(page.locator("#flags")).toHaveAttribute("data-active", "");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
});

test("text outputs look like a colored terminal and images are shown as images", async ({ page }) => {
  await page.goto("/?variant=curl#flags");
  await expect(badge(page)).toHaveText("Captured · output/flags.log");
  const terminal = body(page).locator("pre.result-terminal");
  await expect(terminal).toContainText("$ sh request.sh");
  // Prompt lines and ANSI colors become colored text; escape codes are not shown.
  await expect(terminal.locator(".term-prompt")).toHaveText("$ ");
  await expect(terminal.locator(".term-command")).toHaveText("sh request.sh\n");
  await expect(terminal.locator(".term-green")).toHaveText("200 OK");
  await expect(terminal).not.toContainText("[32m");
  await page.goto("/?variant=python#deps");
  const image = body(page).locator("img.result-image");
  await expect(image).toHaveAttribute("alt", "Captured output deps.png");
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(8);
});

test("the Result pane collapses to its header and keeps its content", async ({ page }) => {
  await page.goto("/#request");
  await page.locator("#result-toggle").click();
  await expect(page.locator(".result-frame")).toBeHidden();
  await expect(badge(page)).toBeVisible();
  await page.locator("#result-toggle").click();
  await expect(body(page)).toContainText('"items"');
});

const treeItem = (page: Page, text: string) =>
  body(page).getByRole("treeitem").filter({ has: page.locator(":scope > .jt-row:first-child", { hasText: text }) });

test("the JSON tree starts collapsed below two levels and toggles on click", async ({ page }) => {
  await page.goto("/#request");
  const owner = treeItem(page, '"owner"');
  await expect(owner).toHaveAttribute("aria-expanded", "false");
  await expect(owner).toContainText("3 keys");
  await expect(treeItem(page, '"items"')).toHaveAttribute("aria-expanded", "true");
  await owner.locator(".jt-row").first().click();
  await expect(owner).toHaveAttribute("aria-expanded", "true");
  await expect(treeItem(page, '"active": true')).toBeVisible();
  // Numbers keep their source text: no rounding past 2^53.
  await expect(owner.locator(".jt-num", { hasText: "9007199254740993" })).toBeVisible();
});

test("the JSON tree follows tree keyboard semantics and keeps arrows from moving steps", async ({ page }) => {
  await page.goto("/#request");
  await body(page).getByRole("treeitem").first().focus();
  for (const key of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown"]) await page.keyboard.press(key);
  const owner = treeItem(page, '"owner"');
  await expect(owner).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(owner).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(treeItem(page, '"id": 9007199254740993')).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(owner).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(owner).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press(" ");
  await expect(owner).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Home");
  await expect(body(page).getByRole("treeitem").first()).toBeFocused();
  await expect(page.locator("#request")).toHaveAttribute("data-active", "");
});

test("long JSON arrays show 100 entries and a Show more action", async ({ page }) => {
  await page.goto("/#request");
  const ids = treeItem(page, '"ids"');
  const entries = ids.locator(':scope > [role="group"] > [role="treeitem"]');
  await expect(entries).toHaveCount(100);
  await ids.getByRole("button", { name: "Show more (5 remaining)" }).click();
  await expect(entries).toHaveCount(105);
  await expect(entries.nth(100)).toBeFocused();
  await expect(ids.getByRole("button")).toBeHidden();
  await expect(entries.last()).toHaveText("105");
});

const API = "https://api.fixture.test/v1/**";
const runButton = (page: Page) => page.locator("#result-run");
const requestLine = (page: Page) => page.locator(".result-request-line");
const tokenInput = (page: Page) => page.locator('calcite-input[data-var="fixtureToken"] input');

/** Answers the fixture API (and its CORS preflight); returns the requests it got. */
const mockApi = (page: Page, reply: Parameters<typeof mockService>[2] = {}) =>
  mockService(page, API, { body: '{ "items": ["live"] }', ...reply });

test("request steps show a Run button; activating steps never sends a request", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/#config");
  await expect(runButton(page)).toBeHidden();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#request")).toHaveAttribute("data-active", "");
  await expect(runButton(page)).toBeVisible();
  await expect(requestLine(page)).toHaveText("GET https://api.fixture.test/v1/items?token=DEMO_TOKEN");
  await expect(page.locator(".result-request-source")).toHaveText("requests/items.http · list-items");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
  await page.keyboard.press("ArrowDown");
  expect(calls).toEqual([]);
});

test("Run sends the request with query values URL-encoded and shows the live response as text", async ({ page }) => {
  const calls = await mockApi(page, { body: '{ "note": "<b>live</b>" }' });
  await page.goto("/#request");
  await tokenInput(page).fill("a b&c");
  await runButton(page).click();
  await expect(badge(page)).toHaveText(/^Live · 200( OK)? · \d+ ms$/);
  await expect(badge(page)).toHaveAttribute("data-state", "live");
  expect(calls).toMatchObject([{ method: "GET", url: "https://api.fixture.test/v1/items?token=a%20b%26c", body: null }]);
  await expect(body(page).getByRole("tree", { name: "JSON response of list-items" })).toContainText('"note": "<b>live</b>"');
  await expect(body(page).locator("b")).toHaveCount(0);
});

test("secret values are masked in the request line until Show secrets, which is not remembered", async ({ page }) => {
  await page.goto("/#request");
  await expect(page.locator("#result-reveal")).toBeHidden();
  await tokenInput(page).fill("s3cret");
  await expect(requestLine(page)).toHaveText("GET https://api.fixture.test/v1/items?token=••••••");
  await page.locator("#result-reveal").click();
  await expect(requestLine(page)).toHaveText("GET https://api.fixture.test/v1/items?token=s3cret");
  await page.reload();
  await tokenInput(page).fill("s3cret");
  await expect(requestLine(page)).toHaveText("GET https://api.fixture.test/v1/items?token=••••••");
});

test("Run as switches to the step's other request, which gets values as is in its body", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/#request");
  const runAs = page.locator("#result-run-as");
  await expect(runAs.locator("calcite-segmented-control-item")).toHaveText(["GET", "POST"]);
  await tokenInput(page).fill("a b&c");
  await runAs.locator('calcite-segmented-control-item[value="list-items-post"]').click();
  await expect(requestLine(page)).toHaveText("POST https://api.fixture.test/v1/items");
  await runButton(page).click();
  await expect(badge(page)).toHaveAttribute("data-state", "live");
  expect(calls).toMatchObject([{ method: "POST", url: "https://api.fixture.test/v1/items", body: '{ "token": "a b&c" }' }]);
});

test("a network failure falls back to the captured output and says so", async ({ page }) => {
  await page.route(API, (route) => route.abort());
  await page.goto("/#request");
  await runButton(page).click();
  await expect(page.locator("#result-notice")).toHaveAttribute("open", "");
  await expect(page.locator("#result-notice [slot=message]")).toHaveText(
    "Live request failed: network error (offline or blocked by CORS). Showing the captured output instead.",
  );
  await expect(badge(page)).toHaveText("Captured (fallback) · output/request.json");
  await expect(body(page).getByRole("tree", { name: "JSON output/request.json" })).toBeVisible();
});

test("a request with no answer is aborted after 30 s; without captured output only the notice shows", async ({ page }) => {
  await page.clock.install();
  await page.route(API, () => {});
  await page.goto("/?variant=node#create");
  await expect(badge(page)).toBeHidden();
  await runButton(page).click();
  await expect(badge(page)).toHaveText("Sending…");
  await page.clock.runFor(30_000);
  await expect(page.locator("#result-notice [slot=message]")).toHaveText(
    "Live request failed: no response after 30 s. This step has no captured output.",
  );
  await expect(body(page)).toContainText("No result yet");
});

test("a live response is dropped when another result is shown, unless the reader keeps it", async ({ page }) => {
  await mockApi(page);
  await page.goto("/?variant=curl#request");
  await runButton(page).click();
  await expect(badge(page)).toHaveAttribute("data-state", "live");
  await page.locator("section.step#flags h2").click();
  await expect(badge(page)).toHaveText("Captured · output/flags.log");
  await page.locator("section.step#request h2").click();
  await expect(badge(page)).toHaveText("Captured · output/curl/request.json");

  await runButton(page).click();
  await page.locator("#result-keep").click();
  await expect(badge(page)).toHaveText(/^Kept · 200/);
  await expect(page.locator("#result-keep")).toBeHidden();
  await page.locator("section.step#flags h2").click();
  await page.locator("section.step#request h2").click();
  await expect(badge(page)).toHaveText(/^Kept · 200/);
  await expect(body(page)).toContainText('"live"');
  await page.locator("#result-captured").click();
  await expect(badge(page)).toHaveText("Captured · output/curl/request.json");
  await page.locator("section.step#flags h2").click();
  await page.locator("section.step#request h2").click();
  await expect(badge(page)).toHaveText("Captured · output/curl/request.json");
});

test("a long request line wraps instead of hiding the query string", async ({ page }) => {
  await page.goto("/#request");
  await tokenInput(page).fill("x".repeat(160));
  await page.locator("#result-reveal").click();
  const line = requestLine(page);
  await expect(line).toHaveText(`GET https://api.fixture.test/v1/items?token=${"x".repeat(160)}`);
  const { height, lineHeight, overflows } = await line.evaluate((el) => ({
    height: el.clientHeight,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    overflows: el.scrollWidth > el.clientWidth,
  }));
  expect(height).toBeGreaterThan(lineHeight * 1.5);
  expect(overflows).toBe(false);
});

const errorNotice = (page: Page) => page.locator("#result-error");
const tabTitle = (page: Page, name: string) => page.locator(`#result-tabs calcite-tab-title[data-tab="${name}"]`);

test("a service error in an HTTP 200 body is shown as a failure, explained from requests/errors.json", async ({ page }) => {
  await mockApi(page, { body: '{ "error": { "code": 498, "message": "Invalid token.", "details": [] } }' });
  await page.goto("/#request");
  await expect(errorNotice(page)).not.toHaveAttribute("open");
  await runButton(page).click();
  await expect(badge(page)).toHaveText("Error 498 · HTTP 200");
  await expect(badge(page)).toHaveAttribute("data-state", "error");
  await expect(errorNotice(page)).toHaveAttribute("open", "");
  const message = errorNotice(page).locator("[slot=message]");
  await expect(message).toHaveText(
    "498 · Invalid token. HTTP 200, but the body holds an error object. The token is expired, revoked or mistyped. Learn more",
  );
  await expect(message.locator("calcite-link")).toHaveAttribute("href", "https://docs.fixture.test/errors#498");
  await expect(body(page).getByRole("tree", { name: "JSON response of list-items" })).toContainText('"message": "Invalid token."');
  await page.locator("#result-captured").click();
  await expect(errorNotice(page)).not.toHaveAttribute("open");
  await expect(badge(page)).toHaveText("Captured · output/request.json");
});

test("the error rule also explains non-2xx bodies, with the fallback link for unknown codes", async ({ page }) => {
  await mockApi(page, { status: 400, body: '{ "error": { "code": "E42", "message": "Bad input" } }' });
  await page.goto("/#request");
  await runButton(page).click();
  await expect(badge(page)).toHaveText("Error E42 · HTTP 400");
  const message = errorNotice(page).locator("[slot=message]");
  await expect(message).toHaveText("E42 · Bad input Error code reference");
  await expect(message.locator("calcite-link")).toHaveAttribute("href", "https://docs.fixture.test/errors");
});

test("the Headers tab lists the headers the server exposes through CORS; captured output has no tabs", async ({ page }) => {
  await mockApi(page, { headers: { "X-Exposed": "yes", "X-Hidden": "no", "Access-Control-Expose-Headers": "X-Exposed" } });
  await page.goto("/#request");
  await expect(page.locator("#result-tabs")).toBeHidden();
  await runButton(page).click();
  await expect(badge(page)).toHaveAttribute("data-state", "live");
  await expect(page.locator("#result-tabs")).toBeVisible();
  await expect(tabTitle(page, "body")).toHaveAttribute("selected", "");
  await tabTitle(page, "headers").click();
  await expect(tabTitle(page, "headers")).toHaveAttribute("selected", "");
  await expect(tabTitle(page, "body")).not.toHaveAttribute("selected");
  // The code panel's file tabs are not affected.
  await expect(page.locator(".code:not([hidden])")).toHaveCount(1);
  const table = body(page).getByRole("table", { name: "Response headers of list-items" });
  await expect(table.getByRole("row", { name: "x-exposed yes" })).toBeVisible();
  await expect(table).toContainText("content-type");
  await expect(table).not.toContainText("x-hidden");
  await expect(body(page)).toContainText("Only headers the server exposes to the browser through CORS");
  // The chosen tab stays for the next run.
  await runButton(page).click();
  await expect(body(page).getByRole("table")).toBeVisible();
  await tabTitle(page, "body").click();
  await expect(body(page).getByRole("tree")).toBeVisible();
  await page.locator("#result-captured").click();
  await expect(page.locator("#result-tabs")).toBeHidden();
});

test("image responses are shown as images; long text is cut until Show all", async ({ page }) => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  await mockApi(page, { body: png, headers: { "Content-Type": "image/png" } });
  await page.goto("/#request");
  await runButton(page).click();
  const image = body(page).getByRole("img", { name: "Response image of list-items" });
  await expect(image).toHaveAttribute("src", /^blob:/);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);

  await page.unrouteAll();
  const text = `${"a".repeat(200 * 1024)}END`;
  await mockApi(page, { body: text, headers: { "Content-Type": "text/plain" } });
  await runButton(page).click();
  const pre = body(page).locator("pre.result-response");
  await expect(body(page)).toContainText("Showing the first 200 KB of 201 KB.");
  expect(await pre.evaluate((el) => el.textContent!.length)).toBe(200 * 1024);
  await body(page).getByRole("button", { name: "Show all (201 KB)" }).click();
  expect(await pre.evaluate((el) => el.textContent!.endsWith("END"))).toBe(true);
  await expect(body(page).locator(".result-more")).toHaveCount(0);
});
