// @ts-check
import { basename } from "node:path";

/** @typedef {"web" | "rest" | "script" | "native"} TutorialType */
/** @typedef {"javascript" | "curl" | "python" | "kotlin" | "swift" | "csharp"} Language */

/**
 * @typedef {{
 *   dir: string;
 *   layout: "single" | "series";
 *   tutorials: string[];
 *   index: "default" | "mdx" | "custom";
 *   type: TutorialType;
 *   langs: Language[];
 *   languagesAs: "variants" | "siblings";
 *   pm: "npm" | "pnpm";
 *   pages: boolean;
 *   git: boolean;
 *   install: boolean;
 * }} Answers
 */

/** @type {Record<TutorialType, { label: string; hint: string; langs: Language[] }>} */
export const TYPES = {
  web: { label: "Web app", hint: "HTML/JavaScript with a live Preview", langs: ["javascript"] },
  rest: { label: "REST API", hint: ".http requests, a Run button and captured responses", langs: ["curl", "python", "javascript"] },
  script: { label: "Script", hint: "code with captured output", langs: ["python", "javascript"] },
  native: { label: "Native app", hint: "code only, no Preview", langs: ["kotlin", "swift", "csharp"] },
};

/** @type {Record<Language, string>} */
export const LANGUAGES = { javascript: "JavaScript", curl: "cURL", python: "Python", kotlin: "Kotlin", swift: "Swift", csharp: "C#" };

export const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Every question: its flag, for errors about missing answers without a terminal. */
export const FLAGS = {
  dir: "<dir>",
  layout: "--layout single|series",
  tutorials: "--tutorials <a,b>",
  index: "--index default|mdx|custom",
  type: "--type web|rest|script|native",
  langs: "--langs <list>",
  languagesAs: "--languages-as variants|siblings",
  pm: "--pm npm|pnpm",
  pages: "--pages / --no-pages",
  git: "--git / --no-git",
  install: "--install / --no-install",
};

const VALUE_FLAGS = new Map([
  ["--layout", "layout"],
  ["--tutorials", "tutorials"],
  ["--index", "index"],
  ["--type", "type"],
  ["--langs", "langs"],
  ["--languages-as", "languagesAs"],
  ["--pm", "pm"],
]);
const BOOLEAN_FLAGS = new Map([
  ["pages", "pages"],
  ["git", "git"],
  ["install", "install"],
]);

/**
 * @typedef {{ answers: Partial<Answers>; yes: boolean; help: boolean }} ParsedArgs
 */

/**
 * Parses `create-interactive-code-scroll [dir] [flags]`. Values are checked by `validate()`.
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
export function parseArgs(argv) {
  /** @type {Record<string, unknown>} */
  const answers = {};
  let yes = false;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = /** @type {string} */ (argv[i]);
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    if (flag === "--yes" || flag === "-y") yes = true;
    else if (flag === "--help" || flag === "-h") help = true;
    else if (VALUE_FLAGS.has(flag)) {
      const value = inline ?? argv[++i];
      if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value.`);
      const key = /** @type {string} */ (VALUE_FLAGS.get(flag));
      answers[key] = key === "tutorials" || key === "langs" ? list(value) : value;
    } else if (flag.startsWith("--no-") && BOOLEAN_FLAGS.has(flag.slice(5))) answers[/** @type {string} */ (BOOLEAN_FLAGS.get(flag.slice(5)))] = false;
    else if (flag.startsWith("--") && BOOLEAN_FLAGS.has(flag.slice(2))) answers[/** @type {string} */ (BOOLEAN_FLAGS.get(flag.slice(2)))] = true;
    else if (flag.startsWith("-")) throw new Error(`Unknown option ${flag}. Run with --help for the list.`);
    else if (answers.dir === undefined) answers.dir = flag;
    else throw new Error(`Unexpected argument "${flag}": only one folder can be created.`);
  }
  return { answers: /** @type {Partial<Answers>} */ (answers), yes, help };
}

/** @param {string} value */
export function list(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Answers for everything not asked: used by `--yes` and as the prompts' initial values.
 * @param {"npm" | "pnpm"} detectedPm
 * @returns {Answers}
 */
export function defaults(detectedPm) {
  return {
    dir: "my-tutorial",
    layout: "single",
    tutorials: ["first-tutorial", "second-tutorial"],
    index: "default",
    type: "web",
    langs: ["javascript"],
    languagesAs: "variants",
    pm: detectedPm,
    pages: true,
    git: true,
    install: true,
  };
}

/**
 * Completes answers with defaults; languages default to the type's first language.
 * @param {Partial<Answers>} answers
 * @param {Answers} fallback
 * @returns {Answers}
 */
export function complete(answers, fallback) {
  const type = answers.type ?? fallback.type;
  const langs = answers.langs ?? (type === fallback.type ? fallback.langs : [/** @type {Language} */ (TYPES[type]?.langs[0])]);
  return { ...fallback, ...answers, type, langs };
}

/**
 * Questions still to ask: the keys of `Answers` a prompt would cover.
 * @param {Partial<Answers>} answers
 * @returns {(keyof Answers)[]}
 */
export function unanswered(answers) {
  /** @type {(keyof Answers)[]} */
  const keys = ["dir", "layout", "type", "langs", "pm", "pages", "git", "install"];
  if (answers.layout === "series") keys.splice(2, 0, "tutorials", "index");
  const type = answers.type;
  if (type !== undefined && TYPES[type]?.langs.length === 1) keys.splice(keys.indexOf("langs"), 1);
  if ((answers.langs?.length ?? 0) > 1 && answers.layout === "series") keys.splice(keys.indexOf("pm"), 0, "languagesAs");
  return keys.filter((key) => answers[key] === undefined);
}

/**
 * Every problem with complete answers, as messages naming the flag.
 * @param {Answers} answers
 * @returns {string[]}
 */
export function validate(answers) {
  /** @type {string[]} */
  const errors = [];
  if (!answers.dir) errors.push("The folder name is empty.");
  if (!["single", "series"].includes(answers.layout)) errors.push(`--layout must be single or series, got "${answers.layout}".`);
  if (!["default", "mdx", "custom"].includes(answers.index)) errors.push(`--index must be default, mdx or custom, got "${answers.index}".`);
  if (!["npm", "pnpm"].includes(answers.pm)) errors.push(`--pm must be npm or pnpm, got "${answers.pm}".`);
  if (!["variants", "siblings"].includes(answers.languagesAs)) errors.push(`--languages-as must be variants or siblings, got "${answers.languagesAs}".`);
  const type = TYPES[answers.type];
  if (!type) errors.push(`--type must be web, rest, script or native, got "${answers.type}".`);
  else {
    if (answers.langs.length === 0) errors.push("--langs needs at least one language.");
    for (const lang of answers.langs) {
      if (!type.langs.includes(lang)) errors.push(`--langs: "${lang}" is not available for ${answers.type} tutorials (${type.langs.join(", ")}).`);
    }
    if (new Set(answers.langs).size !== answers.langs.length) errors.push("--langs lists a language twice.");
  }
  if (answers.layout === "series") {
    if (answers.tutorials.length === 0) errors.push("--tutorials needs at least one name.");
    for (const slug of answers.tutorials) {
      if (!SLUG.test(slug)) errors.push(`--tutorials: "${slug}" must use lowercase letters, digits and dashes, and start with a letter or digit.`);
    }
    if (new Set(answers.tutorials).size !== answers.tutorials.length) errors.push("--tutorials lists a name twice.");
  } else {
    if (answers.index !== "default") errors.push("--index needs --layout series.");
    if (answers.languagesAs === "siblings" && answers.langs.length > 1) errors.push("--languages-as siblings needs --layout series.");
  }
  return errors;
}

/**
 * The npm package name for a folder.
 * @param {string} dir
 */
export function packageName(dir) {
  const name = basename(dir)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[-]+$/g, "");
  return name || "my-tutorial";
}

/**
 * A title from a slug or folder name: `my-first-map` → `My first map`.
 * @param {string} slug
 */
export function titleFrom(slug) {
  const words = basename(slug).replace(/[-_]+/g, " ").trim();
  return words ? words[0]?.toUpperCase() + words.slice(1) : "My tutorial";
}
