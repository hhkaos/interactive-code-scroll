import { expect, test, type Page } from "./fixtures.ts";

/** Drags across the first `width` pixels of the step's first paragraph. */
async function dragSelect(page: Page, step: string, width: number) {
  const box = (await page.locator(`#${step} p`).first().boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + width, box.y + 8, { steps: 5 });
  await page.mouse.up();
}

const bodyOf = (href: string) => new URL(href).searchParams.get("body") ?? "";

test("selecting prose offers the author and AI with its context", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("#ask-bar");
  await expect(bar).toBeHidden();
  await dragSelect(page, "load-sdk", 200);
  await expect(bar).toBeVisible();
  const selected = await page.evaluate(() => getSelection()!.toString());

  const body = bodyOf((await page.locator("#ask-author").getAttribute("href"))!);
  expect(body).toContain("Tutorial: [Framework Fixture Tutorial](http://localhost:4400/#load-sdk:~:text=");
  expect(body).toContain("Step: Load the runtime");
  expect(body).toContain(`> ${selected.trim()}`);

  await page.locator("#ask-ai-menu calcite-button").click();
  const chatgpt = page.locator("calcite-dropdown-item", { hasText: "ChatGPT" });
  await expect(chatgpt).toBeVisible();
  const prompt = new URL((await chatgpt.getAttribute("href"))!).searchParams.get("q")!;
  expect(prompt).toContain(body);
  expect(prompt).toMatch(/If it looks wrong, say so\.$/);
  // No {prompt}: the assistant opens as is.
  await expect(page.locator("calcite-dropdown-item", { hasText: "Docs assistant" })).toHaveAttribute("href", "https://docs.example.com/assistant");

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(bar).toBeHidden();
});

test("a single word or a click shows no toolbar", async ({ page }) => {
  await page.goto("/");
  await page.locator("#load-sdk p").first().dblclick({ position: { x: 40, y: 8 } });
  await page.waitForTimeout(700);
  await expect(page.locator("#ask-bar")).toBeHidden();
});

test("code selections carry the file, lines and masked secrets", async ({ page }) => {
  await page.goto("/#config");
  await page.locator('calcite-input[data-var="clientId"] input').fill("secret-id");
  await page.locator('calcite-tab-title[data-file="main.js"]').click();
  // A keyboard-like selection (no pointer): the toolbar shows after a pause.
  await page.evaluate(() => {
    const token = document.querySelector('.code[data-file="main.js"] [data-var="clientId"]')!;
    const line = token.closest("[data-line]")!;
    getSelection()!.selectAllChildren(line);
  });
  await expect(page.locator("#ask-bar")).toBeVisible();
  const line = await page.locator('.code[data-file="main.js"] [data-var="clientId"]').evaluate((token) => token.closest("[data-line]")!.getAttribute("data-line"));
  const body = bodyOf((await page.locator("#ask-author").getAttribute("href"))!);
  expect(body).toContain("Step: Configure values");
  expect(body).toContain(`File: main.js, line ${line}\n\n\`\`\`\n`);
  expect(body).toContain('"•••"');
  expect(body).not.toContain("secret-id");
});

test("an AI action copies the prompt and says so", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await dragSelect(page, "load-sdk", 200);
  await page.locator("#ask-ai-menu calcite-button").click();
  const item = page.locator("calcite-dropdown-item", { hasText: "Docs assistant" });
  const prompt = await page.locator("calcite-dropdown-item", { hasText: "ChatGPT" }).getAttribute("href");
  const popup = context.waitForEvent("page");
  await item.click();
  await (await popup).close();
  await expect(page.locator("#ask-status")).toHaveText("Prompt copied. Paste it into the assistant.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(prompt!).searchParams.get("q"));
  await expect(page.locator("#ask-bar")).toBeHidden();
});

test("no toolbar in presentation mode", async ({ page }) => {
  await page.goto("/");
  await page.locator("#present-toggle").click();
  await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
  await page.evaluate(() => getSelection()!.selectAllChildren(document.querySelector("#load-sdk p")!));
  await page.waitForTimeout(700);
  await expect(page.locator("#ask-bar")).toBeHidden();
});
