# CLI Reference

InteractiveCodeScroll ships a generic CLI. It does not contain ArcGIS, OAuth or provider-specific assumptions.

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
