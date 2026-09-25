import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { expect, it } from "vitest";
import { interactiveCodeScroll } from "../src/index.ts";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}/`, import.meta.url));

it("fails the Astro build with MDX file:line for every broken reference", async () => {
  const run = build({
    root: fixture("broken"),
    outDir: mkdtempSync(join(tmpdir(), "ics-build-")),
    integrations: [interactiveCodeScroll()],
    logLevel: "silent",
  });
  await expect(run).rejects.toThrow(/tutorial\.mdx:5:1 <Step> region "nope" not found in code\/main\.js/);
  await expect(run).rejects.toThrow(/tutorial\.mdx:9:1 <VarField> no "@var missing" found in code\//);
}, 60_000);
