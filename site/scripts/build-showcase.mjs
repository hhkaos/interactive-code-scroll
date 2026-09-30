// Builds the showcase tutorials into public/showcase/<name>/ so `astro dev` and
// `astro build` serve them next to the landing page, under the same base path.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { base, showcase, site } from "../site-config.mjs";

const siteDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(siteDir, "..");
const run = (args) => execFileSync("pnpm", args, { cwd: repoRoot, stdio: "inherit", env: { ...process.env, CI: "true" } });

if (!existsSync(join(repoRoot, "packages/interactive-code-scroll/dist"))) run(["--filter", "interactive-code-scroll", "build"]);

for (const { name, filter } of showcase) {
  const outDir = join(siteDir, "public", "showcase", name);
  rmSync(outDir, { recursive: true, force: true });
  run(["--filter", filter, "build", "--", "--site", site, "--base", `${base}showcase/${name}/`, "--outDir", outDir]);
}
