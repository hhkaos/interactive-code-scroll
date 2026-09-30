# Deployment Guide

InteractiveCodeScroll outputs a static site. Any static host can serve the generated `dist/` folder.

## GitHub Pages

Copy one of the workflows below to `.github/workflows/pages.yml` in your tutorial repository. The same file publishes a single tutorial or a series site: the CLI detects the layout (`tutorial/`, a root `tutorial.mdx`, or `tutorials/`), so there is nothing series-specific to configure.

Configure Pages in the GitHub repository:

1. Open **Settings -> Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to the default branch.

What the workflow does:

- **Push to `main`** (or a manual run from the Actions tab): builds and deploys. Change `main` if your default branch has another name.
- **Pull request**: builds only, so a broken reference fails the check before it reaches the site. Nothing is uploaded or deployed.
- A build error (for example a region the MDX references but the code does not define) fails the run and the published site stays as it was.

### npm

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: read
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - id: pages
        uses: actions/configure-pages@v6

      - name: Build site
        env:
          ICS_SITE: ${{ vars.ICS_SITE || steps.pages.outputs.origin }}
          ICS_BASE: ${{ vars.ICS_BASE || format('{0}/', steps.pages.outputs.base_path) }}
        run: npx --no-install interactive-code-scroll build --site "$ICS_SITE" --base "$ICS_BASE"

      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

### pnpm

The pnpm version comes from the `packageManager` field of your `package.json` (for example `"packageManager": "pnpm@11.13.1"`).

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: read
    steps:
      - uses: actions/checkout@v7

      - name: Set up pnpm
        uses: pnpm/action-setup@v6
        with:
          run_install: false

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - id: pages
        uses: actions/configure-pages@v6

      - name: Build site
        env:
          ICS_SITE: ${{ vars.ICS_SITE || steps.pages.outputs.origin }}
          ICS_BASE: ${{ vars.ICS_BASE || format('{0}/', steps.pages.outputs.base_path) }}
        run: pnpm exec interactive-code-scroll build --site "$ICS_SITE" --base "$ICS_BASE"

      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

### Site URL and base path

`actions/configure-pages` reports where GitHub serves the site, and the workflow passes it to the build:

| Pages site | `site` | `base` | Published at |
|---|---|---|---|
| Project site (`<owner>/<repo>`) | `https://<owner>.github.io` | `/<repo>/` | `https://<owner>.github.io/<repo>/` |
| User or organization site (`<owner>/<owner>.github.io`) | `https://<owner>.github.io` | `/` | `https://<owner>.github.io/` |
| Custom domain | `https://docs.example.com` | `/` | `https://docs.example.com/` |

Override either value with a repository variable (**Settings -> Secrets and variables -> Actions -> Variables**):

| Variable | Example | Notes |
|---|---|---|
| `ICS_SITE` | `https://docs.example.com` | Origin only. No trailing path. |
| `ICS_BASE` | `/tutorials/` | Starts and ends with `/`. |

In a series site, every tutorial is published under the base: `tutorials/auth/` becomes `https://<owner>.github.io/<repo>/auth/`, with its Preview, published code and captured outputs below it, and the index page at the base itself. OAuth redirect URIs registered for a tutorial must use that full path.

### This repository

`.github/workflows/publish-getting-started.yml` publishes the getting-started tutorial (`examples/getting-started`) with the same `configure-pages` defaults and the same `ICS_SITE` / `ICS_BASE` overrides. `.github/workflows/ci.yml` runs unit tests, `astro check` and the E2E suite on every push to `main`.

## Manual Build

From this repository:

```sh
pnpm --filter example-getting-started build -- --base /interactive-code-scroll/ --site https://hhkaos.github.io
```

From a standalone tutorial or series project:

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
