---
name: ics-verify
description: Validate an InteractiveCodeScroll tutorial after editing tutorial.mdx, code/, images/, output/ or requests/, and fix what fails. Runs `interactive-code-scroll check --json` (the build's validation in about a second), fixes each problem, repeats until clean, then confirms with a build. Use after any change to a tutorial, when a build or dev overlay shows an error, or before committing or presenting.
license: Apache-2.0
metadata:
  package: interactive-code-scroll
---

# Verifying an InteractiveCodeScroll tutorial

`check` runs the same validation as the build (frontmatter, every file, region, variable, image, embed, output and request reference, a series' `index.mdx` and the rules across tutorials) without starting Astro. Use it as the inner loop; `build` is the final confirmation.

## The loop

1. Run from the project root (where `package.json` is):

   ```sh
   npx interactive-code-scroll check --json
   # pnpm: pnpm exec interactive-code-scroll check --json
   ```

   Same options as the other commands: `--tutorial <dir>`, `--tutorials <dir>`, `--root <dir>`. Without them the tutorial (or series) is detected.

2. Read the result:

   ```json
   {
     "ok": false,
     "errors": 1,
     "warnings": 0,
     "problems": [
       { "severity": "error", "file": "tutorial/tutorial.mdx", "line": 12, "column": 1, "message": "<Step> region \"config\" not found in code/main.js" }
     ]
   }
   ```

   - Exit code 1 means at least one `error`. `file`, `line` and `column` point at the problem (paths are relative to where you ran the command); they are absent when the problem has no location (rules across tutorials).
   - An MDX syntax error (an unclosed tag, a stray `{`) hides that tutorial's other problems, because the file cannot be parsed: fix it first, then run `check` again.

3. Fix every `error`. Look the message up in [references/errors.md](references/errors.md). Prefer fixing the reference in the MDX when the code is right, and the code markers when a step points at the right place but the region is missing.

4. Review every `warning`. They do not fail the build but usually mean something unintended: a file that will not be published, a gitignored file that will be, a token-like value in `output/`, a `<summary>` without a blank line after it.

5. Repeat until `"ok": true` with no warnings you cannot justify.

6. Confirm with a full build, which also compiles the pages and catches what `check` cannot see:

   ```sh
   npx interactive-code-scroll build
   ```

## What `check` does not cover

- Rendering: page layout, styles, a custom series index `.astro` page, `<TutorialList>`/`<TutorialFilter>` props in it. `build` covers these.
- Runtime behavior: whether the Preview app works, whether a request passes CORS, how the tutorial reads. Open the dev server (`npx interactive-code-scroll dev`), visit the printed URL and walk the steps. The dev server runs until stopped: stop it when done.
- Teaching quality: one idea per step, short `##` headings, regions that show only what the step explains.

## Tips

- After editing many steps, run `check` once at the end of each batch, not after every keystroke; it reads the whole project.
- When a region error appears after editing code, the marker was probably deleted or renamed: search the file for `#region <id>`.
- `@var` errors list every file involved; give the literal the same type and default in each.
- Problems in `requests/errors.json` and `.http` files point at those files, not at the MDX.
