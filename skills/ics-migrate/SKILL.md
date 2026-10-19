---
name: ics-migrate
description: Convert existing content (a blog post, codelab, README walkthrough, workshop notes, slide deck or sample repository) into an InteractiveCodeScroll tutorial, or upgrade a tutorial to a newer interactive-code-scroll version. Use when the user wants to port, import or convert a guide into this tool, or after updating the interactive-code-scroll package.
license: Apache-2.0
metadata:
  package: interactive-code-scroll
---

# Migrating to InteractiveCodeScroll

Two jobs: bringing existing content in, and upgrading a tutorial to a new package version. Write with `ics-authoring`, check with `ics-verify`.

## Converting content

### 1. Inventory the source

List, before writing anything:

- The sections or steps, in order, with the idea each teaches.
- Every code snippet: which file it belongs to, and whether it is the final version of that code or an intermediate one.
- Images and diagrams, values the reader must enter (keys, URLs), commands and outputs shown.
- The finished project: does the source link a complete repository? Prefer it over reassembling snippets.

Show the inventory to the author with a proposed step list (or write it into `TUTORIAL-PLAN.md`, see `ics-tutorial-design`) and agree on it.

### 2. Build the final project in `code/`

The code panel shows the **final** files; steps highlight regions of them. Assemble the complete, runnable project first and run it.

| Source pattern | In InteractiveCodeScroll |
|---|---|
| Snippets that add to the same file | One file; a `#region` per snippet. |
| A snippet later replaced ("now change X to Y") | Keep the final version in `code/`; explain the earlier idea in prose or a fenced code block inside the step; or split into two files if both versions matter. |
| "Run this command" | A fenced `sh` block in the step, or a script in `code/` with a region. |
| Placeholder values (`<YOUR_KEY>`) | `@var` with a placeholder default and a `<VarField>`. |
| Shown output / screenshots of results | Web code: the live Preview. Otherwise: files in `output/` with `output=`; real terminal text as `.txt`. |
| API calls with curl/HTTP | `.http` files in `requests/` and `request=` (readers can run them). |
| The same steps in several languages (tabs in the source) | Code variants (`code/<lang>/`, frontmatter `variants`). |
| Screenshots of a console or UI | `images={[…]}` on a step, files in `images/`. |
| Slides | `embed` of the deck's static build in `embeds/`, or images. |
| Callouts, notes, warnings | Markdown blockquotes; short asides as `<Hint>`; optional depth in `<details>`. |
| Codelab "duration" / metadata | Frontmatter `duration`, `level`, `tags`, `updated`. |

### 3. Write the steps

- One `<Step>` per idea, with an `id`, a short `##` heading, `file` and `region`. Long source sections become several steps.
- Keep the author's wording where it works; cut text that only described the code the panel now shows.
- Remove "copy this into…" instructions: the reader sees the file and can download the project.
- Move setup and prerequisites into `<Intro>`; the conclusion into `<Outro>`.
- Run `ics-verify` after every few steps.

### 4. Check against the source

Every idea of the source is in a step or deliberately dropped (tell the author which). Every value the reader had to type is a field. The project runs.

## Upgrading the package

1. Read the release notes between the two versions: `CHANGELOG.md` and the upgrade guide (https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/upgrade.md), which lists every breaking change with its migration.
2. Update `interactive-code-scroll` and `astro` together when the notes say so; install.
3. `npx interactive-code-scroll skills install` to refresh these skills to the new version.
4. `npx interactive-code-scroll check --json`: the validation names old props and values with migration hints (for example `preview="expanded"` → `view="preview"`). Fix them all.
5. `build`, then walk the tutorial in `dev`: Preview, downloads, requests, variants.

Known migrations: step/intro `preview=` became `view` + `collapsed` and `maximize="preview"` became `maximize="panel"` (0.2.0-beta.10); Console needs frontmatter `console: true` (0.2.0-beta.10); one default per variable name across files (0.2.0-beta.0).
