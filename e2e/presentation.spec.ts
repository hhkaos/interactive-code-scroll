import { expect, test } from "./fixtures.ts";

test("presentation mode goes full screen with a compact toolbar; Esc exits", async ({ page }) => {
  await page.goto("/#config");
  await page.locator("#present-toggle").click();
  await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
  await expect(page.locator("#theme-toggle")).toBeHidden();
  await expect(page.locator("#download-zip")).toBeHidden();
  await expect(page.locator(".zip-action")).toBeHidden();
  await expect(page.locator("#step-count")).toBeVisible();
  await expect(page.locator("#step-count")).toHaveText("Step 4 of 10");
  await expect(page.locator(".step-nav")).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  await expect(page.locator("#theme-toggle")).toBeVisible();
  await expect(page.locator("#step-count")).toBeHidden();
  await expect(page.locator(".step-nav")).toBeVisible();
});

test("hiding the explanations gives code the full width; keys still move steps", async ({ page }) => {
  await page.goto("/#config");
  // The handle shows while the pointer is on the splitter.
  await page.locator(".layout .splitter").hover();
  await page.locator("#docs-toggle").click();
  await expect(page.locator("main.docs")).toBeHidden();
  const width = await page.locator("aside.right").evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(1400);

  await page.locator(".code:not([hidden])").click();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#oauth$/);
  await expect(page.locator(".code:not([hidden]) .line[data-focus]").first()).toContainText("fixtureState");

  await page.locator("#docs-toggle").click();
  await expect(page.locator("section.step#oauth h2")).toBeInViewport();
  await expect(page).toHaveURL(/#oauth$/);
});

test("hiding explanations after selecting text keeps the active step", async ({ page }) => {
  await page.goto("/#config");
  await expect(page.locator("#config")).toHaveAttribute("data-active", "");
  const box = (await page.locator("#config p").first().boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 8, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString().trim().length ?? 0)).toBeGreaterThan(0);

  await page.locator(".layout .splitter").hover();
  await page.locator("#docs-toggle").click();
  await expect(page.locator("main.docs")).toBeHidden();
  // Let the hidden scroller's scroll/observer callbacks run before checking its state.
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/#config$/);
  await expect(page.locator("#config")).toHaveAttribute("data-active", "");

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#oauth$/);
  await page.locator("#docs-toggle").click();
  await expect(page.locator("#oauth h2")).toBeInViewport();
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/#oauth$/);
});

test("in presentation mode the clicker ends on a full-screen closing slide with a QR code", async ({ page }) => {
  const slide = page.locator("body > .completion[data-slide]");
  await page.goto("/#embed-next-slide");
  await page.locator("#present-toggle").click();
  await page.keyboard.press("PageDown");
  await expect(slide).toBeVisible();
  await expect(page.locator("#completion-heading")).toBeFocused();
  // For the room: a QR code of the tutorial's URL (no presentationUrl or Astro site here: the page's own), no reader actions.
  await expect(slide.locator(".completion-qr svg")).toBeVisible();
  await expect(slide.locator(".completion-share-url")).toHaveAttribute("href", /^http:\/\/localhost:\d+\/$/);
  await expect(slide.locator(".completion-actions")).toBeHidden();
  const box = (await slide.locator(".completion-qr").boundingBox())!;
  expect(box.width).toBeGreaterThan(500);

  // PageUp returns to the last step; the panel goes back to the end of the explanations.
  await page.keyboard.press("PageUp");
  await expect(slide).toHaveCount(0);
  await expect(page.locator("main.docs > .completion")).toHaveCount(1);
  await expect(page.locator("#step-count")).toHaveText("Step 10 of 10");

  // Esc on the slide leaves presentation mode; the reader stays on the (completed) panel.
  await page.keyboard.press("PageDown");
  await expect(slide).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  await expect(page.locator("main.docs > .completion")).toBeInViewport();
  await expect(page.locator("#step-position")).toHaveText("Done");
});

test("the closing slide also opens with the explanations hidden", async ({ page }) => {
  await page.goto("/#embed-next-slide");
  await page.locator("#present-toggle").click();
  await page.locator(".layout .splitter").hover();
  await page.locator("#docs-toggle").click();
  await page.keyboard.press("PageDown");
  await expect(page.locator("body > .completion[data-slide]")).toBeVisible();
  await expect(page.locator("#completion-heading")).toBeFocused();
});

test("entering and leaving presentation mode keeps the active step", async ({ page }) => {
  for (const id of ["config", "oauth", "sign-in", "embed-slides"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/#${id}`);
    await expect(page.locator(`section.step#${id}`)).toHaveAttribute("data-active", "");
    await page.locator("#present-toggle").click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    // Headless full screen keeps the window size; a real browser gives the toolbar height back on exit.
    await page.setViewportSize({ width: 1440, height: 780 });
    // Past the observer's settle time: a step switch would have happened by now.
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`section.step#${id}`)).toHaveAttribute("data-active", "");
  }
});

test.describe("step index in presentation mode", () => {
  const index = (page: import("@playwright/test").Page) => page.locator("#step-index");
  const headerButton = (page: import("@playwright/test").Page) => page.locator("#step-count-button");

  test("the header's 'Step X of N' opens a large centered index; step keys move the real step", async ({ page }) => {
    await page.goto("/#oauth");
    await expect(headerButton(page)).toBeHidden();
    await page.locator("#present-toggle").click();
    // Entering full screen closes open popovers: wait for it before opening the index.
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await expect(headerButton(page)).toBeVisible();
    await expect(headerButton(page)).toHaveAttribute("aria-keyshortcuts", "O");
    await headerButton(page).click();
    await expect(index(page)).toBeVisible();
    await expect(headerButton(page)).toHaveAttribute("aria-expanded", "true");
    await expect(index(page).locator(".step-index-eyebrow")).toBeVisible();
    await expect(index(page).locator(".step-index-hint")).toHaveText("Clicker or arrows move the step · Esc or O closes");
    await expect(index(page).locator('a[aria-current="step"]')).toBeFocused();
    // Centered in the window, much wider than the reader's popover (22rem).
    await expect.poll(async () => {
      const box = (await index(page).boundingBox())!;
      return Math.abs(box.x + box.width / 2 - 720) < 2 && Math.abs(box.y + box.height / 2 - 450) < 2 && box.width > 600;
    }).toBe(true);

    await page.keyboard.press("PageDown");
    await expect(page.locator("section.step#callback")).toHaveAttribute("data-active", "");
    await expect(page.locator("#step-count")).toHaveText("Step 6 of 10");
    await expect(index(page).locator('a[aria-current="step"]')).toBeFocused();

    // The same button closes it.
    await headerButton(page).click();
    await expect(index(page)).toBeHidden();
    await expect(headerButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("O, b and . open and close the index; E shows and hides the explanations", async ({ page }) => {
    await page.goto("/#oauth");
    await page.locator("#present-toggle").click();
    // Entering full screen closes open popovers: wait for it before opening the index.
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    for (const key of ["o", "O", "b", "."]) {
      await page.keyboard.press(key);
      await expect(index(page)).toBeVisible();
      await page.keyboard.press(key === "O" ? "o" : key);
      await expect(index(page)).toBeHidden();
    }
    await page.mouse.move(1000, 500);
    await page.keyboard.press("e");
    await expect(page.locator("body")).toHaveAttribute("data-docs-hidden", "");
    await expect(page.locator("main.docs")).toBeHidden();
    await expect(page.locator("#docs-toggle")).toHaveAttribute("text", "Show explanations");
    // A key, not a pointer: the toggle's tooltip stays closed.
    await expect(page.locator("calcite-tooltip[open]")).toHaveCount(0);
    await page.keyboard.press("E");
    await expect(page.locator("body")).not.toHaveAttribute("data-docs-hidden", "");
    await expect(page.locator("main.docs")).toBeVisible();
  });

  test("the shortcuts are off outside presentation mode and in fields", async ({ page }) => {
    await page.goto("/#config");
    for (const key of ["o", "b", ".", "e"]) await page.keyboard.press(key);
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).not.toHaveAttribute("data-docs-hidden", "");

    await page.locator("#present-toggle").click();
    const field = page.locator('calcite-input[data-var="portalUrl"] input');
    await field.fill("");
    await field.pressSequentially("obe.");
    await expect(field).toHaveValue("obe.");
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).not.toHaveAttribute("data-docs-hidden", "");
  });

  test("Esc order: the index, then a maximized pane, then presentation mode", async ({ page }) => {
    await page.addInitScript(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new Error("denied"));
    });
    await page.goto("/#config");
    await page.locator("#present-toggle").click();
    await page.mouse.move(700, 450);
    await page.locator("#code-maximize").click();
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "code");
    await page.keyboard.press("o");
    await expect(index(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "code");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  });

  test("in browser full screen, Esc is locked for the page (Chromium): the index closes first, then presentation mode", async ({ page }) => {
    // Headless key presses never reach the browser's own full-screen Esc: check the lock is taken and released.
    await page.addInitScript(() => {
      const calls: string[] = [];
      (window as unknown as { lockCalls: string[] }).lockCalls = calls;
      Object.defineProperty(navigator, "keyboard", {
        value: { lock: async (keys: string[]) => void calls.push(`lock ${keys.join()}`), unlock: () => void calls.push("unlock") },
      });
    });
    const lockCalls = () => page.evaluate(() => (window as unknown as { lockCalls: string[] }).lockCalls);
    await page.goto("/#oauth");
    await page.locator("#present-toggle").click();
    await expect.poll(lockCalls).toEqual(["lock Escape"]);
    await page.keyboard.press("o");
    await expect(index(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    expect(await page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
    await expect.poll(lockCalls).toEqual(["lock Escape", "unlock"]);
  });

  test("leaving presentation mode closes the index", async ({ page }) => {
    await page.goto("/#oauth");
    await page.locator("#present-toggle").click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await page.keyboard.press("o");
    await expect(index(page)).toBeVisible();
    // The browser's own Esc leaves full screen without the page seeing the key.
    await page.evaluate(() => document.exitFullscreen());
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    await expect(index(page)).toBeHidden();
  });
});

test.describe("Alt+P and the shortcut hint", () => {
  const hint = (page: import("@playwright/test").Page) => page.locator("#shortcut-hint");

  test("Alt+P enters and leaves presentation mode, but not from a field", async ({ page }) => {
    await page.goto("/#config");
    await expect(page.locator("#present-toggle")).toHaveAttribute("aria-keyshortcuts", "Alt+P");
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
    await expect(page.locator("calcite-tooltip[open]")).toHaveCount(0);
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();

    await page.locator('calcite-input[data-var="portalUrl"] input').focus();
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).not.toHaveAttribute("data-presenting", "");
  });

  test("a lone Alt shows the keys of the current mode; another key or Alt again hides them", async ({ page }) => {
    await page.goto("/#config");
    await expect(hint(page)).toBeHidden();
    await page.keyboard.press("Alt");
    await expect(hint(page)).toBeVisible();
    await expect(hint(page).locator(".shortcut-hint-item")).toHaveText([/P\s*Present$/, /Previous \/ next step$/, /clicker/, /Close \/ restore/, /Start \/ pause \/ resume reading/]);
    await page.keyboard.press("Alt");
    await expect(hint(page)).toBeHidden();

    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    // Alt+P is a chord, not a lone Alt: no hint.
    await expect(hint(page)).toBeHidden();
    await page.keyboard.press("Alt");
    await expect(hint(page).locator(".shortcut-hint-item")).toHaveText([/Exit presentation/, /Previous \/ next step$/, /clicker/, /Step list/, /Close \/ restore \/ exit/, /explanations/, /Collapse \/ restore/, /35%/, /50%/, /75%/, /Maximize \/ restore lower/, /Maximize \/ restore code/, /region highlight/, /Start \/ pause/]);
    // Centered at the bottom.
    const box = (await hint(page).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);
    expect(box.y + box.height).toBeGreaterThan(850);
    await page.keyboard.press("PageDown");
    await expect(hint(page)).toBeHidden();
  });

  test("Alt in a field shows no hint", async ({ page }) => {
    await page.goto("/#config");
    await page.locator('calcite-input[data-var="portalUrl"] input').focus();
    await page.keyboard.press("Alt");
    await expect(hint(page)).toBeHidden();
  });
});


test.describe("presentation panel shortcuts", () => {
  test("presets animate, preserve Console, remember size and restore after collapse/maximize", async ({ page }) => {
    await page.goto("/#sign-in");
    const body = page.locator("body");
    const frame = page.locator(".preview-frame");
    const height = () => page.locator(".right").evaluate((el) => el.style.getPropertyValue("--preview-split"));
    await expect.poll(height).toBe("30%");
    await page.keyboard.press("4");
    await expect.poll(height).toBe("30%");
    await page.keyboard.press("Alt+KeyP");
    await page.keyboard.press("4");
    await expect.poll(height).toBe("75%");
    await expect(page.locator("#preview-tab-console")).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => localStorage.getItem("ics:preview-split"))).toBe("75");
    await page.keyboard.press("1");
    await expect(frame).toBeHidden();
    await page.keyboard.press("1");
    await expect(frame).toBeVisible();
    await expect.poll(height).toBe("75%");
    await page.keyboard.press("5");
    await expect(body).toHaveAttribute("data-maximized", "preview");
    await page.keyboard.press("5");
    await expect(body).not.toHaveAttribute("data-maximized");
    await page.keyboard.press("0");
    await expect(body).toHaveAttribute("data-maximized", "code");
    await page.keyboard.press("0");
    await expect(body).not.toHaveAttribute("data-maximized");
    await page.keyboard.press("0");
    await page.keyboard.press("2");
    await expect(body).not.toHaveAttribute("data-maximized");
    await expect.poll(height).toBe("35%");
    await page.keyboard.press("1");
    await page.keyboard.press("3");
    await expect(frame).toBeVisible();
    await expect.poll(height).toBe("50%");
    await expect(page.locator(".preview-splitter")).toHaveAttribute("aria-valuenow", "50");
    await page.keyboard.press("PageUp");
    await page.keyboard.press("PageDown");
    await expect.poll(height).toBe("30%");
    expect(await page.evaluate(() => localStorage.getItem("ics:preview-split"))).toBe("50");
  });

  test("H restores syntax colors without changing focus or scroll, and resets on navigation and exit", async ({ page }) => {
    await page.goto("/#config");
    await page.keyboard.press("Alt+KeyP");
    const code = page.locator('.code:not([hidden])[data-has-focus]');
    const focused = code.locator(".line[data-focus]").first();
    await expect(focused).toBeVisible();
    const colors = () => code.locator(".line:not([data-focus]) span").evaluateAll((spans) => new Set(spans.map((span) => getComputedStyle(span).color)).size);
    await expect.poll(colors).toBe(1);
    const region = await code.locator(".line[data-focus]").count();
    const scroll = await code.evaluate((el) => el.scrollTop);
    await page.keyboard.press("h");
    await expect(page.locator("body")).toHaveAttribute("data-highlight-hidden", "");
    await expect(focused).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect.poll(colors).toBeGreaterThan(1);
    expect(await code.locator(".line[data-focus]").count()).toBe(region);
    expect(await code.evaluate((el) => el.scrollTop)).toBe(scroll);
    await page.keyboard.press("h");
    await expect(page.locator("body")).not.toHaveAttribute("data-highlight-hidden");
    await expect(focused).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect.poll(colors).toBe(1);
    await page.keyboard.press("h");
    await page.keyboard.press("PageDown");
    await expect(page.locator("body")).not.toHaveAttribute("data-highlight-hidden");
    await page.keyboard.press("h");
    await page.keyboard.press("Alt+KeyP");
    await expect(page.locator("body")).not.toHaveAttribute("data-highlight-hidden");
  });

  test("fields, embedded apps, modifiers, repeats and composition keep their keys", async ({ page }) => {
    await page.goto("/#config");
    await page.keyboard.press("Alt+KeyP");
    const field = page.locator('calcite-input[data-var="portalUrl"] input');
    await field.focus();
    await page.keyboard.press("5");
    await page.keyboard.press("h");
    await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
    await expect(page.locator("body")).not.toHaveAttribute("data-highlight-hidden");
    await field.blur();
    await page.evaluate(() => {
      for (const options of [{ repeat: true }, { isComposing: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
        dispatchEvent(new KeyboardEvent("keydown", { key: "5", ...options }));
      }
    });
    await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
    await page.keyboard.press("1");
    await expect(page.locator(".preview-frame")).toBeVisible();
    await page.locator("#preview-run").click();
    const iframe = page.frameLocator(".preview-frame iframe");
    await iframe.locator("body").click();
    await page.keyboard.press("5");
    await expect(page.locator("body")).not.toHaveAttribute("data-maximized");
  });

  test("persistent help opens from the hint, keeps Esc local, and fits a narrow window", async ({ page }) => {
    await page.goto("/#config");
    await page.keyboard.press("Alt+KeyP");
    await page.keyboard.press("5");
    await page.keyboard.press("Alt");
    await page.screenshot({ path: "screenshots/shortcuts-hint-desktop.png" });
    await page.getByRole("button", { name: "All shortcuts", exact: true }).click();
    const help = page.locator("#shortcut-help");
    await expect(help).toBeVisible();
    await expect(help.locator("h3")).toHaveText(["Navigation", "Panels", "Audio"]);
    await expect(help).toContainText("35%");
    await expect(help).toContainText("Start / pause / resume reading");
    await page.keyboard.press("4");
    await page.keyboard.press("PageDown");
    await expect(page).toHaveURL(/#config$/);
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "preview");
    await page.screenshot({ path: "screenshots/shortcuts-help-desktop.png" });
    await page.waitForTimeout(6200);
    await expect(help).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(help).toBeHidden();
    await expect(page.locator("body")).toHaveAttribute("data-maximized", "preview");
    await expect(page.locator("body")).toHaveAttribute("data-presenting", "");
    await page.keyboard.press("Alt+KeyP");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#shortcut-help-toggle").click();
    await expect(help).toBeVisible();
    await expect(help.locator("h3")).toHaveText(["Navigation", "Audio"]);
    const box = (await help.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "screenshots/shortcuts-help-phone.png" });
  });

  test("reduced motion applies the preset immediately and step settings cancel an ongoing animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#sign-in");
    await page.keyboard.press("Alt+KeyP");
    const split = page.locator(".preview-splitter");
    await page.keyboard.press("4");
    await expect(split).toHaveAttribute("aria-valuenow", "75");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const samples = await page.evaluate(async () => {
      dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
      const sizes: number[] = [];
      const start = performance.now();
      while (performance.now() - start < 240) {
        await new Promise(requestAnimationFrame);
        sizes.push(parseFloat(document.querySelector<HTMLElement>(".right")!.style.getPropertyValue("--preview-split")));
      }
      return sizes;
    });
    expect(samples.some((size) => size > 35 && size < 75)).toBe(true);
    await expect(split).toHaveAttribute("aria-valuenow", "35");
    await page.evaluate(() => {
      dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
      document.dispatchEvent(new CustomEvent("ics:panel-height", { detail: 42 }));
    });
    await page.waitForTimeout(250);
    await expect(split).toHaveAttribute("aria-valuenow", "42");
  });
});
