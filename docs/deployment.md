# Deployment Guide

InteractiveCodeScroll outputs a static site. Any static host can serve the generated `dist/` folder.

## GitHub Pages

The repository includes a workflow for the dogfooding tutorial in `examples/getting-started`. It builds and deploys on pushes to `main` or `master`.

Configure Pages in the GitHub repository:

1. Open **Settings -> Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to the default branch.

The workflow has safe defaults for a GitHub Pages project site:

- `site`: `https://<owner>.github.io`
- `base`: `/<repo>/`

Override them with repository variables when needed:

| Variable | Example | Notes |
|---|---|---|
| `ICS_GETTING_STARTED_SITE` | `https://docs.example.com` | Origin only. No trailing path. |
| `ICS_GETTING_STARTED_BASE` | `/` | Use `/` for a custom domain or user/organization page. |

The deployed URL is:

```text
${ICS_GETTING_STARTED_SITE}${ICS_GETTING_STARTED_BASE}
```

With the defaults, this repository publishes to:

```text
https://<owner>.github.io/<repo>/
```

## Manual Build

From this repository:

```sh
pnpm --filter example-getting-started build -- --base /interactive-code-scroll/ --site https://hhkaos.github.io
```

From a standalone tutorial project:

```sh
npm exec -- interactive-code-scroll build --base /my-repo/ --site https://my-org.github.io
```

Then upload the generated `dist/` directory to any static host.

## Local Fallback

Serve the built site locally:

```sh
npm exec -- interactive-code-scroll serve
```

The framework works offline after assets are available locally, but tutorial Preview code may still depend on external services or CDNs.
