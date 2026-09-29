import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { expect, it, vi } from "vitest";
import { interactiveCodeScroll } from "../src/index.ts";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}/`, import.meta.url));

it("fails the Astro build with MDX file:line for every broken reference and frontmatter field", async () => {
  const run = build({
    root: fixture("broken"),
    outDir: mkdtempSync(join(tmpdir(), "ics-build-")),
    integrations: [interactiveCodeScroll()],
    logLevel: "silent",
  });
  await expect(run).rejects.toThrow(/tutorial\.mdx:3:1 frontmatter logo "missing\.svg" not found in images\//);
  await expect(run).rejects.toThrow(/tutorial\.mdx:6:1 <Step> region "nope" not found in code\/main\.js/);
  await expect(run).rejects.toThrow(/tutorial\.mdx:10:1 <VarField> no "@var missing" found in code\//);
  await expect(run).rejects.toThrow(/tutorial\.mdx:12:1 <Step> request "missing-request" not found in requests\//);
}, 60_000);

it("publishes captured outputs as is and warns about outputs that look like they hold a credential", async () => {
  // Inside test/fixtures so the injected pages resolve the package dependencies; removed after the run.
  const root = mkdtempSync(fileURLToPath(new URL("./fixtures/result-", import.meta.url)));
  const outDir = join(root, "dist");
  try {
    const tutorial = join(root, "tutorial");
    mkdirSync(join(tutorial, "code"), { recursive: true });
    mkdirSync(join(tutorial, "output", "shots"), { recursive: true });
    writeFileSync(join(tutorial, "tutorial.mdx"), '---\ntitle: Result\npreview: off\n---\n\n<Step id="run" file="main.py" output="run.json">\nText.\n</Step>\n');
    writeFileSync(join(tutorial, "code", "main.py"), 'TOKEN = "DEMO"  # @var token\n');
    writeFileSync(join(tutorial, "output", "run.json"), '{ "url": "https://x.test/?token=DEMO", "next": "https://x.test/?token=REAL123" }\n');
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    writeFileSync(join(tutorial, "output", "shots", "map.png"), png);

    const warnings: string[] = [];
    const write = process.stdout.write.bind(process.stdout);
    const capture = vi.spyOn(process.stdout, "write").mockImplementation((chunk, ...rest) => {
      warnings.push(String(chunk));
      return write(chunk, ...(rest as []));
    });
    try {
      await build({ root, outDir, integrations: [interactiveCodeScroll()], logLevel: "warn" });
    } finally {
      capture.mockRestore();
    }
    expect(readFileSync(join(outDir, "output", "shots", "map.png"))).toEqual(Buffer.from(png));
    expect(readFileSync(join(outDir, "output", "run.json"), "utf8")).toContain("REAL123");
    expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain('data-output="run.json"');
    const credential = warnings.filter((line) => line.includes("looks like it contains a credential"));
    expect(credential.join("")).toContain("output/run.json:1");
    expect(credential.join("")).not.toContain("REAL123");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);
