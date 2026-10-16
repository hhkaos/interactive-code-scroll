import { test, expect, type Page } from "./fixtures";
import { fileURLToPath } from "node:url";

/** A deterministic speech engine: events are driven by the test, never by OS voices. */
async function mockSpeech(page: Page, mode: "ready" | "late" | "missing" = "ready") {
  // Serve packaged Calcite assets locally so screenshots include icons without network.
  await page.route(/https:\/\/js.arcgis.com\/.*\/assets\//, async (route) => {
    const asset = new URL(route.request().url()).pathname.split("/assets/")[1]!;
    await route.fulfill({ path: fileURLToPath(new URL(`../packages/interactive-code-scroll/node_modules/@esri/calcite-components/dist/cdn/assets/${asset}`, import.meta.url)) });
  });
  await page.addInitScript((mode) => {
    const scope = window as any;
    let current: any;
    let last: any;
    const calls: string[] = [];
    const synth = new EventTarget() as any;
    let voices = mode === "ready" ? [{ name: "Test English", lang: "en-US", voiceURI: "test-en", default: true, localService: true }, { name: "Other English", lang: "en-GB", voiceURI: "test-en-other", default: false, localService: false }] : [];
    synth.getVoices = () => voices;
    synth.speak = (utterance: any) => { current = last = utterance; calls.push(utterance.text); utterance.onstart?.({}); };
    synth.cancel = () => { current = undefined; };
    Object.defineProperty(scope, "speechSynthesis", { value: synth, configurable: true });
    scope.SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    scope.speechMock = {
      calls,
      get text() { return current?.text; },
      end() { const u = current; current = undefined; u?.onend?.({}); },
      boundary(charIndex: number) { current?.onboundary?.({ name: "word", charIndex }); },
      staleEnd() { last?.onend?.({}); },
      error() { current?.onerror?.({ error: "synthesis-failed" }); },
      ready() { voices = [{ name: "Test English", lang: "en-US", voiceURI: "test-en", default: true, localService: true }]; synth.dispatchEvent(new Event("voiceschanged")); },
      wrongLanguage() { voices = [{ name: "Spanish", lang: "es", voiceURI: "test-es", default: true, localService: true }]; synth.dispatchEvent(new Event("voiceschanged")); },
    };
    if (mode === "missing") Object.defineProperty(scope, "speechSynthesis", { value: undefined });
  }, mode);
}
const mock = (page: Page, action: "end" | "staleEnd" | "error" | "ready" | "wrongLanguage") => page.evaluate((action) => (window as any).speechMock[action](), action);
async function playPause(page: Page) {
  if (await page.locator("#speech-bar").isVisible()) await page.locator("#speech-toggle").click();
  else await page.locator("#speech-launch").click();
}
const spoken = (page: Page) => page.evaluate(() => (window as any).speechMock.text as string | undefined);

async function finishStep(page: Page) {
  for (let i = 0; i < 30; i++) {
    if (!(await spoken(page))) return;
    await mock(page, "end");
  }
  throw new Error("Narration did not finish within 30 sentences");
}

test("Listen is opt-in; word highlights preserve selection; pause/resume rejects stale events", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/#load-sdk");
  await expect(page.locator("#speech-launch")).toBeVisible();
  await expect(page.locator("#speech-bar")).toBeHidden();
  await page.screenshot({ path: "screenshots/speech-idle.png" });
  await expect(page.locator("#speech-controls")).toBeHidden();
  expect(await spoken(page)).toBeUndefined();
  await playPause(page);
  await expect(page.locator("#speech-toggle")).toHaveText("Pause");
  expect(await spoken(page)).toBe("Load the runtime");
  await page.evaluate(() => {
    const node = document.querySelector("#load-sdk p")!.firstChild!;
    const range = document.createRange(); range.selectNodeContents(node);
    getSelection()!.removeAllRanges(); getSelection()!.addRange(range);
    (window as any).speechMock.boundary(5);
  });
  expect(await page.evaluate(() => [...CSS.highlights.get("ics-speech")!][0]!.toString())).toBe("the");
  expect(await page.evaluate(() => getSelection()!.toString())).toContain("This step focuses");
  await page.evaluate(() => getSelection()!.removeAllRanges());
  await page.screenshot({ path: "screenshots/speech-desktop.png" });
  await page.keyboard.press("Alt+Shift+L");
  await expect(page.locator("#speech-toggle")).toHaveText("Resume");
  await mock(page, "staleEnd");
  await expect(page).toHaveURL(/#load-sdk$/);
  await page.keyboard.press("Alt+Shift+L");
  expect(await spoken(page)).toBe("the runtime");
  await page.locator("#speech-stop").click();
  await expect(page.locator("#speech-controls")).toBeHidden();
  expect(await page.evaluate(() => CSS.highlights.has("ics-speech"))).toBe(false);
});

test("automatic advance is optional, skips carousel paging and stops at the last step", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/#load-sdk");
  await playPause(page);
  await finishStep(page);
  await expect(page.locator("#speech-toggle")).toHaveText("Resume");
  await expect(page).toHaveURL(/#load-sdk$/);
  await page.locator(".speech-settings summary").click();
  await page.locator("#speech-auto").check();
  await page.locator(".speech-settings summary").click();
  await playPause(page);
  await finishStep(page);
  await expect(page).toHaveURL(/#ui$/);
  await page.locator("#step-next").click();
  await expect(page).toHaveURL(/#register-app$/);
  await finishStep(page);
  await expect(page).not.toHaveURL(/#register-app$/);
  await page.locator("#speech-stop").click();
  await page.locator("#step-position").click();
  await page.locator("#step-index a").last().click();
  const lastUrl = page.url();
  await playPause(page);
  await finishStep(page);
  await expect(page.locator("#speech-toggle")).toHaveText("Listen");
  expect(page.url()).toBe(lastUrl);
});

test("fields pause narration; presentation hides it and preserves manual resume", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/#load-sdk");
  await playPause(page);
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "practice"; document.querySelector("#load-sdk")!.append(input); input.focus();
  });
  await expect(page.locator("#speech-toggle")).toHaveText("Resume");
  await playPause(page);
  await page.locator("#present-toggle").click();
  await expect(page.locator("#speech-bar")).toBeHidden();
  expect(await spoken(page)).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(page.locator("#speech-toggle")).toHaveText("Resume");
  expect(await spoken(page)).toBeUndefined();
});

test("voices can arrive late; mismatched voices hide controls; errors allow retry", async ({ page }) => {
  await mockSpeech(page, "late");
  await page.goto("/#load-sdk");
  await expect(page.locator("#speech-bar")).toBeHidden();
  await mock(page, "ready");
  await expect(page.locator("#speech-launch")).toBeVisible();
  await playPause(page);
  await mock(page, "error");
  await expect(page.locator("#speech-toggle")).toHaveText("Listen");
  await expect(page.locator("#speech-status")).toContainText("could not continue");
  await playPause(page);
  expect(await spoken(page)).toBeTruthy();
  await mock(page, "wrongLanguage");
  await expect(page.locator("#speech-bar")).toBeHidden();
  expect(await spoken(page)).toBeUndefined();
});

test("sentence highlighting works without word events and the controls fit phones", async ({ page }) => {
  await mockSpeech(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await playPause(page);
  expect(await spoken(page)).toBe("Before you start");
  await mock(page, "end");
  expect(await page.evaluate(() => [...CSS.highlights.get("ics-speech")!][0]!.toString())).toContain("This fixture");
  await page.locator(".speech-settings summary").click();
  await expect(page.locator("#speech-voice")).toBeVisible();
  await page.screenshot({ path: "screenshots/speech-phone.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("unsupported browsers keep narration hidden", async ({ page }) => {
  await mockSpeech(page, "missing");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#speech-bar")).toBeHidden();
  expect(errors.filter((error) => /speech/i.test(error))).toEqual([]);
});


test("prose crosses inline markup; code and fields are excluded; settings restart safely", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/#config");
  await playPause(page);
  await finishStep(page);
  const calls = await page.evaluate(() => (window as any).speechMock.calls as string[]);
  expect(calls.join(" ")).not.toMatch(/Client ID|Slot 1|YOUR_CLIENT_ID/);
  await page.locator("#speech-stop").click();
  await page.evaluate(() => {
    const step = document.querySelector("#config")!;
    const p = document.createElement("p");
    p.innerHTML = 'Read <em>this linked</em> <a href="#config">sentence</a>.';
    step.prepend(p);
  });
  await playPause(page);
  expect(await spoken(page)).toBe("Read this linked sentence.");
  await page.evaluate(() => (window as any).speechMock.boundary(17));
  expect(await page.evaluate(() => [...CSS.highlights.get("ics-speech")!][0]!.toString())).toBe("sentence");
  await page.locator("#speech-rate").selectOption("1.5");
  expect(await spoken(page)).toBe("sentence.");
  await page.locator("#speech-stop").click();
});

test("long-step narration keeps the step active when revealing its last sentence", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/#load-sdk");
  await page.evaluate(() => {
    const step = document.querySelector("#load-sdk")!;
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("p");
      p.textContent = `Paragraph ${i} explains the example in detail so we can follow the narration through a long step.`;
      p.style.marginBlock = "48px";
      step.append(p);
    }
  });
  await playPause(page);
  await finishStep(page);
  await expect(page.locator("#speech-toggle")).toHaveText("Resume");
  await expect(page).toHaveURL(/#load-sdk$/);
});


test("narration preferences survive reload without starting audio", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/#load-sdk");
  await expect(page.locator("#speech-bar")).toBeHidden();
  await playPause(page);
  await page.locator("#speech-rate").selectOption("1.5");
  await page.locator(".speech-settings summary").click();
  await page.locator("#speech-auto").check();
  await page.locator("#speech-voice").selectOption("test-en-other");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ics:speech")!));
  expect(saved).toEqual({ voice: "test-en-other", rate: 1.5, auto: true });
  await page.reload();
  await expect(page.locator("#speech-launch")).toBeVisible();
  await expect(page.locator("#speech-bar")).toBeHidden();
  expect(await spoken(page)).toBeUndefined();
  await playPause(page);
  await expect(page.locator("#speech-rate")).toHaveValue("1.5");
  await page.locator(".speech-settings summary").click();
  await expect(page.locator("#speech-auto")).toBeChecked();
  await expect(page.locator("#speech-voice")).toHaveValue("test-en-other");
  await page.locator("#speech-launch").click();
  await expect(page.locator("#speech-bar")).toBeHidden();
  expect(await spoken(page)).toBeUndefined();
});

test("blocked storage leaves playback usable", async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("Blocked"); };
    Storage.prototype.setItem = () => { throw new Error("Blocked"); };
  });
  await page.goto("/#load-sdk");
  await playPause(page);
  await page.locator("#speech-rate").selectOption("1.5");
  expect(await spoken(page)).toBeTruthy();
});
