#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(packageRoot, "dist");

rmSync(dist, { recursive: true, force: true });

const tsc = spawnSync("tsc", ["-p", "tsconfig.build.json"], {
  cwd: packageRoot,
  stdio: "inherit",
});
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

rewriteFile(join(dist, "index.js"), (text) =>
  text
    .replaceAll("./preview/code-file.ts", "./preview/code-file.js")
    .replaceAll("./result/output-file.ts", "./result/output-file.js")
    .replaceAll("./embed/embed-file.ts", "./embed/embed-file.js")
    .replaceAll("./llms/markdown-file.ts", "./llms/markdown-file.js")
    .replaceAll("./llms/llms-txt.ts", "./llms/llms-txt.js"),
);

for (const path of [
  "src/components/Hint.astro",
  "src/components/Intro.astro",
  "src/components/LevelIcon.astro",
  "src/components/Outro.astro",
  "src/components/Step.astro",
  "src/components/StepMedia.astro",
  "src/components/TutorialCard.astro",
  "src/components/TutorialFavorites.astro",
  "src/components/TutorialFilter.astro",
  "src/components/TutorialList.astro",
  "src/components/VarField.astro",
  "src/pages/index.astro",
  "src/pages/series-index.astro",
  "src/preview/page.astro",
  "src/styles/tutorial.css",
  "src/styles/series.css",
  "src/styles/series-list.css",
  "src/styles/level-icon.css",
]) {
  const source = join(packageRoot, path);
  const target = join(dist, path.replace(/^src\//, ""));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}

rewriteAstroImports(join(dist, "components", "Hint.astro"));
rewriteAstroImports(join(dist, "components", "Intro.astro"));
rewriteAstroImports(join(dist, "components", "LevelIcon.astro"));
rewriteAstroImports(join(dist, "components", "Outro.astro"));
rewriteAstroImports(join(dist, "components", "Step.astro"));
rewriteAstroImports(join(dist, "components", "StepMedia.astro"));
rewriteAstroImports(join(dist, "components", "TutorialCard.astro"));
rewriteAstroImports(join(dist, "components", "TutorialFavorites.astro"));
rewriteAstroImports(join(dist, "components", "TutorialFilter.astro"));
rewriteAstroImports(join(dist, "components", "TutorialList.astro"));
rewriteAstroImports(join(dist, "components", "VarField.astro"));
rewriteAstroImports(join(dist, "pages", "index.astro"));
rewriteAstroImports(join(dist, "pages", "series-index.astro"));
rewriteAstroImports(join(dist, "preview", "page.astro"));

// Agent skills (repository root skills/), versioned with the package: node_modules/interactive-code-scroll/dist/skills/.
cpSync(join(packageRoot, "..", "..", "skills"), join(dist, "skills"), { recursive: true });

mkdirSync(join(dist, "bin"), { recursive: true });
const sourceCli = readFileSync(join(packageRoot, "bin", "interactive-code-scroll.mjs"), "utf8")
  .replace(
    "const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));",
    "const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));",
  )
  .replace('new URL("../src/index.ts", import.meta.url).href', 'new URL("../index.js", import.meta.url).href')
  .replace('new URL("../src/check.ts", import.meta.url).href', 'new URL("../check.js", import.meta.url).href')
  .replace('new URL("../../../skills/", import.meta.url)', 'new URL("../skills/", import.meta.url)');
writeFileSync(join(dist, "bin", "interactive-code-scroll.mjs"), sourceCli, { mode: 0o755 });

function rewriteAstroImports(file) {
  rewriteFile(file, (text) =>
    text.replaceAll(/(from\s+["'][^"']+)\.ts(["'])/g, "$1.js$2").replaceAll(/(import\s+["'][^"']+)\.ts(["'])/g, "$1.js$2"),
  );
}

function rewriteFile(file, transform) {
  if (!existsSync(file)) return;
  writeFileSync(file, transform(readFileSync(file, "utf8")));
}
