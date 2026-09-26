#!/usr/bin/env node
// @ts-check
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
const astroBin = join(packageRoot, "node_modules", "astro", "bin", "astro.mjs");
const integrationUrl = new URL("../src/index.ts", import.meta.url).href;

/**
 * @typedef {Readonly<{
 *   command: "dev" | "build" | "serve";
 *   root: string;
 *   tutorial: string;
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
  const tutorial = options.get("--tutorial") ?? "tutorial";
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

  return { command, root, tutorial, configPath, configArg, astroArgs };
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
  return `${prefix ? `${prefix}\n\n` : ""}Usage: interactive-code-scroll <dev|build|serve> [options] [-- Astro flags]\n\nOptions:\n  --root <dir>       Project root. Defaults to the current directory.\n  --tutorial <dir>   Tutorial folder inside the root. Defaults to tutorial.\n  --base <path>      Astro base path.\n  --site <url>       Astro site URL.\n  --port <port>      Dev/serve port.\n  --host [address]   Dev/serve host flag value.\n  --outDir <dir>     Build output directory.\n\nThe CLI is topic-agnostic. OAuth or provider-specific guidance must come from explicit project configuration.`;
}

/**
 * @param {CliPlan} plan
 */
function validateProject(plan) {
  const mdxPath = join(plan.root, plan.tutorial, "tutorial.mdx");
  if (!existsSync(mdxPath)) throw new Error(`Tutorial not found at ${mdxPath}`);
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

  const child = spawn(process.execPath, [astroBin, ...plan.astroArgs], {
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

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
