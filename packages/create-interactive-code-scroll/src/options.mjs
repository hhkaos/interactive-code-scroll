// @ts-check
import { basename } from "node:path";

/** @typedef {"web" | "rest" | "script" | "native"} Kind */
/** Languages are runtimes: browser JavaScript and Node.js are different entries. */
/** @typedef {"javascript" | "node" | "curl" | "python" | "kotlin" | "swift" | "csharp"} Language */
/** @typedef {{ kind: Kind; lang: Language }} Choice */

/**
 * @typedef {{
 *   dir: string;
 *   layout: "single" | "series";
 *   tutorials: string[];
 *   index: "default" | "mdx" | "custom";
 *   use: Choice[];
 *   useBy: Record<string, Choice[]>;
 *   languagesAs: "variants" | "siblings";
 *   pm: "npm" | "pnpm";
 *   pages: boolean;
 *   git: boolean;
 *   install: boolean;
 * }} Answers
 * `use` applies to every tutorial; `useBy` (series only) overrides it for the named tutorials.
 */

/** @type {Record<Kind, { label: string; hint: string; langs: Language[] }>} */
export const KINDS = {
  web: { label: "Web app", hint: "runs in a live Preview", langs: ["javascript"] },
  rest: { label: "REST API", hint: ".http requests, a Run button and captured responses", langs: ["curl", "python", "node"] },
  script: { label: "Script", hint: "code with captured output", langs: ["python", "node"] },
  native: { label: "Native app", hint: "code only, no Preview", langs: ["kotlin", "swift", "csharp"] },
};

/** @type {Record<Language, string>} */
export const LANGUAGES = { javascript: "JavaScript", node: "Node.js", curl: "cURL", python: "Python", kotlin: "Kotlin", swift: "Swift", csharp: "C#" };

export const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Every question: its flag, for errors about missing answers without a terminal. */
export const FLAGS = {
  dir: "<dir>",
  layout: "--layout single|series",
  tutorials: "--tutorials <a,b>",
  index: "--index default|mdx|custom",
  use: "--use <kind:lang,...> (e.g. rest:curl,script:python), or --type <kind> --langs <list>",
  useBy: "--use <name>=<kind:lang,...>",
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
  ["--languages-as", "languagesAs"],
  ["--pm", "pm"],
]);
const BOOLEAN_FLAGS = new Set(["pages", "git", "install"]);

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
  /** @type {Record<string, Choice[]>} */
  const useBy = {};
  /** @type {string | undefined} */
  let kind;
  /** @type {string[] | undefined} */
  let langs;
  let yes = false;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = /** @type {string} */ (argv[i]);
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    const value = () => {
      const next = inline ?? argv[++i];
      if (next === undefined || next.startsWith("--")) throw new Error(`${flag} needs a value.`);
      return next;
    };
    if (flag === "--yes" || flag === "-y") yes = true;
    else if (flag === "--help" || flag === "-h") help = true;
    else if (flag === "--use") {
      const entry = value();
      const named = /^([^=:]+)=(.*)$/.exec(entry);
      if (named) useBy[/** @type {string} */ (named[1])] = parseUse(/** @type {string} */ (named[2]));
      else answers.use = parseUse(entry);
    } else if (flag === "--type") kind = value();
    else if (flag === "--langs") langs = list(value());
    else if (VALUE_FLAGS.has(flag)) {
      const key = /** @type {string} */ (VALUE_FLAGS.get(flag));
      answers[key] = key === "tutorials" ? list(value()) : value();
    } else if (flag.startsWith("--no-") && BOOLEAN_FLAGS.has(flag.slice(5))) answers[flag.slice(5)] = false;
    else if (flag.startsWith("--") && BOOLEAN_FLAGS.has(flag.slice(2))) answers[flag.slice(2)] = true;
    else if (flag.startsWith("-")) throw new Error(`Unknown option ${flag}. Run with --help for the list.`);
    else if (answers.dir === undefined) answers.dir = flag;
    else throw new Error(`Unexpected argument "${flag}": only one folder can be created.`);
  }
  if (langs !== undefined && kind === undefined) throw new Error("--langs needs --type.");
  if (kind !== undefined) {
    if (answers.use !== undefined) throw new Error("Use either --use or --type/--langs, not both.");
    const first = KINDS[/** @type {Kind} */ (kind)]?.langs[0];
    answers.use = (langs ?? (first ? [first] : [])).map((lang) => /** @type {Choice} */ ({ kind, lang }));
  }
  if (Object.keys(useBy).length > 0) answers.useBy = useBy;
  return { answers: /** @type {Partial<Answers>} */ (answers), yes, help };
}

/**
 * `rest:curl,script:python` → choices (checked later by `validate()`).
 * @param {string} value
 * @returns {Choice[]}
 */
export function parseUse(value) {
  return list(value).map((entry) => {
    const [kind = "", lang = ""] = entry.split(":");
    return /** @type {Choice} */ ({ kind, lang });
  });
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
    use: [{ kind: "web", lang: "javascript" }],
    useBy: {},
    languagesAs: "variants",
    pm: detectedPm,
    pages: true,
    git: true,
    install: true,
  };
}

/**
 * @param {Partial<Answers>} answers
 * @param {Answers} fallback
 * @returns {Answers}
 */
export function complete(answers, fallback) {
  return { ...fallback, ...answers };
}

/**
 * What each tutorial uses: `[""]` for a single tutorial, else one entry per series name.
 * @param {Pick<Answers, "layout" | "tutorials" | "use" | "useBy">} answers
 * @returns {[string, Choice[]][]}
 */
export function usesByTutorial(answers) {
  return answers.layout === "series" ? answers.tutorials.map((slug) => [slug, answers.useBy[slug] ?? answers.use]) : [["", answers.use]];
}

/**
 * Questions still to ask: the keys of `Answers` a prompt would cover.
 * @param {Partial<Answers>} answers
 * @returns {(keyof Answers)[]}
 */
export function unanswered(answers) {
  /** @type {(keyof Answers)[]} */
  const keys = ["dir", "layout", "use", "pm", "pages", "git", "install"];
  const series = answers.layout === "series";
  if (series) keys.splice(2, 0, "tutorials", "index");
  // Per-tutorial answers covering every name make the shared list unnecessary.
  const covered = series && answers.tutorials !== undefined && answers.tutorials.every((slug) => answers.useBy?.[slug] !== undefined);
  const uses = [answers.use ?? [], ...Object.values(answers.useBy ?? {})];
  if (series && uses.some((use) => use.length > 1)) keys.splice(keys.indexOf("pm"), 0, "languagesAs");
  return keys.filter((key) => (key === "use" ? answers.use === undefined && !covered : answers[key] === undefined));
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
  const series = answers.layout === "series";
  if (series) {
    if (answers.tutorials.length === 0) errors.push("--tutorials needs at least one name.");
    for (const slug of answers.tutorials) {
      if (!SLUG.test(slug)) errors.push(`--tutorials: "${slug}" must use lowercase letters, digits and dashes, and start with a letter or digit.`);
    }
    if (new Set(answers.tutorials).size !== answers.tutorials.length) errors.push("--tutorials lists a name twice.");
    for (const slug of Object.keys(answers.useBy)) {
      if (!answers.tutorials.includes(slug)) errors.push(`--use ${slug}=…: there is no tutorial named "${slug}" in --tutorials.`);
    }
  } else {
    if (answers.index !== "default") errors.push("--index needs --layout series.");
    if (Object.keys(answers.useBy).length > 0) errors.push("--use <name>=… needs --layout series.");
    if (answers.languagesAs === "siblings" && answers.use.length > 1) errors.push("--languages-as siblings needs --layout series.");
  }
  const checked = new Set();
  for (const [slug, use] of usesByTutorial(answers)) {
    if (checked.has(use)) continue;
    checked.add(use);
    const where = slug && answers.useBy[slug] ? ` (${slug})` : "";
    if (use.length === 0) errors.push(`--use${where} needs at least one kind:lang entry.`);
    /** @type {Map<string, string[]>} */
    const kindsByLang = new Map();
    for (const { kind, lang } of use) {
      const known = KINDS[kind];
      if (!known) {
        errors.push(`--use${where}: unknown kind "${kind}" (web, rest, script, native).`);
        continue;
      }
      if (!known.langs.includes(lang)) {
        errors.push(`--use${where}: "${lang}" is not available for ${kind} (${known.langs.join(", ")}).`);
        continue;
      }
      kindsByLang.set(lang, [...(kindsByLang.get(lang) ?? []), kind]);
    }
    for (const [lang, kinds] of kindsByLang) {
      if (kinds.length > 1) errors.push(`--use${where}: ${LANGUAGES[/** @type {Language} */ (lang)]} is picked more than once (${kinds.join(", ")}); a tutorial uses each language once.`);
    }
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
