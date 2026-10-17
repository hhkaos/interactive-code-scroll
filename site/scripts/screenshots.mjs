// Regenerates the light/dark screenshots in public/screenshots/ (used by the landing page, the root README and docs/*.md)
// from the built showcase tutorials. Run `pnpm build:showcase` first.
// series-index-*.png are manual captures of a published series site (no series in the showcase): not regenerated here.
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { base } from "../site-config.mjs";

const repoDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const consoleBuild = join(repoDir, "screenshots", "console-source-build");
const only = process.argv.slice(2);
// A real fixture interaction produces the log. No credentials, remote API or injected console messages.
if (!only.length || only.includes("console-web")) {
  execFileSync("pnpm", ["--filter", "example-framework-fixture", "build", "--", "--base", `${base}__console-shot__/`, "--outDir", consoleBuild], { cwd: repoDir, stdio: "inherit", env: { ...process.env, CI: "true" } });
}
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

/** name → page (or absolute `url`), step hash and optional action before the shot. */
const shots = [
  {
    name: "console-web",
    path: "__console-shot__/#sign-in",
    element: ".right",
    end: ".console-entry",
    action: async (page) => {
      await page.getByRole("tab", { name: "Preview", exact: true }).click();
      await page.frameLocator(".preview iframe").locator("#sign-in").click();
      await page.getByRole("tab", { name: /^Console/ }).click();
      await page.locator(".console-entry .console-source").waitFor();
      await page.locator(".console-entry").first().getByRole("treeitem").first().click();
    },
  },
  { name: "hero-rest-python", path: "showcase/rest-geocode/?variant=python#request" },
  // A published tutorial outside this repository (second tab of the landing demo).
  { name: "summit-user-auth", url: "https://www.rauljimenez.info/arcgis-tutorials/arcgis-js-sdk-user-auth/#oauth" },
  { name: "oauth-preview", path: "showcase/oauth-pkce/#ui" },
  { name: "oauth-images", path: "showcase/oauth-pkce/#register-app" },
  { name: "present-rest-curl", path: "showcase/rest-geocode/?variant=curl#header", action: (page) => page.click("#present-toggle") },
  { name: "reading-oauth", path: "showcase/oauth-pkce/#oauth" },
  {
    name: "forms-oauth",
    path: "showcase/oauth-pkce/#config",
    action: (page) => page.locator('calcite-input[data-var="clientId"] input').fill("a1B2c3D4e5F6g7H8"),
  },
  {
    // The selection toolbar with the AI menu open, over a sentence of the OAuth step.
    name: "ask-oauth",
    path: "showcase/oauth-pkce/#oauth",
    action: async (page) => {
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        const paragraph = [...document.querySelectorAll("#oauth p")].find((p) => p.textContent.includes("popup: true"));
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let started = false;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!started && node.textContent.includes("popup: true")) {
            range.setStart(node, node.textContent.indexOf("popup: true"));
            started = true;
          }
          const end = node.textContent.indexOf("in a popup");
          if (started && end >= 0) {
            range.setEnd(node, end + "in a popup".length);
            break;
          }
        }
        getSelection().removeAllRanges();
        getSelection().addRange(range);
      });
      await page.waitForTimeout(800);
      await page.click("#ask-ai-menu calcite-button");
    },
    // A small toolbar: zoomed in (same 1440 x 860 ratio as the other shots, at twice the size).
    crop: { around: ["#oauth h2", "#ask-bar", "#ask-ai-menu calcite-dropdown-group"], width: 720, height: 430 },
  },
  // The same step as reading-oauth on a phone (portrait layout), for the landing's device composition.
  { name: "phone-oauth", path: "showcase/oauth-pkce/#oauth", device: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
  { name: "result-rest-text", path: "showcase/rest-geocode/?variant=python#results" },
  // Which part of the page a docs section is about: the rest is dimmed.
  { name: "area-explanations", path: "showcase/oauth-pkce/#config", highlight: ".docs" },
  { name: "area-code", path: "showcase/oauth-pkce/#oauth", highlight: ".code-panel" },
  { name: "area-preview", path: "showcase/oauth-pkce/#ui", highlight: "section.preview" },
  { name: "area-result", path: "showcase/rest-geocode/?variant=python#results", highlight: "section.result" },
  { name: "area-intro", path: "showcase/rest-geocode/?variant=python", highlight: ["section.intro"] },
  { name: "area-step", path: "showcase/oauth-pkce/#oauth", highlight: "section.step#oauth" },
  {
    name: "area-varfield",
    path: "showcase/oauth-pkce/#config",
    action: (page) => page.locator('calcite-input[data-var="clientId"] input').fill("a1B2c3D4e5F6g7H8"),
    highlight: ['calcite-input[data-var="clientId"]'],
  },
  {
    name: "area-hint",
    path: "showcase/rest-geocode/?variant=python#request",
    action: (page) => page.hover("#request .hint-label"),
    highlight: ["#request .hint-label", "#request .hint-popover"],
  },
];

/**
 * Dims the page around what `highlight` names and outlines it: a selector for a whole panel (outline inside it),
 * or a list of selectors for a small component (outline around all of them, with some room).
 */
function highlightArea(highlight) {
  // The page's own focus rings would read as a second highlight.
  document.activeElement?.blur();
  const style = document.createElement("style");
  style.textContent = "*, *:focus, *:focus-visible, *:focus-within { outline: none !important; }";
  document.head.append(style);
  const rects = [highlight].flat().map((selector) => document.querySelector(selector).getBoundingClientRect());
  const pad = Array.isArray(highlight) ? -10 : 3;
  const top = Math.min(...rects.map((r) => r.top)) + pad;
  const left = Math.min(...rects.map((r) => r.left)) + pad;
  const width = Math.max(...rects.map((r) => r.right)) - left - pad;
  const height = Math.max(...rects.map((r) => r.bottom)) - top - pad;
  // Scenes on the same page only change the hash, so the page (and an earlier mark) stays.
  document.querySelectorAll("[data-shot-mark]").forEach((old) => old.remove());
  const mark = document.createElement("div");
  mark.dataset.shotMark = "";
  Object.assign(mark.style, {
    position: "fixed", top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px`,
    border: "3px solid #22d3ee", borderRadius: "6px", boxShadow: `0 0 0 9999px ${matchMedia("(prefers-color-scheme: dark)").matches ? "rgba(0, 0, 0, 0.78)" : "rgba(4, 10, 22, 0.62)"}`,
    pointerEvents: "none", zIndex: "2147483647",
  });
  document.body.append(mark);
}

/** The `width` x `height` viewport area centered on what `around` names (and the selection), kept inside the viewport. */
function cropArea({ around, width, height }) {
  const rects = [...around.map((selector) => document.querySelector(selector).getBoundingClientRect()), getSelection().getRangeAt(0).getBoundingClientRect()];
  const cx = (Math.min(...rects.map((r) => r.left)) + Math.max(...rects.map((r) => r.right))) / 2;
  const cy = (Math.min(...rects.map((r) => r.top)) + Math.max(...rects.map((r) => r.bottom))) / 2;
  const clamp = (value, max) => Math.round(Math.max(0, Math.min(value, max)));
  return { x: clamp(cx - width / 2, innerWidth - width), y: clamp(cy - height / 2, innerHeight - height), width, height };
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const consolePrefix = `${base}__console-shot__/`;
  let file = url.pathname.startsWith(consolePrefix)
    ? join(consoleBuild, decodeURIComponent(url.pathname.slice(consolePrefix.length)))
    : join(publicDir, decodeURIComponent(url.pathname.slice(base.length - 1)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!url.pathname.startsWith(base) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(0);
const origin = `http://localhost:${server.address().port}`;

// `node scripts/screenshots.mjs <name>…` regenerates only those scenes.
const browser = await chromium.launch();
for (const colorScheme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2, colorScheme });
  const desktop = await context.newPage();
  for (const { name, path, url, action, highlight, crop, device, element, end } of shots.filter(({ name }) => !only.length || only.includes(name))) {
    // Phone scenes get their own context (viewport, touch, pixel ratio).
    const page = device ? await (await browser.newContext({ ...device, colorScheme })).newPage() : desktop;
    await page.goto(url ?? `${origin}${base}${path}`, { waitUntil: "networkidle" });
    await action?.(page);
    await page.waitForTimeout(2000);
    if (highlight) await page.evaluate(highlightArea, highlight);
    const bounds = element && await page.locator(element).boundingBox();
    const bottom = end && await page.locator(end).last().boundingBox();
    if (bounds && bottom) bounds.height = Math.ceil(bottom.y + bottom.height - bounds.y + 8);
    const clip = bounds || (crop && (await page.evaluate(cropArea, crop)));
    await page.screenshot({ path: join(publicDir, "screenshots", `${name}-${colorScheme}.png`), ...(clip && { clip }) });
    if (device) await page.context().close();
  }
  await context.close();
}
await browser.close();
server.close();
