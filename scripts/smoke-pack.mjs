#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "ics-pack-"));
const packDir = join(temp, "pack");
const projectDir = join(temp, "project");
let failed = true;

mkdirSync(packDir);
mkdirSync(projectDir);

try {
  run("pnpm", ["--filter", "interactive-code-scroll", "pack", "--pack-destination", packDir], root);
  const tarball = join(packDir, "interactive-code-scroll-0.0.0.tgz");

  cpSync(join(root, "examples", "framework-fixture", "tutorial"), join(projectDir, "tutorial"), { recursive: true });
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: {
          build: "interactive-code-scroll build",
        },
        dependencies: {
          astro: "7.3.5",
          "interactive-code-scroll": `file:${tarball}`,
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(projectDir, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");

  run("pnpm", ["install", "--prefer-offline"], projectDir, { CI: "true" });
  run("pnpm", ["build"], projectDir, { CI: "true" });
  if (!existsSync(join(projectDir, "dist", "index.html"))) {
    throw new Error("Pack smoke test did not produce dist/index.html");
  }
  failed = false;
} finally {
  if (failed) console.error(`Pack smoke test files kept at ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
