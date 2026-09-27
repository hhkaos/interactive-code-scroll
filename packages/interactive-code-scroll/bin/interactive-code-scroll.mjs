#!/usr/bin/env node
// @ts-check
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const COMMANDS = new Set(["dev", "build", "serve", "doctor", "init-scripts"]);
const OPTION_ALIASES = new Map([
  ["-r", "--root"],
  ["-t", "--tutorial"],
  ["-p", "--port"],
  ["-h", "--host"],
]);
const VALUE_OPTIONS = new Set(["--root", "--tutorial", "--base", "--site", "--port", "--outDir"]);
const OPTIONAL_VALUE_OPTIONS = new Set(["--host"]);
const BOOLEAN_OPTIONS = new Set(["--write"]);
const COMMAND_FLAG_TARGETS = new Map([
  ["--port", new Set(["dev", "serve"])],
  ["--host", new Set(["dev", "serve"])],
  ["--outDir", new Set(["build"])],
]);

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const integrationUrl = new URL("../src/index.ts", import.meta.url).href;

/**
 * @typedef {Readonly<{
 *   command: "dev" | "build" | "serve" | "doctor" | "init-scripts";
 *   root: string;
 *   tutorial: string;
 *   tutorialAutoDetected: boolean;
 *   write: boolean;
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
  const unexpected = [];
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
    if (BOOLEAN_OPTIONS.has(option)) {
      options.set(option, true);
      continue;
    }
    if (!option.startsWith("-")) {
      unexpected.push(option);
      continue;
    }
    forwarded.push(raw);
  }

  if (unexpected.length > 0) throw new Error(unexpectedArgumentHelp(command, unexpected[0]));

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
    if (option === "--root" || option === "--tutorial" || option === "--write") continue;
    const targets = COMMAND_FLAG_TARGETS.get(option);
    if (targets && !targets.has(command)) throw new Error(`${option} is only supported with ${[...targets].join(" or ")}.`);
    astroArgs.push(option);
    if (value !== true) astroArgs.push(value);
  }
  astroArgs.push(...forwarded);

  return { command, root, tutorial, tutorialAutoDetected, write: options.get("--write") === true, configPath, configArg, astroArgs };
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
  return `${prefix ? `${prefix}\n\n` : ""}Usage: interactive-code-scroll <dev|build|serve|doctor|init-scripts> [options] [-- Astro flags]\n\nOptions:\n  --root <dir>       Project root. Defaults to the current directory.\n  --tutorial <dir>   Tutorial folder inside the root. Defaults to tutorial.\n  --base <path>      Astro base path.\n  --site <url>       Astro site URL.\n  --port <port>      Dev/serve port.\n  --host [address]   Dev/serve host flag value.\n  --outDir <dir>     Build output directory.\n  --write            Write package.json changes for init-scripts.\n\nExamples:\n  npm exec -- interactive-code-scroll dev --tutorial .\n  pnpm exec interactive-code-scroll dev --tutorial .\n  npx --no-install interactive-code-scroll dev --tutorial .\n  interactive-code-scroll doctor\n\nWith package.json scripts:\n  \"scripts\": {\n    \"dev\": \"interactive-code-scroll dev\",\n    \"build\": \"interactive-code-scroll build\",\n    \"serve\": \"interactive-code-scroll serve\"\n  }\n\nThen run:\n  npm run dev -- --tutorial .\n  pnpm run dev -- --tutorial .\n\nThe CLI is topic-agnostic. OAuth or provider-specific guidance must come from explicit project configuration.`;
}

/**
 * @param {CliPlan} plan
 */
export function validateProject(plan) {
  const mdxPath = join(plan.root, plan.tutorial, "tutorial.mdx");
  if (existsSync(mdxPath)) return;
  const relativeMdxPath = relative(plan.root, mdxPath).split("\\").join("/");
  const candidates = findTutorialCandidates(plan.root);
  const pm = packageManager();
  const detected = candidates.length > 0 ? `\n\nDetected:\n${candidates.map((candidate) => `  ${candidate}`).join("\n")}` : "";
  const first = candidates[0];
  const suggestion = first
    ? commandSuggestion(plan.command, first === "tutorial.mdx" ? "." : dirname(first).split("\\").join("/"), pm)
    : `${commandSuggestion(plan.command, ".", pm)}\n  ${commandSuggestion(plan.command, "<folder>", pm)}`;
  const scriptTutorial = first ? (first === "tutorial.mdx" ? "." : dirname(first).split("\\").join("/")) : "<folder>";
  throw new Error(`Tutorial file not found.\n\nRoot:\n  ${plan.root}\n\nLooking for:\n  ${relativeMdxPath}${detected}\n\nTry:\n  ${suggestion}\n\nIf using package.json scripts, pass CLI arguments after --:\n  ${pm.run("dev", `--tutorial ${scriptTutorial}`)}`);
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
    const pm = packageManager();
    lines.push("", "No package.json found in the project root. If setup fails, run:", `  ${pm.init}`, `  ${pm.add}`);
  }
  return lines.join("\n");
}

export function packageManager(env = process.env) {
  const agent = env.npm_config_user_agent ?? "";
  if (agent.startsWith("yarn/")) {
    return {
      name: "yarn",
      init: "yarn init",
      add: "yarn add -D interactive-code-scroll@alpha astro@7.3.5",
      exec: (args) => `yarn interactive-code-scroll ${args}`,
      run: (script, args) => `yarn ${script} ${args}`,
    };
  }
  if (agent.startsWith("pnpm/")) {
    return {
      name: "pnpm",
      init: "pnpm init",
      add: "pnpm add -D interactive-code-scroll@alpha astro@7.3.5",
      exec: (args) => `pnpm exec interactive-code-scroll ${args}`,
      run: (script, args) => `pnpm run ${script} -- ${args}`,
    };
  }
  return {
    name: "npm",
    init: "npm init",
    add: "npm install -D interactive-code-scroll@alpha astro@7.3.5",
    exec: (args) => `npm exec -- interactive-code-scroll ${args}`,
    run: (script, args) => `npm run ${script} -- ${args}`,
  };
}

function commandSuggestion(command, tutorial, pm = packageManager()) {
  return pm.exec(`${command} --tutorial ${tutorial}`);
}

function unexpectedArgumentHelp(command, arg) {
  const pm = packageManager();
  return `Unexpected argument: ${arg}\n\nDid you mean:\n  interactive-code-scroll ${command} --tutorial ${arg}\n\nIf you are using package.json scripts, pass CLI arguments after --:\n  ${pm.run("dev", `--tutorial ${arg}`)}\n\nNot:\n  npm run dev --tutorial ${arg}`;
}

export function findTutorialCandidates(root, maxDepth = 3) {
  const ignored = new Set([".astro", ".git", "dist", "node_modules"]);
  /** @type {string[]} */
  const candidates = [];
  function visit(dir, depth) {
    if (depth > maxDepth) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name) || entry.name.startsWith(".")) continue;
      const abs = join(dir, entry.name);
      const rel = relative(root, abs).split("\\").join("/");
      if (entry.isFile() && entry.name === "tutorial.mdx") candidates.push(rel);
      if (entry.isDirectory()) visit(abs, depth + 1);
    }
  }
  if (existsSync(root)) visit(root, 0);
  return candidates.sort();
}

export function doctor(plan) {
  const pm = packageManager();
  const packageJson = existsSync(join(plan.root, "package.json"));
  const astro = resolveAstroBin(plan.root);
  const astroFound = existsSync(astro);
  const candidates = findTutorialCandidates(plan.root);
  const recommendedTutorial = plan.tutorial !== "tutorial" || candidates.length === 0 ? plan.tutorial : candidates[0] === "tutorial.mdx" ? "." : dirname(candidates[0]);
  return [
    "InteractiveCodeScroll doctor",
    "",
    `Package version: ${packageVersion()}`,
    `Node: ${process.version}`,
    `Package manager: ${pm.name}`,
    `Project root: ${plan.root}`,
    `package.json: ${packageJson ? "found" : "missing"}`,
    `Astro: ${astroFound ? astro : "missing"}`,
    "Tutorial candidates:",
    ...(candidates.length > 0 ? candidates.map((candidate) => `  ✓ ${candidate}`) : ["  ✗ none found"]),
    "Recommended command:",
    `  ${pm.run("dev", `--tutorial ${recommendedTutorial}`)}`,
  ].join("\n");
}

export function initScripts(plan) {
  const packageJsonPath = join(plan.root, "package.json");
  if (!existsSync(packageJsonPath)) throw new Error(`No package.json found at ${packageJsonPath}.\n\nRun:\n  ${packageManager().init}`);
  const data = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const scripts = typeof data.scripts === "object" && data.scripts !== null ? data.scripts : {};
  const usePrefixed = ["dev", "build", "serve"].some((name) => scripts[name] !== undefined);
  const prefix = usePrefixed ? "ics:" : "";
  const proposed = {
    [`${prefix}dev`]: "interactive-code-scroll dev",
    [`${prefix}build`]: "interactive-code-scroll build",
    [`${prefix}serve`]: "interactive-code-scroll serve",
  };
  const missing = Object.entries(proposed).filter(([name]) => scripts[name] === undefined);
  const lines = ["Found package.json.", "", "Suggested scripts:", ...Object.entries(proposed).map(([name, value]) => `  "${name}": "${value}"`)];
  if (!plan.write) {
    lines.push("", "No changes made. Run with --write to update package.json:", `  ${packageManager().exec("init-scripts --write")}`);
    return lines.join("\n");
  }
  data.scripts = { ...scripts, ...Object.fromEntries(missing) };
  writeFileSync(packageJsonPath, `${JSON.stringify(data, null, 2)}\n`);
  lines.push("", missing.length > 0 ? `Updated package.json with ${missing.length} script(s).` : "No changes made; scripts already exist.");
  return lines.join("\n");
}

function packageVersion() {
  try {
    return JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version ?? "unknown";
  } catch {
    return "unknown";
  }
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
  if (plan.command === "doctor") {
    console.log(doctor(plan));
    return 0;
  }
  if (plan.command === "init-scripts") {
    console.log(initScripts(plan));
    return 0;
  }
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
