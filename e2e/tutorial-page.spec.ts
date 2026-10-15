import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the author's tutorial.mdx with its frontmatter title", async ({ page }) => {
  await expect(page).toHaveTitle("Framework Fixture Tutorial");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Framework Fixture Tutorial");
});

test("shows the frontmatter logo in the header and as favicon", async ({ page }) => {
  // Vite inlines small assets as data: URIs; larger ones get a hashed URL.
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(favicon).toMatch(/^data:image\/svg\+xml|fixture-logo.*\.svg$/);
  await expect(page.locator("calcite-navigation-logo")).toHaveJSProperty("thumbnail", favicon);
  const shown = page.locator("calcite-navigation-logo img");
  await expect(shown).toBeVisible();
  expect(await shown.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test("numbers each step's heading", async ({ page }) => {
  const marker = await page
    .locator("section.step#config h2")
    .evaluate((h) => getComputedStyle(h, "::before").content);
  expect(marker).toBe("counter(step)");
});

test("renders <Intro> as non-step tutorial intro", async ({ page }) => {
  await expect(page.locator(".intro h2")).toHaveText("Before you start");
  await expect(page.locator(".intro")).toContainText("stable contract for E2E tests");
  await expect(page.locator(".intro").locator("section.step")).toHaveCount(0);
  await expect(page.locator("section.step[data-active]")).toHaveCount(0);
  await expect(page.locator("#progress-bar")).toHaveJSProperty("value", 0);
  // The intro has code to show: no fallback to the media of a later step.
  await expect(page.locator(".code-panel")).toBeVisible();
  await expect(page.locator(".media-panel")).toBeHidden();
});

test("styles tutorial markdown code blocks with a hover copy control", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const block = page.locator(".intro pre");
  const copy = block.locator(".docs-code-copy");

  await expect(block).toBeVisible();
  await expect(copy).toHaveText("Copy");
  await expect(copy).toHaveCSS("opacity", "0");

  const styles = await block.evaluate((pre) => {
    const computed = getComputedStyle(pre);
    return {
      fontSize: computed.fontSize,
      paddingTop: computed.paddingTop,
      paddingLeft: computed.paddingLeft,
      overflowX: computed.overflowX,
    };
  });
  expect(styles).toEqual({ fontSize: "14px", paddingTop: "14px", paddingLeft: "16px", overflowX: "auto" });

  await block.hover();
  await expect(copy).toHaveCSS("opacity", "1");
  await copy.click();
  await expect(copy).toHaveText("Copied");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('const fixtureMode = "docs-code";');
});

test("styles tutorial blockquotes as notes", async ({ page }) => {
  const quote = page.locator(".intro blockquote");
  await expect(quote).toContainText("Fixture notes use standard Markdown blockquotes");

  const styles = await quote.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      borderLeftWidth: computed.borderLeftWidth,
      paddingLeft: computed.paddingLeft,
      marginTop: computed.marginTop,
    };
  });
  expect(styles).toEqual({ borderLeftWidth: "3px", paddingLeft: "18px", marginTop: "16px" });
});

test("styles tutorial tables with row rules aligned to the text", async ({ page }) => {
  const table = page.locator("section.step#callback table");
  await expect(table).toContainText("oauth-callback.html");

  const styles = await table.evaluate((node) => {
    const css = (el: Element) => getComputedStyle(el);
    const th = node.querySelector("th")!;
    const rows = node.querySelectorAll("tbody tr");
    return {
      thAlign: css(th).textAlign,
      thRule: css(th).borderBottomWidth,
      rowRule: css(rows[1].querySelector("td")!).borderTopWidth,
      firstCellPadding: css(rows[0].querySelector("td")!).paddingLeft,
      tableLeft: node.getBoundingClientRect().left,
      textLeft: node.previousElementSibling!.getBoundingClientRect().left,
    };
  });
  expect(styles).toMatchObject({ thAlign: "start", thRule: "2px", rowRule: "1px", firstCellPadding: "0px" });
  expect(styles.tableLeft).toBe(styles.textLeft);
});

test("shows code blocks in the page's light/dark mode, not a fixed dark theme", async ({ page }) => {
  const block = page.locator(".intro pre");
  await expect(block).toHaveClass(/github-light-default github-dark-default/);
  const colors = await block.evaluate((pre) => ({
    block: getComputedStyle(pre).backgroundColor,
    panel: getComputedStyle(pre.closest(".docs")!).backgroundColor,
    light: getComputedStyle(pre.querySelector("code span")!).getPropertyValue("--shiki-light"),
  }));
  expect(colors.block).toBe(colors.panel);
  expect(colors.light).not.toBe("");
});

test("keeps notes neutral in inactive steps and brand-colored in the active one", async ({ page }) => {
  const border = (selector: string) => page.locator(selector).evaluate((node) => getComputedStyle(node).borderLeftColor);
  const brand = await border(".intro blockquote");
  const note = "section.step#callback blockquote";
  await expect(page.locator(note)).toContainText("stay neutral until the step is active");
  expect(await border(note)).not.toBe(brand);

  await page.goto("/#callback");
  await expect(page.locator("section.step#callback")).toHaveAttribute("data-active", "");
  await expect.poll(() => border(note)).toBe(brand);
});

test("styles tutorial disclosure blocks with compact spacing", async ({ page }) => {
  const details = page.locator("section.step#oauth details");
  const summary = details.locator("summary");

  await expect(summary).toHaveText("Why register more than one behavior?");
  await summary.click();
  await expect(details).toHaveAttribute("open", "");

  const styles = await details.evaluate((node) => {
    const detailsStyle = getComputedStyle(node);
    const summaryStyle = getComputedStyle(node.querySelector("summary")!);
    return {
      borderRadius: detailsStyle.borderRadius,
      marginTop: detailsStyle.marginTop,
      summaryPaddingTop: summaryStyle.paddingTop,
      summaryPaddingLeft: summaryStyle.paddingLeft,
      firstParagraphGap: node.querySelector("p")!.getBoundingClientRect().top - node.querySelector("summary")!.getBoundingClientRect().bottom,
    };
  });
  expect(styles).toEqual({ borderRadius: "4px", marginTop: "16px", summaryPaddingTop: "10px", summaryPaddingLeft: "16px", firstParagraphGap: 16 });
});

test("renders inline hints with rich tooltip content", async ({ page }) => {
  const hint = page.locator(".hint", { hasText: "fixtureState" });
  const label = hint.locator(".hint-label");
  const popover = hint.locator(".hint-popover");

  await expect(label).toHaveText("fixtureState");
  await expect(label).toHaveAttribute("aria-describedby", "hint-fixture-state");
  await expect(popover).toHaveCSS("visibility", "hidden");

  await label.hover();
  await expect(popover).toHaveCSS("visibility", "visible");
  await expect(popover.getByRole("link", { name: "example docs" })).toHaveAttribute("href", "https://example.com/docs");

  const box = await popover.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width - 8);

  await popover.getByRole("link", { name: "example docs" }).hover();
  await expect(popover).toHaveCSS("visibility", "visible");
});

test("keeps closed disclosure blocks distinct inside the active step", async ({ page }) => {
  await page.locator("section.step#oauth").click();
  await expect(page.locator("section.step#oauth")).toHaveAttribute("data-active", "");

  const colors = await page.locator("section.step#oauth").evaluate((step) => {
    const details = step.querySelector("details")!;
    return {
      step: getComputedStyle(step).backgroundColor,
      details: getComputedStyle(details).backgroundColor,
      border: getComputedStyle(details).borderColor,
    };
  });
  expect(colors.details).not.toBe(colors.step);
  expect(colors.border).not.toBe(colors.step);
});

test("keeps inline code visually distinct inside the active step", async ({ page }) => {
  await page.locator("section.step#oauth").click();
  await expect(page.locator("section.step#oauth")).toHaveAttribute("data-active", "");

  const colors = await page.locator("section.step#oauth").evaluate((step) => {
    const code = step.querySelector("p code")!;
    return {
      step: getComputedStyle(step).backgroundColor,
      code: getComputedStyle(code).backgroundColor,
      border: getComputedStyle(code).borderColor,
    };
  });
  expect(colors.code).not.toBe(colors.step);
  expect(colors.border).not.toBe(colors.step);
});

test("renders each <Step> as a section with its references", async ({ page }) => {
  const config = page.locator("section.step#config");
  await expect(config).toHaveAttribute("data-file", "main.js");
  await expect(config).toHaveAttribute("data-region", "config");
  await expect(page.locator("section.step")).toHaveCount(10);
  await expect(page.locator("section.step#register-app template.step-media")).toHaveCount(1);
});

test("renders <VarField> as a Calcite input with the code literal as placeholder", async ({ page }) => {
  const input = page.locator('calcite-input[data-var="clientId"]');
  await expect(input).toHaveAttribute("placeholder", "YOUR_CLIENT_ID");
  await expect(input).toHaveAttribute("data-default-value", "YOUR_CLIENT_ID");
  await expect(input).toHaveAttribute("data-secret", "");
  await expect(input).toHaveAttribute("data-persist", "site");
});

test("renders custom <VarField> placeholder without changing the code default", async ({ page }) => {
  const input = page.locator('calcite-input[data-var="portalUrl"]');
  await expect(input).toHaveAttribute("placeholder", "https://portal.example.com");
  await expect(input).toHaveAttribute("data-default-value", "https://fixture.example.test");
});

test("lays out consecutive <VarField>s in as many columns as the explanations panel fits", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const fields = page.locator("section.step#config > .var-fields");
  await expect(fields.locator(".var-field")).toHaveCount(9);
  const columns = () => fields.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  const split = (value: string) => page.locator(".layout").evaluate((el: HTMLElement, v) => el.style.setProperty("--split", v), value);

  await split("25%");
  await expect.poll(columns).toBe(1);
  await split("60%");
  await expect.poll(columns).toBeGreaterThan(1);
  // Same column width for every field type (`ch` once shrank the combobox, whose host font is smaller).
  const width = (selector: string) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().width);
  expect(await width('calcite-combobox[data-var="privilege"]')).toBeCloseTo(await width('calcite-select[data-var="portal"]'), 0);
  // A textarea takes the whole row.
  expect(await width('calcite-text-area[data-var="description"]')).toBeCloseTo(await fields.evaluate((el) => el.clientWidth), 0);
});

test("renders build-time highlighted code with markers stripped", async ({ page }) => {
  await page.goto("/#config");
  const visibleCode = page.locator(".code:not([hidden])");
  const main = page.locator('.code[data-file="main.js"]');
  await expect(main.locator('[data-var="clientId"]')).toHaveText("YOUR_CLIENT_ID");
  await expect(visibleCode.locator(".line").first()).toHaveAttribute("data-line", "1");
  const [first, second] = await main.locator(".line").evaluateAll((lines) =>
    lines.slice(0, 2).map((line) => {
      const rect = line.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    }),
  );
  expect(first.height).toBeGreaterThan(0);
  expect(second.top).toBeGreaterThan(first.top);
  expect(second.top - first.top).toBeLessThan(first.height * 1.2);
  await expect(main.locator('.line[data-regions~="oauth"]').first()).toContainText("fixtureState");
  await expect(main).not.toContainText("#region");
  await expect(main).not.toContainText("@var");
  await expect(page.locator("calcite-tab-title")).toHaveText(["index.html", "main.js", "oauth-callback.html", "report.py", "settings.json", "style.css"]);
});

test("shows only the files listed in frontmatter as tabs; the ZIP action counts every file", async ({ page }) => {
  await expect(page.locator("calcite-tab-title")).toHaveText(["index.html", "main.js", "oauth-callback.html", "report.py", "settings.json", "style.css"]);
  await expect(page.locator('.code[data-file="README.md"]')).toHaveCount(0);
  const zip = page.locator("calcite-action#download-zip");
  await expect(zip).toBeVisible();
  await expect(zip).toHaveAttribute("text", "Download project (ZIP) · 9 files (3 not shown in tabs)");
  const badge = await page.locator(".zip-action").evaluate((el) => getComputedStyle(el, "::after").content);
  expect(badge).toBe('"9"');
  const embedded = await page.locator("#ics-data").evaluate((el) => JSON.parse(el.textContent!) as { files: { path: string }[]; fetched: string[] });
  expect(embedded.files.map((f) => f.path)).not.toContain("README.md");
  expect(embedded.fetched).toEqual([".env.example", "README.md", "assets/pixel.png"]);
});

test("shows the file tab focus ring for keyboard focus only", async ({ page }) => {
  const ring = (file: string) =>
    page.locator(`calcite-tab-title[data-file="${file}"]`).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector(".container")!).outlineColor);
  await page.locator('calcite-tab-title[data-file="main.js"]').click();
  await expect(page.locator('calcite-tab-title[data-file="main.js"]')).toBeFocused();
  expect(await ring("main.js")).toBe("rgba(0, 0, 0, 0)");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator('calcite-tab-title[data-file="main.js"]')).toBeFocused();
  // Calcite fades the ring in (outline-color transition, 0.15s): right after Tab it may still be transparent.
  await expect.poll(() => ring("main.js")).not.toBe("rgba(0, 0, 0, 0)");
});

test("highlights Python and strips its native region markers", async ({ page }) => {
  await page.locator('calcite-tab-title[data-file="report.py"]').click();
  const pane = page.locator('.code[data-file="report.py"]');
  await expect(pane).toBeVisible();
  await expect(pane).not.toContainText("region");
  await expect(pane.locator('.line[data-regions~="summary"]')).toHaveCount(2);
  const colors = await pane.locator('.line[data-regions~="summary"]').first().locator("span").evaluateAll((spans) =>
    Object.fromEntries(spans.map((s) => [s.textContent?.trim(), (s as HTMLElement).style.getPropertyValue("--shiki-light")])),
  );
  expect(colors.def).toBeTruthy();
  expect(colors.def).not.toBe(colors.summary);
});
