---
name: ics-authoring
description: Write and edit InteractiveCodeScroll tutorials (MDX steps that scroll-sync with highlighted regions of real code, live Preview, Result pane, code variants, series sites). Use when a project has tutorial/tutorial.mdx or tutorials/*/tutorial.mdx, depends on interactive-code-scroll, or the user wants to create, extend, migrate or fix a guided code tutorial or talk demo built with this tool.
license: Apache-2.0
metadata:
  package: interactive-code-scroll
---

# Authoring InteractiveCodeScroll tutorials

A tutorial is explanations in MDX next to a real, runnable project. Each `<Step>` points at a **region** of a code file; as the reader scrolls, the code panel shows that file and highlights the region. Web code (`code/index.html`) runs in a live **Preview**; scripts, REST calls and native apps show captured results in the **Result pane**.

Validate with the `ics-verify` skill (`interactive-code-scroll check --json`) after every change. Related skills: `ics-tutorial-design` (plan before writing), `ics-tutorial-review` (critique a draft), `ics-talk` (present it live), `ics-migrate` (convert a blog post or codelab, or upgrade the package).

## Find the project

- One tutorial: `tutorial/tutorial.mdx` (or `tutorial.mdx` at the root) with `code/` next to it.
- Series site: `tutorials/<slug>/tutorial.mdx`, one folder per tutorial, optional `tutorials/index.mdx`.
- Commands come from the package (`interactive-code-scroll` or its alias `ics`): `npx interactive-code-scroll dev`, `pnpm exec interactive-code-scroll check`. Check `package.json` scripts first.

New project, without prompts (every wizard question has a flag; see [references/project-setup.md](references/project-setup.md)):

```sh
npm create interactive-code-scroll@latest my-tutorial -- --layout single --use web:javascript --pm npm --no-pages --no-git --yes
```

## The smallest tutorial

```mdx title="tutorial/tutorial.mdx"
---
title: Hello, page
---

<Step id="heading" file="index.html" region="heading">

## Add a heading

The `<h1>` is the first thing readers see.

</Step>
```

```html title="tutorial/code/index.html"
<!doctype html>
<html lang="en">
  <body>
    <!-- #region heading -->
    <h1>Hello</h1>
    <!-- #endregion heading -->
  </body>
</html>
```

## Workflow

1. **Agree on the plan first.** Audience, goal, the finished app, and the list of steps (one idea per step). For a talk, each step is about 30–60 s on screen.
2. **Write the final, runnable project in `code/`** first. It must run without this tool: markers are comments.
3. **Mark regions** (`#region id` / `#endregion id` in the file's comment syntax) around what each step explains, and `@var name` on literals readers should edit.
4. **Write one `<Step>` per idea**: `id`, `file`, `region`, a short `##` heading (it becomes the step title in the index and outline), then the explanation.
5. **Check** (`ics-verify`), then look at it in the dev server.

## Choose the setup

| Teaching | Use | Read |
|---|---|---|
| A web app (HTML/JS, a browser SDK) | `code/index.html`; the Preview runs it | [panes-and-results.md](references/panes-and-results.md) |
| A script, CLI or native app | Captured results in `output/`, `output=` on steps | [panes-and-results.md](references/panes-and-results.md) |
| A REST API | `.http` files in `requests/`, `request=` on steps | [panes-and-results.md](references/panes-and-results.md) |
| Same steps in several languages | Code variants: `code/<lang>/` + frontmatter `variants` | [variants-and-series.md](references/variants-and-series.md) |
| Different prose per language | Sibling tutorials (`family`, `familyLabel`) in a series | [variants-and-series.md](references/variants-and-series.md) |
| Several tutorials on one site | `tutorials/<slug>/` + optional `index.mdx` | [variants-and-series.md](references/variants-and-series.md) |
| Slides or screenshots instead of code | `images={[...]}` or `embed="deck/#/3"` on a step | [components.md](references/components.md) |

## Rules that break builds or confuse readers

- `title` in frontmatter is the page title: do not repeat it as an MDX `#` heading. Start steps with `##`.
- Step `id`s: lowercase letters, digits, `-`; unique per tutorial. They are URL anchors (`#id`) and match steps across sibling tutorials.
- Region ids are unique per file; regions may nest; an empty region is an error. JSON files use a JSON Pointer `region="/dependencies"` instead of comments.
- A `<VarField name="x">` needs a matching `@var x` in a code file shown in tabs (or `json="file.json#/pointer"`). Every `@var x` must have the same type and default literal in every file.
- `images={["a.png"]}` must be a static array written in place. `embed` and `images` cannot be combined.
- A step without `file`, `region`, `images`, `embed` or `outline` is text-only: it keeps the current file and clears the highlight.
- `<Intro>` comes before the first step (not numbered); `<Outro>` after the last one (once, no props).
- Leave a blank line after `<summary>` and before `</details>`.
- `output=` is for non-web code; web code (`index.html`) shows the Preview instead.
- Files and folders starting with `.` and gitignored paths are not published unless frontmatter `include` lists them; never put real secrets in `code/` or `output/` (use `@var` defaults such as `YOUR_API_KEY`).
- Each tutorial also publishes `tutorial.md` and the site an `llms.txt` (plain Markdown for AI assistants); `llms: false` opts out.

## References

Read only the one you need:

- [references/components.md](references/components.md): `<Step>`, `<Intro>`, `<Outro>`, `<VarField>`, `<Hint>` and the series index components, with every prop.
- [references/frontmatter.md](references/frontmatter.md): every `tutorial.mdx` and `index.mdx` field.
- [references/code-markers.md](references/code-markers.md): regions, JSON regions, `@var` (strings, numbers, booleans, JSON, `.http`).
- [references/panes-and-results.md](references/panes-and-results.md): Preview, Console, pane control from steps, Result pane, outputs, HTTP requests.
- [references/variants-and-series.md](references/variants-and-series.md): code variants, series sites, index page, tag families, sibling tutorials.
- [references/project-setup.md](references/project-setup.md): folders, files left out, CLI commands, scaffolder flags, deployment.

Full documentation: https://github.com/hhkaos/interactive-code-scroll/tree/main/docs
