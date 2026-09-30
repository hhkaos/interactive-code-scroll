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

Inspect project detection:

```sh
npm exec -- interactive-code-scroll doctor
```

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
