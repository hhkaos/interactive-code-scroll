// @ts-check
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import { nextSteps } from "./next-steps.mjs";
import { FLAGS, KINDS, LANGUAGES, SLUG, complete, defaults, list, parseArgs, parseUse, unanswered, validate } from "./options.mjs";
import { commands, detectPackageManager, pnpmVersion } from "./package-manager.mjs";
import { planProject } from "./plan.mjs";
import { ASTRO_VERSION, VERSION } from "./versions.mjs";
import { isNonEmptyDir, writeProject } from "./write.mjs";

/** @typedef {import("./options.mjs").Answers} Answers */

export const USAGE = `Usage: npm create interactive-code-scroll [dir] -- [options]
       pnpm create interactive-code-scroll [dir] [options]

Asks what to create, writes the project and prints the next steps.
Every question also has an option; --yes answers the rest with defaults.

Options:
  --layout single|series           One tutorial, or several with an index page.
  --tutorials <a,b>                Series: tutorial folder names.
  --index default|mdx|custom       Series: default index, tutorials/index.mdx, or site/index.astro.
  --use <kind:lang,...>            What the tutorials use, e.g. rest:curl,script:python. Kinds and
                                   languages: web:javascript; rest:curl|python|node;
                                   script:python|node; native:kotlin|swift|csharp.
                                   Series: repeat as --use <name>=<kind:lang,...> for one tutorial.
  --type <kind> --langs <list>     Shorthand for one kind: --type rest --langs curl,python.
  --languages-as variants|siblings Series with several languages in a tutorial: one tutorial with a
                                   code switcher, or one tutorial per language.
  --pm npm|pnpm                    Package manager.
  --pages / --no-pages             Add a GitHub Pages workflow.
  --git / --no-git                 Run git init.
  --install / --no-install         Install dependencies.
  -y, --yes                        Use defaults for everything not given.
  -h, --help                       Show this help.`;

class Cancelled extends Error {}

/**
 * @template T
 * @param {T} value
 * @returns {Exclude<T, symbol>}
 */
function answer(value) {
  if (p.isCancel(value)) throw new Cancelled();
  return /** @type {Exclude<T, symbol>} */ (value);
}

/** @typedef {import("./options.mjs").Choice} Choice */

/**
 * One checkbox list of kind:language entries, grouped by kind.
 * @param {string} message
 * @param {Choice[]} initial
 * @returns {Promise<Choice[]>}
 */
async function pickUse(message, initial) {
  /** @type {Record<string, { value: string; label: string }[]>} */
  const options = {};
  for (const [kind, { label, hint, langs }] of Object.entries(KINDS)) {
    options[`${label} (${hint})`] = langs.map((lang) => ({ value: `${kind}:${lang}`, label: LANGUAGES[lang] }));
  }
  const picked = answer(
    await p.groupMultiselect({
      message: `${message} (space to select, enter to confirm)`,
      options,
      initialValues: initial.map(({ kind, lang }) => `${kind}:${lang}`),
      required: true,
      selectableGroups: false,
    }),
  );
  return parseUse(picked.join(","));
}

/**
 * Asks every question that has no answer yet, in order.
 * @param {Partial<Answers>} given
 * @param {Answers} fallback
 * @returns {Promise<Answers>}
 */
async function ask(given, fallback) {
  const a = { ...given };
  if (a.dir === undefined) {
    a.dir = answer(await p.text({ message: "Project folder", placeholder: fallback.dir, defaultValue: fallback.dir }));
  }
  if (a.layout === undefined) {
    a.layout = answer(
      await p.select({
        message: "What do you want to create?",
        options: [
          { value: /** @type {const} */ ("single"), label: "One tutorial" },
          { value: /** @type {const} */ ("series"), label: "A series", hint: "several tutorials with an index page" },
        ],
      }),
    );
  }
  if (a.layout === "series") {
    if (a.tutorials === undefined) {
      const names = answer(
        await p.text({
          message: "Tutorial names (folders, comma-separated)",
          placeholder: fallback.tutorials.join(", "),
          defaultValue: fallback.tutorials.join(","),
          validate: (value) => {
            const bad = list(value || fallback.tutorials.join(",")).find((slug) => !SLUG.test(slug));
            return bad === undefined ? undefined : `"${bad}": use lowercase letters, digits and dashes.`;
          },
        }),
      );
      a.tutorials = list(names);
    }
    if (a.index === undefined) {
      a.index = answer(
        await p.select({
          message: "Index page",
          options: [
            { value: /** @type {const} */ ("default"), label: "Default list", hint: "cards with a tag filter" },
            { value: /** @type {const} */ ("mdx"), label: "index.mdx", hint: "your title, text and sections around the cards" },
            { value: /** @type {const} */ ("custom"), label: "Custom design", hint: "an Astro page you write (site/index.astro)" },
          ],
        }),
      );
    }
  }
  if (a.use === undefined) {
    const names = a.layout === "series" ? a.tutorials ?? [] : [];
    const uncovered = names.filter((slug) => a.useBy?.[slug] === undefined);
    const same =
      uncovered.length < 2 ||
      answer(await p.confirm({ message: "Do all tutorials use the same languages?", initialValue: true }));
    if (same) {
      if (a.layout !== "series" || uncovered.length > 0) {
        a.use = await pickUse(a.layout === "series" ? "What will the tutorials use?" : "What will the tutorial use?", fallback.use);
      }
    } else {
      /** @type {Record<string, Choice[]>} */
      const useBy = { ...a.useBy };
      for (const slug of uncovered) useBy[slug] = await pickUse(`What will ${slug} use?`, fallback.use);
      a.useBy = useBy;
    }
  }
  const uses = [a.use ?? [], ...Object.values(a.useBy ?? {})];
  if (a.languagesAs === undefined && a.layout === "series" && uses.some((use) => use.length > 1)) {
    a.languagesAs = answer(
      await p.select({
        message: "With several languages in a tutorial",
        options: [
          { value: /** @type {const} */ ("variants"), label: "Same explanation", hint: "one tutorial with a code switcher" },
          { value: /** @type {const} */ ("siblings"), label: "Own explanation per language", hint: "one tutorial per language, linked by a menu" },
        ],
      }),
    );
  }
  if (a.pm === undefined) {
    a.pm = answer(
      await p.select({
        message: "Package manager",
        initialValue: fallback.pm,
        options: [
          { value: /** @type {const} */ ("npm"), label: "npm" },
          { value: /** @type {const} */ ("pnpm"), label: "pnpm" },
        ],
      }),
    );
  }
  if (a.pages === undefined) a.pages = answer(await p.confirm({ message: "Add a GitHub Pages workflow?", initialValue: fallback.pages }));
  if (a.git === undefined) a.git = answer(await p.confirm({ message: "Initialize a git repository?", initialValue: fallback.git }));
  if (a.install === undefined) a.install = answer(await p.confirm({ message: "Install dependencies now?", initialValue: fallback.install }));
  return complete(a, fallback);
}

/**
 * @param {string} dir
 */
function insideGitRepo(dir) {
  return spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, encoding: "utf8" }).stdout.trim() === "true";
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
export async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    console.error(/** @type {Error} */ (error).message);
    return 1;
  }
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }
  const detected = detectPackageManager();
  const fallback = defaults(detected.pm);
  const interactive = !parsed.yes && Boolean(process.stdin.isTTY && process.stdout.isTTY);

  /** @type {Answers} */
  let answers;
  try {
    if (interactive) {
      p.intro("Create an InteractiveCodeScroll project");
      answers = await ask(parsed.answers, fallback);
    } else {
      const missing = parsed.yes ? [] : unanswered(parsed.answers);
      if (missing.length > 0) {
        console.error(`No terminal to ask in. Pass these options, or --yes for defaults:\n${missing.map((key) => `  ${FLAGS[key]}`).join("\n")}`);
        return 1;
      }
      answers = complete(parsed.answers, fallback);
    }
    const errors = validate(answers);
    if (errors.length > 0) {
      console.error(errors.join("\n"));
      return 1;
    }

    const target = resolve(answers.dir);
    if (isNonEmptyDir(target)) {
      if (!interactive) {
        console.error(`${answers.dir} is not empty. Choose a new folder, or run interactively to add the files to it.`);
        return 1;
      }
      const go = answer(await p.confirm({ message: `${answers.dir} is not empty. Add the project files to it? Existing files are kept.`, initialValue: false }));
      if (!go) throw new Cancelled();
    }

    const pnpm = answers.pm === "pnpm" ? pnpmVersion(detected.pnpm) : undefined;
    const files = planProject(answers, { version: VERSION, astro: ASTRO_VERSION, pnpm });
    const { written, skipped } = writeProject(target, files);
    p.log.success(`Created ${written.length} files in ${answers.dir}`);
    if (skipped.length > 0) p.log.warn(`Kept existing files: ${skipped.join(", ")}`);
    if (answers.pm === "pnpm" && !pnpm) p.log.warn('Add "packageManager": "pnpm@<version>" to package.json: the Pages workflow reads it.');

    let gitInitialized = false;
    if (answers.git) {
      if (insideGitRepo(target)) p.log.info("Already inside a git repository: skipped git init.");
      else {
        gitInitialized = spawnSync("git", ["init", "-b", "main"], { cwd: target, stdio: "ignore" }).status === 0;
        if (gitInitialized) p.log.success("Initialized a git repository (branch main).");
        else p.log.warn("git init failed; run it yourself.");
      }
    }
    let installed = false;
    if (answers.install) {
      p.log.step(`${commands(answers.pm).install}…`);
      installed = spawnSync(answers.pm, ["install"], { cwd: target, stdio: "inherit", shell: process.platform === "win32" }).status === 0;
      if (!installed) p.log.warn("Installing dependencies failed; run it again from the project folder.");
    }
    p.note(nextSteps(answers, { installed, gitInitialized }).join("\n"), "Next steps");
    p.outro("Happy writing!");
    return 0;
  } catch (error) {
    if (error instanceof Cancelled) {
      p.cancel("Cancelled. Nothing else was written.");
      return 1;
    }
    throw error;
  }
}
