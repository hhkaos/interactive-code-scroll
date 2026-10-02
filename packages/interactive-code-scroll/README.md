# InteractiveCodeScroll

Build guided, interactive code tutorials from MDX and annotated source code.

InteractiveCodeScroll generates a static tutorial site with synchronized prose, highlighted code regions, images, editable variables, Preview, copy and downloads. It is designed for technical writers, developer advocates and conference speakers.

> Status: beta. Authoring APIs may still change before v1.

## Install

Start a new project with the wizard:

```sh
npm create interactive-code-scroll@latest my-tutorial
# or: pnpm create interactive-code-scroll@latest my-tutorial
```

Or add it to an existing project:

```sh
npm install -D astro interactive-code-scroll
```

## Folder Structure

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

## Scripts

```json
{
  "scripts": {
    "dev": "interactive-code-scroll dev",
    "build": "interactive-code-scroll build",
    "serve": "interactive-code-scroll serve"
  }
}
```

Run locally:

```sh
npm run dev
```

Build for static hosting:

```sh
npm run build
```

Use `--tutorial <dir>` when the tutorial is not in the default `tutorial/` folder.

## Authoring

Mark stable code regions in runnable source files:

```js
// #region config
const title = "My tutorial"; // @var title
// #endregion config
```

Reference those regions from MDX:

```mdx
<Step id="configure" file="main.js" region="config">

## Configure the demo

<VarField name="title" label="Title" persist />

</Step>
```

Markers are stripped from rendered and downloaded code.

## Documentation

- Repository: <https://github.com/hhkaos/interactive-code-scroll>
- Features: <https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/features.md>
- Authoring reference: <https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/authoring.md>
- CLI reference: <https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/cli.md>
- Deployment guide: <https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/deployment.md>
- Upgrade guide: <https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/upgrade.md>
