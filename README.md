# InteractiveCodeScroll

InteractiveCodeScroll builds guided, scroll-driven code tutorials from MDX and annotated source code.

Write the tutorial text once, keep the source files runnable, and let the generated static site synchronize explanations, highlighted code, images, form fields, Preview, copy and downloads. It is designed for technical writers, developer advocates and conference speakers who want one artifact that works both on stage and at home.

> Status: early alpha. The framework is usable, but authoring APIs may still change before v1.

## What You Can Build

- Conference-friendly tutorials with a documentation panel, code panel and keyboard/clicker navigation.
- Self-paced guides where each step focuses a file, region or image carousel.
- Client-side demos with an embedded Preview, "open in tab" fallback, copy buttons and ZIP downloads.
- Tutorials with author-defined fields that update code variables without making the source invalid.

InteractiveCodeScroll is generic. ArcGIS, OAuth, maps and other topics belong to tutorials, not to the core package.

## Quick Start

Install Astro and InteractiveCodeScroll in an existing project:

```sh
npm install -D astro interactive-code-scroll@alpha
```

Create this folder layout:

```text
tutorial/
  tutorial.mdx
  code/
    index.html
    main.js
    style.css
  images/
    logo.svg
```

Add package scripts:

```json
{
  "scripts": {
    "dev": "interactive-code-scroll dev",
    "build": "interactive-code-scroll build",
    "serve": "interactive-code-scroll serve"
  }
}
```

Run the tutorial locally:

```sh
npm run dev
```

By default, the CLI reads `tutorial/tutorial.mdx`. Use `--tutorial <dir>` for another folder, or `--tutorial .` when the tutorial files live at the project root.

## Authoring Model

InteractiveCodeScroll uses final code plus focus regions:

```js
// #region config
const title = "My tutorial"; // @var title
// #endregion config
```

Then MDX steps point at those files and regions:

```mdx
<Step id="configure" file="main.js" region="config">

## Configure the demo

<VarField name="title" label="Title" persist />

</Step>
```

The code remains runnable without the framework. Markers are stripped from rendered and downloaded code.

## Documentation

- [Authoring and API reference](docs/authoring.md)
- [CLI reference](docs/cli.md)
- [Deployment guide](docs/deployment.md)
- [Upgrade guide](docs/upgrade.md)
- [Project specification](SPEC.md)

The dogfooding tutorial lives in [examples/getting-started](examples/getting-started). It teaches the authoring flow using InteractiveCodeScroll itself.

## CLI

Existing tutorial projects can run the generic CLI from their project root:

```sh
npm exec -- interactive-code-scroll dev
npm exec -- interactive-code-scroll build
npm exec -- interactive-code-scroll serve
```

For pnpm projects:

```sh
pnpm exec interactive-code-scroll dev
pnpm exec interactive-code-scroll build
pnpm exec interactive-code-scroll serve
```

Use `interactive-code-scroll doctor` to inspect the detected root, package manager, Astro binary and `tutorial.mdx` candidates.

The CLI is tutorial-agnostic. Provider-specific guidance, such as OAuth redirect URI help, is outside the core flow unless a project opts into it explicitly.

## Package Smoke Test

Before publishing, verify the package as an external project would consume it:

```sh
pnpm test:pack
```

This builds the package, creates a tarball with `pnpm pack`, installs it into a temporary tutorial project, runs `interactive-code-scroll build`, and checks that the static site was produced.

## Examples

- [Getting started with InteractiveCodeScroll](examples/getting-started) - dogfooding tutorial included in this repository.
- [OAuth PKCE with ArcGIS Maps SDK for JavaScript](https://github.com/EsriDevEvents/security-and-authentication-for-custom-applications-dtseu-2026/tree/main/demos/arcgis-js-sdk-user-auth) - ArcGIS JS SDK user authentication tutorial.

## License

[Apache-2.0](LICENSE)
