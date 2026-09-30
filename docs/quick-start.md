# Quick Start

Build and publish your first interactive tutorial in a few minutes.

## 1. Create a project

```sh
npm create interactive-code-scroll@latest my-tutorial
# or: pnpm create interactive-code-scroll@latest my-tutorial
```

The wizard asks for one tutorial or a series, what each tutorial uses (web app, REST API, script, native app and their languages), the package manager and whether to add a GitHub Pages workflow. Every answer has a flag, and `--yes` takes the defaults; see [Create a Project](cli.md#create-a-project).

Then start the dev server:

```sh
cd my-tutorial
npm run dev
```

Open the URL it prints. Edits to `tutorial.mdx` and the files in `code/` reload the page, and broken references show an error overlay with the file and line.

## 2. Know the layout

```text
tutorial/
  tutorial.mdx   # the explanations: frontmatter + <Step> blocks
  code/          # runnable source files shown in the code panel
  images/        # optional screenshots and diagrams
```

Series sites use `tutorials/<name>/` with the same layout per tutorial. REST and script tutorials add `requests/` (`.http` files the reader can run) and `output/` (captured results). See the [authoring reference](authoring.md) for every option.

## 3. Mark your code

Your source files stay plain and runnable. Comments in the file's own syntax mark the regions a step focuses on, and `@var` marks string literals readers can edit:

```js
// #region config
const title = "My first tutorial"; // @var title
// #endregion config
```

Markers are stripped from the rendered code, the Preview and the downloads.

## 4. Write the steps

The frontmatter configures the page; `<Intro>` holds the context before the first step; each `<Step>` points at a file and region:

```mdx
---
title: My first tutorial
preview: both   # embedded Preview + "open in new tab"
theme: auto
---

<Intro>

## What you will build

A short page that greets the reader.

</Intro>

<Step id="configure" file="main.js" region="config">

## Configure the demo

Change the title: the code, the Preview and the downloads update in place.

<VarField name="title" label="Title" persist />

</Step>
```

Steps reference ids, never line numbers, so editing the code does not break them. A step can also show images (`images={["diagram.png"]}`), a captured output (`output="result.json"`) or a runnable request (`request="get-items"`).

For extra context, use `<Hint>` for inline popovers, Markdown blockquotes for notes and `<details>` for optional explanations.

## 5. Build and publish

```sh
npm run build    # static site in dist/
npm run serve    # check the built site locally
```

If you chose the GitHub Pages workflow, push to GitHub and enable **Settings → Pages → Source: GitHub Actions**; every push to the default branch publishes the site. For other hosts and base paths, see [Deployment](deployment.md).

## Next steps

- [Features](features.md) — everything the tool can do
- [Authoring reference](authoring.md) — frontmatter, components, markers, validation rules
- [CLI reference](cli.md) — `dev`, `build`, `serve`, `doctor` and their options
