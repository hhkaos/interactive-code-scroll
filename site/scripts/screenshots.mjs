// Regenerates the light/dark screenshots in public/screenshots/ (used by the landing page, the root README and docs/*.md)
// from the built showcase tutorials. Run `pnpm build:showcase` first.
import { chromium } from "@playwright/test";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { base } from "../site-config.mjs";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

/** name → page, step hash and optional action before the shot. */
const shots = [
  { name: "hero-rest-python", path: "showcase/rest-geocode/?variant=python#request" },
  { name: "oauth-preview", path: "showcase/oauth-pkce/#ui" },
  { name: "oauth-images", path: "showcase/oauth-pkce/#register-app" },
  { name: "present-rest-curl", path: "showcase/rest-geocode/?variant=curl#header", action: (page) => page.click("#present-toggle") },
  { name: "reading-oauth", path: "showcase/oauth-pkce/#oauth" },
  {
    name: "forms-oauth",
    path: "showcase/oauth-pkce/#config",
    action: (page) => page.locator('calcite-input[data-var="clientId"] input').fill("a1B2c3D4e5F6g7H8"),
  },
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

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let file = join(publicDir, decodeURIComponent(url.pathname.slice(base.length - 1)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!url.pathname.startsWith(base) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(0);
const origin = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
for (const colorScheme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2, colorScheme });
  const page = await context.newPage();
  for (const { name, path, action, highlight } of shots) {
    await page.goto(`${origin}${base}${path}`, { waitUntil: "networkidle" });
    await action?.(page);
    await page.waitForTimeout(2000);
    if (highlight) await page.evaluate(highlightArea, highlight);
    await page.screenshot({ path: join(publicDir, "screenshots", `${name}-${colorScheme}.png`) });
  }
  await context.close();
}
await browser.close();
server.close();
