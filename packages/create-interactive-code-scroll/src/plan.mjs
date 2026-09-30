// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS, LANGUAGES, packageName, titleFrom, usesByTutorial } from "./options.mjs";

/** @typedef {import("./options.mjs").Answers} Answers */
/** @typedef {import("./options.mjs").Choice} Choice */
/** @typedef {import("./options.mjs").Kind} Kind */
/** @typedef {import("./options.mjs").Language} Language */

const TEMPLATES = fileURLToPath(new URL("./templates/", import.meta.url));
export const CUSTOM_INDEX = "site/index.astro";

/** The file each entry's steps point at (the variant `entry`). */
/** @type {Record<Kind, Partial<Record<Language, string>>>} */
const ENTRY = {
  web: { javascript: "main.js" },
  rest: { curl: "list-items.sh", python: "list_items.py", node: "list-items.mjs" },
  script: { python: "main.py", node: "main.mjs" },
  native: { kotlin: "Main.kt", swift: "main.swift", csharp: "Program.cs" },
};

/** @type {Record<Kind, string>} */
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
 * @typedef {{ dir: string; title: string; use: Choice[]; order?: number; family?: string; familyLabel?: string }} TutorialPlan
 */

/**
 * The tutorials to generate: one, one per name, or one per name and language (siblings).
 * @param {Answers} answers
 * @returns {TutorialPlan[]}
 */
export function tutorialPlans(answers) {
  if (answers.layout === "single") return [{ dir: "tutorial", title: titleFrom(answers.dir), use: answers.use }];
  return usesByTutorial(answers).flatMap(([slug, use], i) =>
    answers.languagesAs === "siblings" && use.length > 1
      ? use.map((choice) => ({
          dir: `tutorials/${slug}-${choice.lang}`,
          title: `${titleFrom(slug)} (${LANGUAGES[choice.lang]})`,
          use: [choice],
          order: i + 1,
          family: slug,
          familyLabel: LANGUAGES[choice.lang],
        }))
      : [{ dir: `tutorials/${slug}`, title: titleFrom(slug), use, order: i + 1 }],
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
    for (const [path, content] of tutorialFiles(tutorial, series)) files.set(`${tutorial.dir}/${path}`, content);
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
 * Kinds in first-use order.
 * @param {Choice[]} use
 * @returns {Kind[]}
 */
function kindsOf(use) {
  return [...new Set(use.map((choice) => choice.kind))];
}

/**
 * @param {TutorialPlan} tutorial
 * @param {boolean} series
 * @returns {Map<string, string>}
 */
function tutorialFiles(tutorial, series) {
  /** @type {Map<string, string>} */
  const files = new Map();
  const variants = tutorial.use.length > 1;
  for (const { kind, lang } of tutorial.use) {
    const source = join(TEMPLATES, kind, lang);
    for (const file of listFiles(source)) {
      const [top, ...rest] = file.split("/");
      files.set(variants && top === "code" ? ["code", lang, ...rest].join("/") : file, readFileSync(join(source, file), "utf8"));
    }
  }
  for (const kind of kindsOf(tutorial.use)) {
    for (const shared of ["requests", "output"]) {
      const source = join(TEMPLATES, kind, shared);
      for (const file of listFiles(source)) files.set(`${shared}/${file}`, readFileSync(join(source, file), "utf8"));
    }
  }
  files.set("tutorial.mdx", tutorialMdx(tutorial, series));
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
 * @param {TutorialPlan} tutorial
 * @param {boolean} series
 */
function tutorialMdx(tutorial, series) {
  const variants = tutorial.use.length > 1;
  const kinds = kindsOf(tutorial.use);
  const mixed = kinds.length > 1;
  const entry = /** @param {Choice} choice */ (choice) => /** @type {string} */ (ENTRY[choice.kind][choice.lang]);
  const description = mixed ? "The same example in several languages." : DESCRIPTION[/** @type {Kind} */ (kinds[0])];
  const lines = ["---", `title: ${yamlString(tutorial.title)}`, `description: ${yamlString(description)}`];
  if (series) {
    const tags = [...kinds.map((kind) => KINDS[kind].label), ...tutorial.use.map((choice) => LANGUAGES[choice.lang])];
    lines.push(`tags: [${tags.map(yamlString).join(", ")}]`, "level: Beginner", "duration: 10 min", `order: ${tutorial.order}`);
  }
  if (tutorial.family) lines.push(`family: ${tutorial.family}`, `familyLabel: ${yamlString(/** @type {string} */ (tutorial.familyLabel))}`);
  lines.push(`preview: ${kinds.includes("web") ? "both" : "off"}`);
  if (variants) {
    lines.push("variants:");
    for (const choice of tutorial.use) lines.push(`  - { id: ${choice.lang}, label: ${yamlString(LANGUAGES[choice.lang])}, dir: ${choice.lang}, entry: ${entry(choice)} }`);
  }
  // Each kind has its own steps; mixed kinds limit them to their variants and hide them from the others.
  if (mixed) lines.push("otherVariantSteps: hide");
  lines.push("---", "");

  const pick = variants ? ["", "Pick a language in the code header: every step follows along."] : [];
  const intro = mixed
    ? ["The same example in several languages. Replace it with your own tutorial: each step highlights a region of a file in `code/`."]
    : INTRO[/** @type {Kind} */ (kinds[0])];
  const body = ["<Intro>", "", "## What you will build", "", ...intro, ...pick, "", "</Intro>", ""];
  for (const kind of kinds) {
    const langs = tutorial.use.filter((choice) => choice.kind === kind);
    // Without variants, each step names its file; with variants, the entry of the active variant is used.
    const file = variants ? "" : ` file="${entry(/** @type {Choice} */ (langs[0]))}"`;
    const only = mixed ? ` only="${langs.map((choice) => choice.lang).join(" ")}"` : "";
    const id = /** @param {string} step */ (step) => (mixed ? `${step}-${kind}` : step);
    body.push(...STEPS[kind]({ id, file, only }));
  }
  return [...lines, ...body].join("\n");
}

/** @type {Record<Kind, string[]>} */
const INTRO = {
  web: ["A page that greets the reader by name. Replace this example with your own tutorial: each step highlights a region of a file in `code/`, and the Preview runs `code/index.html`."],
  rest: ["A request to a REST API and its JSON response. `https://api.example.com` is a placeholder: point `requests/items.http` and the code at your API, and save a real response in `output/items.json`."],
  script: ["A script that prints a greeting. Replace this example with your own code, and save what it prints in `output/run.txt`."],
  native: ["An app that prints a greeting. Replace this example with your own code: readers download it with the ZIP button and run it in their IDE."],
};

/**
 * @typedef {{ id: (step: string) => string; file: string; only: string }} StepAttrs
 */

/** @type {Record<Kind, (a: StepAttrs) => string[]>} */
const STEPS = {
  web: ({ id, file, only }) => [
    // The page step shows index.html of the web variant (or of the only code folder).
    `<Step id="${id("page")}" file="index.html" region="page"${only}>`,
    "",
    "## Add the page",
    "",
    "`index.html` is the Preview entry. `#region page` and `#endregion page` comments mark the lines this step highlights; they are removed from the Preview and the downloads.",
    "",
    "</Step>",
    "",
    `<Step id="${id("config")}"${file} region="config"${only}>`,
    "",
    "## Configure",
    "",
    "A `// @var name` comment turns the literal into a field. Type a name: the code, the downloads and the Preview use it.",
    "",
    '<VarField name="name" label="Name" persist />',
    "",
    "</Step>",
    "",
    `<Step id="${id("run")}"${file} region="run"${only}>`,
    "",
    "## Show the greeting",
    "",
    "The Preview runs the code with your value.",
    "",
    "</Step>",
    "",
  ],
  rest: ({ id, file, only }) => [
    `<Step id="${id("config")}"${file} region="config"${only}>`,
    "",
    "## Set your API key",
    "",
    "A `@var apiKey` comment turns the literal into a field. The value fills the code, the downloads and the request you run from this page, and stays in this browser.",
    "",
    '<VarField name="apiKey" label="API key" secret />',
    "",
    "</Step>",
    "",
    `<Step id="${id("run")}"${file} region="run" output="items.json" request="list-items"${only}>`,
    "",
    "## Send the request",
    "",
    "**Run request** sends `list-items` from `requests/items.http` with your key. Until it reaches a real API, the Result pane shows the response captured in `output/items.json`.",
    "",
    "</Step>",
    "",
  ],
  script: ({ id, file, only }) => [
    `<Step id="${id("config")}"${file} region="config"${only}>`,
    "",
    "## Configure",
    "",
    "A `@var name` comment turns the literal into a field. Type a name: the code and the downloads use it.",
    "",
    '<VarField name="name" label="Name" persist />',
    "",
    "</Step>",
    "",
    `<Step id="${id("run")}"${file} region="run" output="run.txt"${only}>`,
    "",
    "## Run it",
    "",
    "The Result pane shows the output captured in `output/run.txt`.",
    "",
    "</Step>",
    "",
  ],
  native: ({ id, file, only }) => [
    `<Step id="${id("config")}"${file} region="config"${only}>`,
    "",
    "## Configure",
    "",
    "A `@var name` comment turns the literal into a field. Type a name: the code and the downloads use it.",
    "",
    '<VarField name="name" label="Name" persist />',
    "",
    "</Step>",
    "",
    `<Step id="${id("run")}"${file} region="run"${only}>`,
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
