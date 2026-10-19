# Project setup, files and commands

## Folder structure

```text
tutorial/
  tutorial.mdx       # frontmatter + prose + components
  code/              # the final runnable project, with markers in comments
  images/            # logo, screenshots, carousel images
  embeds/            # optional: pages shown instead of code (a slide deck build)
  output/            # optional: captured results for the Result pane
  requests/          # optional: .http requests (zipped with the project)
  field-options/     # optional: JSON option lists for <VarField options> (not published)
```

## Files that are not published

- Paths starting with `.` at any depth (`.env`, `.venv/`, `.github/`): left out unless frontmatter `include` lists them. The build warns about each such folder.
- Gitignored paths (every `.gitignore` inside `code/` and up to the git repo root): left out unless `include` lists them (the build then warns).
- Generated folders (`node_modules/`, `__pycache__/`, Python virtual envs, tool caches): never read. Running `npm install` or `python -m venv .venv` inside `code/` is fine.
- With `files` set, other text files get no tab but still go to the ZIP and the Preview. Binary files never get a tab. A `<Step file>` and any `@var` must be in a file shown in tabs.

```yaml
include: [".github/workflows/*.yml", ".env.example"]
```

## Generated for readers and AI assistants

- A ZIP of the project with the reader's form values applied.
- `tutorial.md` per tutorial (`tutorial.<variant>.md` per variant) and `llms.txt` at the site root: plain Markdown with the prose, each step's code and the final code. Absolute URLs need Astro `site` (`--site`). `llms: false` opts out.

## CLI

Package `interactive-code-scroll` (alias `ics`). Run through the project: `npx interactive-code-scroll <command>`, `pnpm exec interactive-code-scroll <command>`, or the `package.json` scripts (`npm run dev -- --tutorial .`, options after `--`).

| Command | Does |
|---|---|
| `dev` | Dev server with live reload and an error overlay. Runs until stopped. |
| `build` | Static site in `dist/`; fails on any broken reference. |
| `serve` | Serves the built site locally (offline fallback for talks). |
| `check [--json]` | The build's validation in about a second, no Astro (see the `ics-verify` skill). |
| `doctor` | Shows project detection and the recommended command. |
| `init-scripts [--write]` | Adds `dev`/`build`/`serve` scripts to `package.json`. |

| Option | Commands | Notes |
|---|---|---|
| `--root <dir>` | all | Project root (default: current folder). |
| `--tutorial <dir>` | all | Tutorial folder (default `tutorial`, or `.` with a root `tutorial.mdx`). |
| `--tutorials <dir>` | all | Series folder (auto-detected for `tutorials/`). |
| `--index <file>` | all | Series: custom `.astro` index page. |
| `--base <path>`, `--site <url>` | `dev`, `build`, `serve` | Astro base path and public origin (GitHub Pages project sites need `--base /<repo>`). |
| `--port`, `--host` | `dev`, `serve` | |
| `--outDir <dir>` | `build` | |
| `--json` | `check` | Machine-readable problems. |

Arguments after `--` go to Astro.

## Create a project (scaffolder)

`npm create interactive-code-scroll@latest [dir] -- <flags>` (or `pnpm create …`). Without a terminal every question needs a flag, or `--yes` for the defaults; a missing one is reported by name. Existing files are never overwritten.

| Flag | Values |
|---|---|
| `--layout` | `single`, `series` |
| `--tutorials` | `a,b` (series tutorial folder names) |
| `--index` | `default`, `mdx`, `custom` (series) |
| `--use` | `kind:lang,…`: `web:javascript`; `rest:curl`, `rest:python`, `rest:node`; `script:python`, `script:node`; `native:kotlin`, `native:swift`, `native:csharp`. Series: `--use <name>=kind:lang,…` per tutorial. |
| `--type`, `--langs` | shorthand: `--type rest --langs curl,node` |
| `--languages-as` | `variants`, `siblings` (several languages in a series tutorial) |
| `--pm` | `npm`, `pnpm` |
| `--pages` / `--no-pages` | GitHub Pages workflow |
| `--git` / `--no-git` | `git init` |
| `--install` / `--no-install` | install dependencies |
| `-y`, `--yes` | defaults for the rest |

```sh
npm create interactive-code-scroll@latest docs -- --layout series --tutorials map,geocode \
  --use map=web:javascript,native:kotlin --use geocode=rest:curl,rest:python \
  --languages-as variants --index mdx --pm npm --pages --yes
```

## Deployment

GitHub Pages: the scaffolder's `--pages` workflow builds with `--site` and `--base`. Any static host serves `dist/`. Presenting from a laptop: `build` then `serve` works without the network (except external Preview/API calls).
