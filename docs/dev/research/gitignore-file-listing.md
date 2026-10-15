# Design note: `.gitignore` in the `code/` listing

Date: 2026-10-15. Status: implemented (Unreleased, after 0.2.0-beta.2).

## Problem

`listCode()` in `src/tutorial-files.ts` decides what gets published from `code/` (tabs, `preview/`, ZIP). Before this change it left out generated folders and paths with a segment starting with `.`, and published everything else. `.gitignore` was never read, so a file the tutorial's own scripts write locally (`state.json`, `output.csv`, `token.json`, a `build/` folder) went into the preview and the ZIP. Real case: API key tutorials whose scripts write `state.json` next to a `.env` with the author's real credentials; the workaround was renaming it `.state.json`.

## Who reads `code/`

Everything downstream reads `TutorialFiles.files` / `binaries` from `readTutorialFiles()`: the virtual module (`tutorial-module.ts`), the published `preview/` routes (`preview/code-file.ts`), the ZIP (built in the browser from `clientData`), and validation (`mdx-validation.ts` → `validate.ts`). Filtering in `listCode()` covers all of them. `images/`, `embeds/`, `output/` and `requests/` keep using `listFiles()` (no `.gitignore`), out of scope.

## Which `.gitignore` files apply

- `code/.gitignore` and any `.gitignore` in its subfolders.
- `.gitignore` files in the folders above `code/`, **up to the root of the git repository that holds the tutorial** (nearest ancestor with a `.git` entry, folder or file). Outside a repository, only the tutorial folder's own `.gitignore`.
  - Why the repo root: what git commits is what CI checks out and builds. A file a repo-level rule excludes never reaches the CI build, so publishing it from a local build would only make local and CI sites differ, and local is exactly where generated files and secrets live. Stopping at the tutorial folder would ignore e.g. a root `*.csv` the author relies on.
  - A parent `.gitignore` whose rules exclude `code/` itself (or the tutorial folder) is skipped: that tutorial is not under version control there (generated test projects, scratch copies), and applying it would publish nothing.
- Not read: `.git/info/exclude` and the global `core.excludesFile`. They are machine-local, so honoring them would make the published site depend on whose machine built it.

## Semantics

Through the `ignore` package (7.x, MIT, no dependencies): comments, blank lines, negation `!`, directory patterns `foo/`, anchored patterns `/foo` and `a/b`, `**`. Each file's patterns are relative to its own folder; the deepest `.gitignore` with a matching rule decides. As in git, nothing inside an ignored folder can be re-included by a negation, and `.gitignore` files inside an ignored folder are not read. Matching is **case-sensitive** (`ignorecase: false`), like git on Linux CI; the package defaults to case-insensitive.

## Precedence

1. **Generated folders** (`node_modules`, `.git`, caches, `pyvenv.cfg` folders): never read, never published; neither `include` nor `.gitignore` changes that.
2. **Left out by default**: a path with a segment starting with `.` (unchanged), **or** a path a `.gitignore` excludes.
3. **`include`** opts back in any path left out by (2), hidden and/or gitignored. An explicit `include` wins over `.gitignore` (e.g. a tutorial that shows a sample file real projects ignore), and the build warns once per pattern that publishes gitignored paths.

So with no `.gitignore` in reach the output is unchanged.

## Diagnostics

- Error: `include "x" matches no path in code/ starting with "." or gitignored …` (was: `… matches no path starting with "." in code/ …`).
- Error at the `<Step>`: `file "state.json" is gitignored (by code/.gitignore) and not published; add it to frontmatter "include" to publish it` (was the generic `not found in code/`). Same for a variant step (`… gitignored in variant "py" (code/py/state.json by .gitignore) …`).
- Error at `files` (and a variant's `files`): `files "x" matches only gitignored files, which are not published (code/… by …); add them to frontmatter "include" to publish them` (was `matches no text file in code/`).
- Warning at `include`: `frontmatter include "x" publishes code/a (and N more gitignored path(s)), which code/.gitignore excludes; make sure it holds no secrets or local state`.
- The existing `code/.x/ is not published` warning is no longer emitted for a dot folder whose files are all gitignored (the author already said to leave it out).

`by` names the `.gitignore` relative to the tutorial folder: `code/.gitignore`, `.gitignore`, `../../.gitignore`.

## Not done (proposals)

- Frontmatter switch `gitignore: false` to turn the rules off. Not added: `include` already overrides per path, and a global off switch is a foot-gun for the exact leak this fixes. Easy to add later in `includeOf()`-style pre-compile reading if someone needs it.
- Dev mode: a change to a `.gitignore` inside `code/` revalidates as any `code/` change does; one above `code/` needs a dev-server restart (those folders are not watched).
- `.gitignore` for `output/` and `requests/`.
