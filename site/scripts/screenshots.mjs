// Regenerates the light/dark screenshots in public/screenshots/ (used by the landing page and the root README)
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
];

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
  for (const { name, path, action } of shots) {
    await page.goto(`${origin}${base}${path}`, { waitUntil: "networkidle" });
    await action?.(page);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(publicDir, "screenshots", `${name}-${colorScheme}.png`) });
  }
  await context.close();
}
await browser.close();
server.close();
