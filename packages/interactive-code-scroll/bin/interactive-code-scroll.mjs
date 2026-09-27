#!/usr/bin/env node
// @ts-check
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const COMMANDS = new Set(["dev", "build", "serve"]);
const OPTION_ALIASES = new Map([
  ["-r", "--root"],
  ["-t", "--tutorial"],
  ["-p", "--port"],
  ["-h", "--host"],
]);
const VALUE_OPTIONS = new Set(["--root", "--tutorial", "--base", "--site", "--port", "--outDir"]);
const OPTIONAL_VALUE_OPTIONS = new Set(["--host"]);
const COMMAND_FLAG_TARGETS = new Map([
  ["--port", new Set(["dev", "serve"])],
  ["--host", new Set(["dev", "serve"])],
  ["--outDir", new Set(["build"])],
]);

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const integrationUrl = new URL("../src/index.ts", import.meta.url).href;

/**
 * @typedef {Readonly<{
 *   command: "dev" | "build" | "serve";
 *   root: string;
 *   tutorial: string;
 *   tutorialAutoDetected: boolean;
 *   configPath: string;
 *   configArg: string;
 *   astroArgs: readonly string[];
 * }>} CliPlan
 */

/**
 * @param {string[]} argv
 * @param {{ cwd?: string; configPath?: string }} [context]
 * @returns {CliPlan}
 */
export function planCli(argv, context = {}) {
  const [command, ...rest] = argv;
  if (!COMMANDS.has(command ?? "")) throw new Error(help(command ? `Unknown command "${command}".` : undefined));

  const cwd = context.cwd ?? process.cwd();
  const options = new Map();
  const forwarded = [];
  let passthrough = false;

  for (let index = 0; index < rest.length; index += 1) {
    const raw = rest[index];
    if (passthrough) {
      forwarded.push(raw);
      continue;
    }
    if (raw === "--") {
      passthrough = true;
      continue;
    }
    const option = OPTION_ALIASES.get(raw) ?? raw;
    if (VALUE_OPTIONS.has(option)) {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith("-")) throw new Error(`Missing value for ${raw}.`);
      options.set(option, value);
      index += 1;
      continue;
    }
    if (OPTIONAL_VALUE_OPTIONS.has(option)) {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith("-")) options.set(option, true);
      else {
        options.set(option, value);
        index += 1;
      }
      continue;
    }
    forwarded.push(raw);
  }

  const root = resolve(cwd, options.get("--root") ?? ".");
  const explicitTutorial = options.get("--tutorial");
  const defaultTutorial = existsSync(join(root, "tutorial.mdx")) && !existsSync(join(root, "tutorial", "tutorial.mdx")) ? "." : "tutorial";
  const tutorial = explicitTutorial ?? defaultTutorial;
  const tutorialAutoDetected = explicitTutorial === undefined && tutorial === ".";
  const configDir = existsSync(join(root, "node_modules"))
    ? join(root, "node_modules", ".interactive-code-scroll")
    : join(root, ".interactive-code-scroll");
  const configPath = context.configPath ?? join(configDir, "astro.config.mjs");
  const configArg = relative(root, configPath).split("\\").join("/");
  const astroCommand = command === "serve" ? "preview" : command;
  const astroArgs = [astroCommand, "--root", root, "--config", configArg];

  for (const [option, value] of options) {
    if (option === "--root" || option === "--tutorial") continue;
    const targets = COMMAND_FLAG_TARGETS.get(option);
    if (targets && !targets.has(command)) throw new Error(`${option} is only supported with ${[...targets].join(" or ")}.`);
    astroArgs.push(option);
    if (value !== true) astroArgs.push(value);
  }
  astroArgs.push(...forwarded);

  return { command, root, tutorial, tutorialAutoDetected, configPath, configArg, astroArgs };
}

/**
 * @param {CliPlan} plan
 */
export function writeAstroConfig(plan) {
  const tutorial = plan.tutorial.split("\\").join("/");
  mkdirSync(dirname(plan.configPath), { recursive: true });
  writeFileSync(
    plan.configPath,
    `import { defineConfig } from "astro/config";\nimport { interactiveCodeScroll } from ${JSON.stringify(integrationUrl)};\n\nexport default defineConfig({\n  integrations: [interactiveCodeScroll({ tutorial: ${JSON.stringify(tutorial)} })],\n});\n`,
  );
}

/**
 * @param {string | undefined} prefix
 */
function help(prefix) {
  return `${prefix ? `${prefix}\n\n` : ""}Usage: interactive-code-scroll <dev|build|serve> [options] [-- Astro flags]\n\nOptions:\n  --root <dir>       Project root. Defaults to the current directory.\n  --tutorial <dir>   Tutorial folder inside the root. Defaults to tutorial.\n  --base <path>      Astro base path.\n  --site <url>       Astro site URL.\n  --port <port>      Dev/serve port.\n  --host [address]   Dev/serve host flag value.\n  --outDir <dir>     Build output directory.\n\nExamples:\n  pnpm exec interactive-code-scroll dev\n  pnpm exec interactive-code-scroll dev --tutorial .\n  pnpm exec interactive-code-scroll dev --tutorial my-tutorial --host 127.0.0.1 --port 4321\n  pnpm exec interactive-code-scroll build\n  pnpm exec interactive-code-scroll serve --host 127.0.0.1 --port 4321\n\nThe CLI is topic-agnostic. OAuth or provider-specific guidance must come from explicit project configuration.`;
}

/**
 * @param {CliPlan} plan
 */
export function validateProject(plan) {
  const mdxPath = join(plan.root, plan.tutorial, "tutorial.mdx");
  if (existsSync(mdxPath)) return;
  const relativeMdxPath = relative(plan.root, mdxPath).split("\\").join("/");
  throw new Error(`Tutorial not found at ${relativeMdxPath}.\n\nExpected one of:\n  tutorial/tutorial.mdx\n  tutorial/code/\n  tutorial/images/\n\nIf your files are at the project root, run:\n  pnpm exec interactive-code-scroll ${plan.command} --tutorial .\n\nIf your tutorial is in another folder, run:\n  pnpm exec interactive-code-scroll ${plan.command} --tutorial <folder>`);
}

export function resolveAstroBin(root) {
  for (let dir = root; ; dir = dirname(dir)) {
    const projectAstro = join(dir, "node_modules", "astro", "bin", "astro.mjs");
    if (existsSync(projectAstro)) return projectAstro;
    if (dirname(dir) === dir) break;
  }
  return join(packageRoot, "node_modules", "astro", "bin", "astro.mjs");
}

/**
 * @param {CliPlan} plan
 */
export function preflightMessage(plan) {
  const action = plan.command === "serve" ? "preview server" : plan.command === "dev" ? "dev server" : "build";
  const lines = [
    `InteractiveCodeScroll ${action} starting...`,
    `Root: ${plan.root}`,
    `Tutorial: ${plan.tutorial}`,
    `Expected file: ${relative(plan.root, join(plan.root, plan.tutorial, "tutorial.mdx")).split("\\").join("/")}`,
  ];
  if (plan.tutorialAutoDetected) lines.push('Detected root-level tutorial.mdx; using --tutorial ".".');
  if (!existsSync(join(plan.root, "package.json"))) {
    lines.push("", "No package.json found in the project root. If setup fails, run:", "  pnpm init", "  pnpm add -D interactive-code-scroll@alpha astro@7.3.5");
  }
  return lines.join("\n");
}

/**
 * @param {string[]} argv
 */
export async function main(argv) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    console.log(help());
    return 0;
  }

  const plan = planCli(argv);
  validateProject(plan);
  writeAstroConfig(plan);
  console.log(preflightMessage(plan));

  const child = spawn(process.execPath, [resolveAstroBin(plan.root), ...plan.astroArgs], {
    cwd: plan.root,
    stdio: "inherit",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: process.env.ASTRO_TELEMETRY_DISABLED ?? "1" },
  });

  return await new Promise((resolveExit) => {
    child.on("exit", (code, signal) => {
      if (signal) resolveExit(1);
      else resolveExit(code ?? 1);
    });
    child.on("error", (error) => {
      console.error(error.message);
      resolveExit(1);
    });
  });
}

if (process.argv[1] && pathToFileURL(realpathSync(resolve(process.argv[1]))).href === import.meta.url) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
