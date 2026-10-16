# Upgrade Guide

InteractiveCodeScroll is still pre-v1. Keep upgrades deliberate and test each tutorial after changing versions.

## Recommended Upgrade Flow

1. Read `CHANGELOG.md`.
2. Update `interactive-code-scroll` and `astro` together when the release notes ask for it.
3. Run `interactive-code-scroll doctor`.
4. Run the tutorial in dev mode and fix validation errors.
5. Build the tutorial.
6. Check Preview, downloads and any provider-specific flows.

```sh
npm install -D interactive-code-scroll astro@7.3.5
npm exec -- interactive-code-scroll doctor
npm exec -- interactive-code-scroll dev
npm exec -- interactive-code-scroll build
```

## Authoring Changes To Watch

- Frontmatter fields: new validation may reject misspelled or unsupported values.
- MDX components: props are intentionally small and explicit.
- Markers: malformed regions and duplicate variables fail the build.
- Preview: `code/index.html` is required when Preview is enabled.
- CLI arguments: package scripts must forward options after `--`.

## Breaking Changes

Before v1, breaking changes may happen in alpha and beta releases. Each breaking change should include:

- a changelog entry,
- a migration note here,
- an actionable validation error when possible,
- a fixture/E2E case when the behavior is observable through a tutorial.

### 0.2.0-beta.8: step outline next to the intro

An `<Intro>` with no `file`, `images` or `embed` now shows the [step outline](authoring.md#step-outline) (the list of steps) in the code area instead of the first file. Set `outline: false` in the frontmatter (or once in `tutorials/index.mdx` for a series) to keep the code there. The Back / Next position now opens a [step index](authoring.md#step-index); step headings are its titles, so keep them short. In presentation mode, Alt+P enters and leaves it, `O` and `E` are shortcuts and a lone Alt press lists the keys ([Presenting](presenting.md#during-the-talk)).

### 0.2.0-beta.7: selection toolbar

Selecting text in the explanations or the code now shows a small toolbar to [ask about the selection](authoring.md#asking-about-a-selection): "Ask the author" (with a `feedbackUrl`) and "Ask AI" (ChatGPT and Claude). It is on by default. No tutorial changes are needed; to receive the selected text in your issues, add `{context}` to `feedbackUrl` (e.g. `...issues/new?title={title}&body={context}`). To choose the actions, or add your product's assistant, set [`ask`](authoring.md#page) per tutorial or in `tutorials/index.mdx`; `ask: false` turns the toolbar off.

### 0.2.0-beta.7: closing panel after the last step

Every tutorial now ends with a closing panel: at the last step "Next" becomes "Finish" instead of being disabled. The panel offers the code download, the Preview tab and, in a series, the next tutorial (the next one in index order unless you set [`next`](authoring.md#series-index-and-siblings)) and the index. No tutorial changes are needed. Optionally add an [`<Outro>`](authoring.md#outro) with your own closing text and a [`feedbackUrl`](authoring.md#page) (per tutorial, or once for a series in `tutorials/index.mdx`); check that the suggested next tutorial makes sense in your series, or set `next: false`. To keep the old ending, set `completion: false`. In presentation mode the clicker now ends on a closing slide with a QR code of the tutorial; if you present from `localhost`, set [`presentationUrl`](presenting.md#during-the-talk) (or Astro `site`) so it opens the published copy.

### 0.2.0-beta.6: wider explanations and field rows

The explanations no longer cap lines at 70 characters: text uses the panel's width when the reader widens it. Consecutive `<VarField>`s are laid out in as many columns as the panel fits; put prose between fields that must stay on their own row. Notes (blockquotes) in inactive steps are now gray, and fenced code blocks follow the light/dark mode with the code panel's themes unless `astro.config.mjs` sets `markdown.shikiConfig.theme` or `themes`. No tutorial changes are needed; check pages that relied on the old layout.

### 0.2.0-beta.5: file tab order without `files`

A tutorial (or variant) without frontmatter `files` now orders its file tabs by the steps: each file in the order a `<Step>` first shows it, then the rest by path. Before, every tab was in path order. Check your tabs after upgrading; to keep another order, list it in `files`. See [Files Not Shown In Tabs](authoring.md#files-not-shown-in-tabs).

### 0.2.0-beta.5: series cards and custom index pages

- Cards no longer show the tutorial logo or variant logos next to the title (the tutorial `logo` stays for its page header and favicon). Tag and variant logos come from `tagGroups` entries (`{ name, logo }`) and variant `logo`s. See [Tag families](authoring.md#tag-families).
- Variant labels are now tags of their tutorial: `<TutorialList tags="Python">` also lists a tutorial with a Python variant, and the search bar counts and filters them.
- Custom index pages: `SeriesCard.variantLogos` is gone. Use `variants` (`{ id, label, href, logo }`, with two or more variants) and `tagLogos` (tag → logo URL).
- `<TutorialFilter>` is now a search bar (text, tags, level), with no change to `index.mdx`. On a custom page it accepts an optional `tagGroups` prop.
- New, opt-in: `<TutorialFavorites />`. See [Index page](authoring.md#index-page).

### 0.2.0-beta.5: `<details>` spacing

Open disclosure blocks now leave a gap below `<summary>`: remove any inline `margin-top` you added to the first element. A `<summary>` that MDX puts inside a paragraph (no blank line before the content) now prints a build warning with its `file:line`; add the blank lines.

### 0.2.0-beta.0: `latest` dist-tag

Releases are no longer published only under `@alpha`: `npm install -D interactive-code-scroll` and `npm create interactive-code-scroll@latest` get this version. Projects pinned to `interactive-code-scroll@alpha` keep the last alpha until they change the specifier:

```sh
npm install -D interactive-code-scroll@latest astro@7.3.5
```

### 0.2.0-beta.0: one default per variable name

A variable name used in several files must now have the same default literal everywhere. Before, the form field silently took the first file's default. The build now fails with `@var "name" must have the same default in every file: …` listing each file and value.

Fix it by using the same demo value in every file, or by giving the variables different names.

### 0.2.0-beta.0: clicker keys from fields and the Result pane

PageDown/PageUp now move steps even while the focus is in a form field, the JSON tree or the Result pane (only multi-line text keeps them), so presentation clickers work after typing a value. Arrow keys are unchanged in fields and the JSON tree, and the Result pane's Body/Headers tabs and "Run as" picker now keep their arrow keys too. No tutorial changes are needed.

### 0.2.0-beta.0: results and requests (multi-SDK Phase 1)

New optional folders and props: `output/` with `<Step output="…">`, `requests/` (`.http` files and `errors.json`) with `<Step request="…">`, `variants` in the frontmatter, `<Step only="…">` and `otherVariantSteps`. Existing tutorials build unchanged unless they hit one of these new build errors:

- `output=` or `request=` on a step that only web code shows (web code has the Preview).
- A `code/requests/` folder (or `code/<variant dir>/requests/`) in a tutorial with `requests/`: both would land in the ZIP as `requests/`. Rename the code folder.
- With `variants`, every file under `code/` must be in exactly one variant folder, and the top-level `files:` moves into each variant.

See [Result Pane](authoring.md#result-pane), [HTTP Requests](authoring.md#http-requests) and [Code Variants](authoring.md#code-variants).

### 0.2.0-beta.0: literals that cannot be escaped

`@var` on a Python f-string, raw string or triple-quoted string, or on a TOML literal string (`'...'`), is now a build error because typed values could break the code. Switch the literal to a plain string.
