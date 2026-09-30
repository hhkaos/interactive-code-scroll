// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES, TYPES, packageName, titleFrom } from "./options.mjs";

/** @typedef {import("./options.mjs").Answers} Answers */
/** @typedef {import("./options.mjs").Language} Language */
/** @typedef {import("./options.mjs").TutorialType} TutorialType */

const TEMPLATES = fileURLToPath(new URL("./templates/", import.meta.url));
export const CUSTOM_INDEX = "site/index.astro";

/** The file each language's steps point at (the variant `entry`). */
/** @type {Record<TutorialType, Partial<Record<Language, string>>>} */
const ENTRY = {
  web: { javascript: "main.js" },
  rest: { curl: "list-items.sh", python: "list_items.py", javascript: "list-items.mjs" },
  script: { python: "main.py", javascript: "main.mjs" },
  native: { kotlin: "Main.kt", swift: "main.swift", csharp: "Program.cs" },
};

const DESCRIPTION = {
  web: "A web page that greets the reader by name.",
  rest: "Call a REST API and read its JSON response.",
  script: "A script that prints a greeting.",
  native: "An app that prints a greeting.",
};

/**
 * @typedef {{
 *   version: string;
 *   astro: string;
 *   pnpm?: string;
 * }} Versions
 */

/**
 * @typedef {{ dir: string; title: string; langs: Language[]; order?: number; family?: string; familyLabel?: string }} TutorialPlan
 */

/**
 * The tutorials to generate: one, one per name, or one per name and language (siblings).
 * @param {Answers} answers
 * @returns {TutorialPlan[]}
 */
export function tutorialPlans(answers) {
  if (answers.layout === "single") return [{ dir: "tutorial", title: titleFrom(answers.dir), langs: answers.langs }];
  const siblings = answers.languagesAs === "siblings" && answers.langs.length > 1;
  return answers.tutorials.flatMap((slug, i) =>
    siblings
      ? answers.langs.map((lang) => ({
          dir: `tutorials/${slug}-${lang}`,
          title: `${titleFrom(slug)} (${LANGUAGES[lang]})`,
          langs: [lang],
          order: i + 1,
          family: slug,
          familyLabel: LANGUAGES[lang],
        }))
      : [{ dir: `tutorials/${slug}`, title: titleFrom(slug), langs: answers.langs, order: i + 1 }],
  );
}

/**
 * Every file of the new project, by path relative to its folder. Pure apart from reading the templates.
 * @param {Answers} answers
 * @param {Versions} versions
 * @returns {Map<string, string>}
 */
export function planProject(answers, versions) {
  /** @type {Map<string, string>} */
  const files = new Map();
  const series = answers.layout === "series";
  const custom = series && answers.index === "custom";
  const title = titleFrom(answers.dir);

  files.set("package.json", packageJson(answers, versions, custom));
  files.set(".gitignore", "node_modules/\ndist/\n.astro/\n.interactive-code-scroll/\n");
  if (answers.pm === "pnpm") files.set("pnpm-workspace.yaml", "allowBuilds:\n  esbuild: true\n");
  files.set("README.md", readme(answers, title));

  for (const tutorial of tutorialPlans(answers)) {
    for (const [path, content] of tutorialFiles(answers.type, tutorial, series)) files.set(`${tutorial.dir}/${path}`, content);
  }
  if (series && answers.index === "mdx") files.set("tutorials/index.mdx", indexMdx(title));
  if (custom) files.set(CUSTOM_INDEX, customIndex(title));
  if (answers.pages) files.set(".github/workflows/pages.yml", pagesWorkflow(answers.pm));
  return files;
}

/** @param {"npm" | "pnpm"} pm */
export function pagesWorkflow(pm) {
  return readFileSync(join(TEMPLATES, "pages", `pages-${pm}.yml`), "utf8");
}

/**
 * @param {Answers} answers
 * @param {Versions} versions
 * @param {boolean} custom
 */
function packageJson(answers, versions, custom) {
  const index = custom ? ` --index ${CUSTOM_INDEX}` : "";
  /** @type {Record<string, unknown>} */
  const data = {
    name: packageName(answers.dir),
    private: true,
    type: "module",
    scripts: {
      dev: `interactive-code-scroll dev${index}`,
      build: `interactive-code-scroll build${index}`,
      serve: "interactive-code-scroll serve",
    },
    devDependencies: {
      astro: versions.astro,
      "interactive-code-scroll": `^${versions.version}`,
    },
  };
  if (answers.pm === "pnpm" && versions.pnpm) data.packageManager = `pnpm@${versions.pnpm}`;
  return `${JSON.stringify(data, null, 2)}\n`;
}

/**
 * @param {TutorialType} type
 * @param {TutorialPlan} tutorial
 * @param {boolean} series
 * @returns {Map<string, string>}
 */
function tutorialFiles(type, tutorial, series) {
  /** @type {Map<string, string>} */
  const files = new Map();
  const variants = tutorial.langs.length > 1;
  for (const lang of tutorial.langs) {
    const source = join(TEMPLATES, type, lang);
    for (const file of listFiles(source)) {
      const [top, ...rest] = file.split("/");
      files.set(variants && top === "code" ? ["code", lang, ...rest].join("/") : file, readFileSync(join(source, file), "utf8"));
    }
  }
  for (const shared of ["requests", "output"]) {
    const source = join(TEMPLATES, type, shared);
    for (const file of listFiles(source)) files.set(`${shared}/${file}`, readFileSync(join(source, file), "utf8"));
  }
  files.set("tutorial.mdx", tutorialMdx(type, tutorial, series));
  return files;
}

/**
 * @param {string} dir
 * @returns {string[]} paths relative to `dir`, sorted; none when it does not exist
 */
function listFiles(dir) {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split("\\").join("/"))
      .sort();
  } catch {
    return [];
  }
}

/**
 * @param {TutorialType} type
 * @param {TutorialPlan} tutorial
 * @param {boolean} series
 */
function tutorialMdx(type, tutorial, series) {
  const variants = tutorial.langs.length > 1;
  const entry = /** @param {Language} lang */ (lang) => /** @type {string} */ (ENTRY[type][lang]);
  const lines = ["---", `title: ${yamlString(tutorial.title)}`, `description: ${yamlString(DESCRIPTION[type])}`];
  if (series) {
    lines.push(`tags: [${[TYPES[type].label, ...tutorial.langs.map((lang) => LANGUAGES[lang])].map(yamlString).join(", ")}]`);
    lines.push("level: Beginner", "duration: 10 min", `order: ${tutorial.order}`);
  }
  if (tutorial.family) lines.push(`family: ${tutorial.family}`, `familyLabel: ${yamlString(/** @type {string} */ (tutorial.familyLabel))}`);
  lines.push(`preview: ${type === "web" ? "both" : "off"}`);
  if (variants) {
    lines.push("variants:");
    for (const lang of tutorial.langs) lines.push(`  - { id: ${lang}, label: ${yamlString(LANGUAGES[lang])}, dir: ${lang}, entry: ${entry(lang)} }`);
  }
  lines.push("---", "");
  // Without variants, each step names its file; with variants, the entry of the active variant is used.
  const file = variants ? "" : ` file="${entry(/** @type {Language} */ (tutorial.langs[0]))}"`;
  const pick = variants ? ["", "Pick a language in the code header: every step follows along.", ""] : [];
  return [...lines, ...STEPS[type](file, pick)].join("\n");
}

/** @type {Record<TutorialType, (file: string, pick: string[]) => string[]>} */
const STEPS = {
  web: (file) => [
    "<Intro>",
    "",
    "## What you will build",
    "",
    "A page that greets the reader by name. Replace this example with your own tutorial: each step highlights a region of a file in `code/`, and the Preview runs `code/index.html`.",
    "",
    "</Intro>",
    "",
    '<Step id="page" file="index.html" region="page">',
    "",
    "## Add the page",
    "",
    "`code/index.html` is the Preview entry. `#region page` and `#endregion page` comments mark the lines this step highlights; they are removed from the Preview and the downloads.",
    "",
    "</Step>",
    "",
    `<Step id="config"${file} region="config">`,
    "",
    "## Configure",
    "",
    "A `// @var name` comment turns the literal into a field. Type a name: the code, the downloads and the Preview use it.",
    "",
    '<VarField name="name" label="Name" persist />',
    "",
    "</Step>",
    "",
    `<Step id="render"${file} region="render">`,
    "",
    "## Show the greeting",
    "",
    "The Preview runs the code with your value.",
    "",
    "</Step>",
    "",
  ],
  rest: (file, pick) => [
    "<Intro>",
    "",
    "## What you will build",
    "",
    "A request to a REST API and its JSON response. `https://api.example.com` is a placeholder: point `requests/items.http` and the code at your API, and save a real response in `output/items.json`.",
    ...pick,
    "",
    "</Intro>",
    "",
    `<Step id="config"${file} region="config">`,
    "",
    "## Set your API key",
    "",
    "A `@var apiKey` comment turns the literal into a field. The value fills the code, the downloads and the request you run from this page, and stays in this browser.",
    "",
    '<VarField name="apiKey" label="API key" secret />',
    "",
    "</Step>",
    "",
    `<Step id="request"${file} region="request" output="items.json" request="list-items">`,
    "",
    "## Send the request",
    "",
    "**Run request** sends `list-items` from `requests/items.http` with your key. Until it reaches a real API, the Result pane shows the response captured in `output/items.json`.",
    "",
    "</Step>",
    "",
  ],
  script: (file, pick) => [
    "<Intro>",
    "",
    "## What you will build",
    "",
    "A script that prints a greeting. Replace this example with your own code, and save what it prints in `output/run.txt`.",
    ...pick,
    "",
    "</Intro>",
    "",
    `<Step id="config"${file} region="config">`,
    "",
    "## Configure",
    "",
    "A `@var name` comment turns the literal into a field. Type a name: the code and the downloads use it.",
    "",
    '<VarField name="name" label="Name" persist />',
    "",
    "</Step>",
    "",
    `<Step id="run"${file} region="run" output="run.txt">`,
    "",
    "## Run it",
    "",
    "The Result pane shows the output captured in `output/run.txt`.",
    "",
    "</Step>",
    "",
  ],
  native: (file, pick) => [
    "<Intro>",
    "",
    "## What you will build",
    "",
    "An app that prints a greeting. Replace this example with your own code: readers download it with the ZIP button and run it in their IDE.",
    ...pick,
    "",
    "</Intro>",
    "",
    `<Step id="config"${file} region="config">`,
    "",
    "## Configure",
    "",
    "A `@var name` comment turns the literal into a field. Type a name: the code and the downloads use it.",
    "",
    '<VarField name="name" label="Name" persist />',
    "",
    "</Step>",
    "",
    `<Step id="run"${file} region="run">`,
    "",
    "## Print the greeting",
    "",
    "Add screenshots of the running app to `images/` to show readers the result.",
    "",
    "</Step>",
    "",
  ],
};

/** @param {string} title */
function indexMdx(title) {
  return [
    "---",
    `title: ${yamlString(title)}`,
    "description: Tutorials built with InteractiveCodeScroll.",
    "---",
    "",
    "Introduce your tutorials here. `<TutorialFilter />` places the tag filter, and each `<TutorialList />` renders cards (filter a list with `tags=\"…\"` or `level=\"…\"` to build sections).",
    "",
    "<TutorialFilter />",
    "",
    "## All tutorials",
    "",
    "<TutorialList />",
    "",
  ].join("\n");
}

/** @param {string} title */
function customIndex(title) {
  return `---
import { tutorials, TutorialFilter, TutorialList } from "interactive-code-scroll/series";

const title = ${JSON.stringify(title)};
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <h1>{title}</h1>
      <p>{tutorials.length} tutorials. This page is yours: edit ${CUSTOM_INDEX} to design it.</p>
      <TutorialFilter />
      <TutorialList />
    </main>
  </body>
</html>
`;
}

/**
 * @param {Answers} answers
 * @param {string} title
 */
function readme(answers, title) {
  const run = answers.pm === "pnpm" ? "pnpm" : "npm run";
  const layout =
    answers.layout === "series"
      ? "Each folder in `tutorials/` is a tutorial, published at `/<folder>/`, with an index page at `/`."
      : "The tutorial lives in `tutorial/`: `tutorial.mdx` holds the explanations, `code/` the code it walks through.";
  return `# ${title}

Built with [InteractiveCodeScroll](https://github.com/hhkaos/interactive-code-scroll).

${layout}

\`\`\`sh
${answers.pm} install
${run} dev      # live preview while you write
${run} build    # static site in dist/
${run} serve    # serve the built site locally
\`\`\`

Authoring reference: https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/authoring.md
${answers.pages ? "\nPublishing: `.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main` (Settings -> Pages -> Source: GitHub Actions).\n" : ""}`;
}

/** @param {string} value */
function yamlString(value) {
  return /^[\w .()-]+$/.test(value) && !/^[\d-]/.test(value) ? value : JSON.stringify(value);
}
