# CLI Reference

InteractiveCodeScroll ships a generic CLI. It does not contain ArcGIS, OAuth or provider-specific assumptions.

## Create a Project

`create-interactive-code-scroll` writes a new project and prints the next steps:

```sh
npm create interactive-code-scroll@latest [dir]
pnpm create interactive-code-scroll@latest [dir]
```

It asks, in order: the folder; one tutorial or a series; for a series, the tutorial names and the index page (default list, `tutorials/index.mdx`, or a custom `site/index.astro`); what each tutorial uses, from one checkbox list grouped by kind (web app, REST API, script, native app) and language; with several languages in a tutorial, code variants or one tutorial per language; the package manager; a GitHub Pages workflow; `git init`; installing dependencies. Each tutorial is a small working example to replace. Existing files are never overwritten.

Every question has an option. Without a terminal (CI, scripts, agents), give them all or add `--yes` for the defaults; a missing one is reported by name.

| Option | Values | Notes |
|---|---|---|
| `--layout` | `single`, `series` | One tutorial, or several with an index page. |
| `--tutorials` | `a,b` | Series: tutorial folder names (`[a-z0-9][a-z0-9-]*`). |
| `--index` | `default`, `mdx`, `custom` | Series: default index, `tutorials/index.mdx`, or `site/index.astro` (wired with `--index` in the scripts). |
| `--use` | `kind:lang,…` | What the tutorials use: `web:javascript`; `rest:curl`, `rest:python`, `rest:node`; `script:python`, `script:node`; `native:kotlin`, `native:swift`, `native:csharp`. Kinds can be mixed; each language once per tutorial. In a series, `--use <name>=kind:lang,…` sets one tutorial (repeatable). |
| `--type`, `--langs` | `rest`, `curl,node` | Shorthand for one kind: `--type rest --langs curl,node`. |
| `--languages-as` | `variants`, `siblings` | Series with several languages in a tutorial: one tutorial with a code switcher, or one tutorial per language (`<name>-<lang>`, linked as [siblings](authoring.md#sibling-tutorials)). |
| `--pm` | `npm`, `pnpm` | Default: the package manager that ran the command. |
| `--pages` / `--no-pages` | | Adds `.github/workflows/pages.yml` (see [Deployment](deployment.md#github-pages)). |
| `--git` / `--no-git` | | `git init -b main`, skipped inside an existing repository. |
| `--install` / `--no-install` | | Installs dependencies. |
| `--agents` / `--no-agents` | `claude,copilot,agents` | Sets up [agent skills](#agent-skills) for those coding agents: a `skills` script (run after installing), `AGENTS.md`, and a `CLAUDE.md` that imports it for Claude Code. Default: none, also without a terminal. |
| `-y`, `--yes` | | Defaults for every question not given. |

```sh
npm create interactive-code-scroll@latest docs -- --layout series --tutorials map,geocode \
  --use map=web:javascript,native:kotlin --use geocode=rest:curl,rest:python \
  --languages-as variants --index mdx --pm npm --pages --yes
```

## Commands

```sh
interactive-code-scroll dev [options]
interactive-code-scroll build [options]
interactive-code-scroll serve [options]
interactive-code-scroll check [options]
interactive-code-scroll skills install [options]
interactive-code-scroll doctor [options]
interactive-code-scroll init-scripts [options]
```

Aliases:

```sh
ics dev
ics build
ics serve
```

## Options

| Option | Commands | Notes |
|---|---|---|
| `--root <dir>` | all | Project root. Defaults to the current directory. |
| `--tutorial <dir>` | all | Tutorial folder inside the root. Defaults to `tutorial`, or `.` when a root-level `tutorial.mdx` is detected. |
| `--tutorials <dir>` | all | Series site: folder whose subfolders are tutorials (`<dir>/<name>/tutorial.mdx`), each published at `/<name>/` with an index at `/`. Used automatically for `tutorials/` when there is no `tutorial/tutorial.mdx` and no root `tutorial.mdx`. Cannot be combined with `--tutorial`. |
| `--index <file>` | all | Series site only: `.astro` page, relative to the root, that replaces the index page. See [Custom index page](authoring.md#custom-index-page). |
| `--base <path>` | `dev`, `build`, `serve` | Forwarded to Astro. Useful for GitHub Pages project sites. |
| `--site <url>` | `dev`, `build`, `serve` | Forwarded to Astro. Used for absolute URLs and sitemap-like integrations. |
| `--port <port>` | `dev`, `serve` | Forwarded to Astro. |
| `--host [address]` | `dev`, `serve` | Forwarded to Astro. |
| `--outDir <dir>` | `build` | Forwarded to Astro. |
| `--write` | `init-scripts` | Writes suggested package scripts. |
| `--json` | `check` | Prints the problems as JSON. |
| `--agent <list>` | `skills install` | `claude` (`.claude/skills/`), `copilot` (`.github/skills/`), `agents` (`.agents/skills/`), comma-separated, or `all`. Default: the agent folders the project already has. |

Any arguments after `--` are passed to Astro.

## Common Commands

Run the default `tutorial/` folder:

```sh
npm exec -- interactive-code-scroll dev
npm exec -- interactive-code-scroll build
npm exec -- interactive-code-scroll serve
```

Run a tutorial stored at the project root:

```sh
npm exec -- interactive-code-scroll dev --tutorial .
```

Run a series site (every tutorial under `tutorials/`, plus the index page). Without a single tutorial in the project, `tutorials/` is detected, so the option is only needed for another folder:

```sh
npm exec -- interactive-code-scroll dev
npm exec -- interactive-code-scroll dev --tutorials guides
```

Replace the series index with your own Astro page:

```sh
npm exec -- interactive-code-scroll dev --index src/series-home.astro
```

Run one tutorial of a series on its own:

```sh
npm exec -- interactive-code-scroll dev --tutorial tutorials/auth
```

Add package scripts without overwriting existing scripts:

```sh
npm exec -- interactive-code-scroll init-scripts --write
```

Check every tutorial without building the site (see [Check without building](#check-without-building)):

```sh
npm exec -- interactive-code-scroll check
```

Inspect project detection:

```sh
npm exec -- interactive-code-scroll doctor
```

## Check without Building

`check` runs the same validation as `build` (frontmatter, every file, region, variable, image, output and request reference, and in a series the `index.mdx` and the rules across tutorials), without Astro, in about a second. Use it after each change, by hand or from a coding agent; `build` stays the final check, since it also compiles the pages.

```sh
npm exec -- interactive-code-scroll check
```

```text
error tutorial/tutorial.mdx:12:1 <Step> region "nope" not found in code/main.js
warning tutorial/tutorial.mdx:20:1 <summary> is rendered inside a paragraph; put a blank line between it and the <details> content
1 error, 1 warning in 1 tutorial.
```

With `--json`, the same problems come as one JSON object; paths are relative to the current folder, and `file`, `line` and `column` are left out when a problem has none:

```json
{
  "ok": false,
  "errors": 1,
  "warnings": 0,
  "problems": [
    { "severity": "error", "file": "tutorial/tutorial.mdx", "line": 12, "column": 1, "message": "<Step> region \"nope\" not found in code/main.js" }
  ]
}
```

The exit code is 1 when there is an error, 0 otherwise (warnings included).

## Agent Skills

The package ships [Agent Skills](https://agentskills.io) that teach coding agents this tool:

| Skill | Use it to |
|---|---|
| `ics-authoring` | Write and edit tutorials: layout, components, frontmatter, code markers, panes, variants, series, CLI. |
| `ics-verify` | Check a tutorial after each change (`check --json`, then `build`) and fix what fails. |
| `ics-tutorial-design` | Plan a tutorial before writing it: audience, goal, one idea per step, `TUTORIAL-PLAN.md`. |
| `ics-tutorial-review` | Review a draft as a first-time reader and an editor, with findings per step. |
| `ics-talk` | Prepare a tutorial for a talk: timing, slides as steps, big results, fallbacks, rehearsal. |
| `ics-migrate` | Convert a blog post, codelab or repository into a tutorial, or upgrade to a new version. |

`skills install` copies them, from the installed version, into the folders agents read in your project:

```sh
npm exec -- interactive-code-scroll skills install --agent claude
npm exec -- interactive-code-scroll skills install --agent claude,copilot
npm exec -- interactive-code-scroll skills install   # the agent folders the project already has
```

| `--agent` | Folder | For |
|---|---|---|
| `claude` | `.claude/skills/` | Claude Code |
| `copilot` | `.github/skills/` | GitHub Copilot |
| `agents` | `.agents/skills/` | Other agents that read this generic folder (VS Code, among others) |

Older copies of the same skills are replaced; other skills in those folders are kept. Run it again after upgrading the package, and commit the folders so everyone working on the tutorial gets them. Without `--agent`, it installs into `.claude/`, `.agents/` and `.github/skills/` when they exist, and otherwise lists the choices. Projects created with `--agents` get it as `npm run skills`.

## Package Script Argument Forwarding

When using npm scripts, pass CLI options after `--`:

```sh
npm run dev -- --tutorial tutorials/auth
```

Do not use this form:

```sh
npm run dev --tutorial tutorials/auth
```

npm consumes `--tutorial` before it reaches InteractiveCodeScroll.

## GitHub Pages Build

For a project site, pass the repository base path:

```sh
npm exec -- interactive-code-scroll build --base /my-repo/ --site https://my-org.github.io --outDir dist
```

For a custom domain or user/organization page, use `/` as the base:

```sh
npm exec -- interactive-code-scroll build --base / --site https://docs.example.com --outDir dist
```
