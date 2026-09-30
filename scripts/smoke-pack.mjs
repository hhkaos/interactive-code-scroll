#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "ics-pack-"));
const packDir = join(temp, "pack");
const projectDir = join(temp, "project");
const seriesDir = join(temp, "series");
const createDir = join(temp, "create");
let failed = true;

mkdirSync(packDir);
mkdirSync(projectDir);
mkdirSync(seriesDir);
mkdirSync(createDir);

try {
  run("pnpm", ["--filter", "interactive-code-scroll", "pack", "--pack-destination", packDir], root);
  const tarballName = readdirSync(packDir).find((file) => file.startsWith("interactive-code-scroll-") && file.endsWith(".tgz"));
  if (!tarballName) throw new Error("Pack smoke test did not create an interactive-code-scroll tarball");
  const tarball = join(packDir, tarballName);

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

  // Series site with a custom index page, through the packed CLI (tutorials/ auto-detected) and the
  // public `interactive-code-scroll/series` module.
  cpSync(join(root, "examples", "framework-fixture-series", "tutorials"), join(seriesDir, "tutorials"), { recursive: true });
  rmSync(join(seriesDir, "tutorials", "index.mdx"));
  writeFileSync(
    join(seriesDir, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: { build: "interactive-code-scroll build --index home.astro" },
        dependencies: { astro: "7.3.5", "interactive-code-scroll": `file:${tarball}` },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(seriesDir, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");
  writeFileSync(
    join(seriesDir, "home.astro"),
    [
      "---",
      'import { tutorials, TutorialFilter, TutorialList } from "interactive-code-scroll/series";',
      "---",
      '<html><body><p id="count">{tutorials.length} tutorials</p><TutorialFilter /><TutorialList /></body></html>',
      "",
    ].join("\n"),
  );
  run("pnpm", ["install", "--prefer-offline"], seriesDir, { CI: "true" });
  run("pnpm", ["build"], seriesDir, { CI: "true" });
  const home = existsSync(join(seriesDir, "dist", "index.html")) ? readFileSync(join(seriesDir, "dist", "index.html"), "utf8") : "";
  if (!home.includes('<p id="count">4 tutorials</p>') || !home.includes("series-card-title")) {
    throw new Error("Pack smoke test did not render the custom series index page");
  }

  // The packed scaffolder creates a series with mixed kinds and a custom index, built against the packed core.
  run("pnpm", ["--filter", "create-interactive-code-scroll", "pack", "--pack-destination", packDir], root);
  const createTarball = readdirSync(packDir).find((file) => file.startsWith("create-interactive-code-scroll-") && file.endsWith(".tgz"));
  if (!createTarball) throw new Error("Pack smoke test did not create a create-interactive-code-scroll tarball");
  writeFileSync(join(createDir, "package.json"), JSON.stringify({ private: true, dependencies: { "create-interactive-code-scroll": `file:${join(packDir, createTarball)}` } }, null, 2));
  run("pnpm", ["install", "--prefer-offline"], createDir, { CI: "true" });
  const createBin = join(createDir, "node_modules", "create-interactive-code-scroll", "bin", "create.mjs");
  const generated = join(createDir, "docs");
  run(
    process.execPath,
    [createBin, "docs", "--yes", "--layout", "series", "--tutorials", "intro,geo", "--use", "web:javascript,script:python", "--use", "geo=rest:curl", "--index", "custom", "--pm", "pnpm", "--no-git", "--no-install"],
    createDir,
    { CI: "true" },
  );
  const generatedPackage = JSON.parse(readFileSync(join(generated, "package.json"), "utf8"));
  if (generatedPackage.devDependencies["interactive-code-scroll"] !== `^${JSON.parse(readFileSync(join(root, "packages", "interactive-code-scroll", "package.json"), "utf8")).version}`) {
    throw new Error("Pack smoke test: the scaffolder does not depend on the core version released with it");
  }
  // Not on npm yet: point the project at the packed core.
  generatedPackage.devDependencies["interactive-code-scroll"] = `file:${tarball}`;
  writeFileSync(join(generated, "package.json"), JSON.stringify(generatedPackage, null, 2));
  run("pnpm", ["install", "--prefer-offline"], generated, { CI: "true" });
  run("pnpm", ["build"], generated, { CI: "true" });
  for (const page of ["index.html", "intro/preview/javascript/index.html", "geo/output/items.json"]) {
    if (!existsSync(join(generated, "dist", page))) throw new Error(`Pack smoke test: the scaffolded project did not build ${page}`);
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
