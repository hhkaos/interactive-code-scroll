import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dev } from "astro";
import { afterAll, beforeAll, expect, it } from "vitest";
import { interactiveCodeScroll } from "../src/index.ts";

// Inside test/fixtures so the injected pages resolve the package dependencies; removed after the run.
const root = mkdtempSync(fileURLToPath(new URL("./fixtures/dev-", import.meta.url)));
const tutorial = join(root, "tutorial");
const MAIN_JS = '// #region config\nconst clientId = "ID"; // @var clientId\n// #endregion\n';
const SHOT_SVG = "<svg xmlns='http://www.w3.org/2000/svg'/>";

interface Overlay {
  message: string;
  loc: { file?: string; line?: number; column?: number };
}

let server: Awaited<ReturnType<typeof dev>>;
let socket: WebSocket;
/** Errors the dev server pushes to the browser overlay. */
const overlays: Overlay[] = [];

beforeAll(async () => {
  mkdirSync(join(tutorial, "code"), { recursive: true });
  mkdirSync(join(tutorial, "images"), { recursive: true });
  writeFileSync(
    join(tutorial, "tutorial.mdx"),
    '---\ntitle: Dev\npreview: off\n---\n\n<Step id="config" file="main.js" region="config">\nText.\n</Step>\n\n<Step id="shot" images={["shot.svg"]}>\nText.\n</Step>\n',
  );
  writeFileSync(join(tutorial, "code", "main.js"), MAIN_JS);
  writeFileSync(join(tutorial, "images", "shot.svg"), SHOT_SVG);

  // Under Vitest, Astro skips its dev request handler (VITEST) and disables HMR (NODE_ENV=test).
  const { VITEST, NODE_ENV } = process.env;
  delete process.env.VITEST;
  process.env.NODE_ENV = "development";
  try {
    server = await dev({
      root,
      integrations: [interactiveCodeScroll()],
      logLevel: "silent",
      server: { port: 0 },
      // The dep optimizer may still write after stop(); keep that out of the fixtures folder.
      vite: { cacheDir: mkdtempSync(join(tmpdir(), "ics-dev-vite-")) },
    });
  } finally {
    process.env.VITEST = VITEST;
    process.env.NODE_ENV = NODE_ENV;
  }

  // Listen like the browser overlay does: the HMR socket needs the token baked into /@vite/client.
  const client = await (await fetch(url("/@vite/client"))).text();
  const token = /const wsToken = "([^"]+)"/.exec(client)?.[1];
  socket = new WebSocket(`ws://localhost:${server.address.port}/?token=${token}`, "vite-hmr");
  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(String(event.data)) as { type: string; err?: Overlay };
    if (payload.type === "error" && payload.err) overlays.push(payload.err);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", reject);
  });
}, 60_000);

afterAll(async () => {
  socket?.close();
  await server?.stop();
  rmSync(root, { recursive: true, force: true });
});

function url(path: string): URL {
  return new URL(path, `http://localhost:${server.address.port}`);
}

/** Polls until `check` passes: the watcher and the overlay push react asynchronously. */
async function eventually<T>(read: () => Promise<T> | T, check: (value: T) => boolean): Promise<T> {
  let value = await read();
  for (let i = 0; i < 50 && !check(value); i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    value = await read();
  }
  return value;
}

const status = async () => (await fetch(url("/"))).status;

async function expectOverlay(pattern: RegExp): Promise<Overlay> {
  overlays.length = 0;
  expect(await eventually(status, (s) => s === 500)).toBe(500);
  const overlay = await eventually(
    () => overlays.find((o) => pattern.test(o.message)),
    (o) => o !== undefined,
  );
  expect(overlay, `no overlay matching ${pattern}: ${JSON.stringify(overlays)}`).toBeDefined();
  return overlay!;
}

it("re-validates the MDX when code/ or images/ change without touching tutorial.mdx", async () => {
  expect(await status()).toBe(200);

  writeFileSync(join(tutorial, "code", "main.js"), 'const clientId = "ID";\n');
  const region = await expectOverlay(/region .*config.* not found in code\/main\.js/);
  expect(region.loc).toEqual({ file: join(tutorial, "tutorial.mdx"), line: 6, column: 1 });

  writeFileSync(join(tutorial, "code", "main.js"), MAIN_JS);
  expect(await eventually(status, (s) => s === 200)).toBe(200);

  unlinkSync(join(tutorial, "images", "shot.svg"));
  const image = await expectOverlay(/shot\.svg/);
  expect(image.loc).toEqual({ file: join(tutorial, "tutorial.mdx"), line: 10, column: 1 });

  writeFileSync(join(tutorial, "images", "shot.svg"), SHOT_SVG);
  expect(await eventually(status, (s) => s === 200)).toBe(200);
}, 60_000);
