# Authoring and API Reference

This reference describes the tutorial files authors write. For implementation details, see `SPEC.md`.

## Tutorial Layout

A tutorial is a folder with this shape:

```text
tutorial/
  tutorial.mdx
  code/
    index.html
    main.js
    style.css
  images/
    logo.svg
    screenshot.png
```

- `tutorial.mdx` contains frontmatter, prose and MDX components.
- `code/` contains the final runnable project files. Large projects can keep everything here (Gradle wrappers, asset catalogs, binaries) and pick the files that get tabs with the `files` frontmatter.
- `images/` contains logos, screenshots and carousel images referenced by steps.

The source code should be valid without InteractiveCodeScroll. Use comments for framework markers.

## Frontmatter

```yaml
---
title: Build a checkout page
preview: both
theme: auto
codeWrap: false
logo: logo.svg
---
```

| Field | Values | Default | Notes |
|---|---|---|---|
| `title` | string | required | Rendered in the app header. Do not repeat it as an MDX `#` heading. |
| `preview` | `off`, `iframe`, `tab`, `both` | `both` | Controls the Preview panel and open-in-tab button. |
| `theme` | `auto`, `light`, `dark` | `auto` | Author default. Viewer changes are remembered. |
| `codeWrap` | boolean | `false` | Wraps long code lines when `true`; preserves horizontal scrolling when `false`. |
| `logo` | image path | none | Relative to `images/`. Use a square SVG or a PNG of at least 512 x 512. |
| `files` | list of paths/globs | all text files | Which `code/` files get tabs, in this order (`*` and `?` stay in one folder, `**` crosses folders). Other files still reach the ZIP and `preview/`; the ZIP button shows how many files the download contains, and its tooltip says how many are not shown in tabs. |
| `languages` | map | none | Extension (no dot) → Shiki language id or `text`, e.g. `languages: { qmd: markdown }`. Overrides the built-in highlighting for that extension. |

Highlighting is chosen by file extension. Built in: JavaScript/TypeScript (`js`, `mjs`, `cjs`, `jsx`, `ts`, `tsx`), `vue`, `html`, `css`, `json`/`geojson`, Markdown (`md`, `mdx`), shell (`sh`, `bash`), `ps1`, `yaml`/`yml`, `toml`, `ini`, `http`, Python (`py`), Kotlin (`kt`, `kts`), Gradle Groovy (`gradle`), `swift`, `java`, C# (`cs`), XML/XAML (`xml`, `xaml`), C++ (`cpp`, `h`, `hpp`), `qml`, `dart`, `sql` and `lua`. Other files show as plain text.

## Components

### `<Intro>`

Optional content before the first step.

```mdx
<Intro>

## Before you start

Install the prerequisites and keep this page open.

</Intro>
```

`<Intro>` is not numbered, does not count as a step and does not activate code focus.

### `<Step>`

The main tutorial block.

```mdx
<Step id="configure" file="main.js" region="config" preview="collapsed">

## Configure the app

Explain the change here.

</Step>
```

| Prop | Required | Notes |
|---|---:|---|
| `id` | yes | Unique deep-link id. The generated URL uses `#id`. |
| `file` | no | Path relative to `code/`. Shows that file in the code panel. |
| `region` | no | Region id in `file`. Omitting it shows the whole file with no focus. |
| `images` | no | Array of paths relative to `images/`. Shows an image carousel instead of code. |
| `preview` | no | `expanded`, `collapsed` or `keep`. Controls iframe state when the step activates. |

A text-only step keeps the current file visible and clears any previous region focus.

### `<VarField>`

Creates a form field linked to an `@var` marker in code.

```mdx
<VarField name="clientId" label="Client ID" secret persist />
<VarField name="portalUrl" label="Portal URL" placeholder="https://example.com" persist />
```

| Prop | Required | Notes |
|---|---:|---|
| `name` | yes | Matches an `@var` name in a code file. |
| `label` | yes | Visible field label. |
| `placeholder` | no | Input hint. Does not change the code default. |
| `secret` | no | Masks the input and rendered code value until revealed. |
| `persist` | no | Stores the value in `localStorage`. |

The default value is the literal in code. Empty fields restore that literal in code, Preview and downloads.

### `<Hint>`

Short inline clarification with a hover/focus popover.

```mdx
The Preview runs from a <Hint id="same-origin" label="same-origin page">A real URL under the generated site.</Hint>.
```

Use hints for brief side notes. Use regular prose or `<details>` for essential or longer content.

## Code Markers

### Regions

Use `#region <id>` and `#endregion <id>` comments:

```js
// #region config
const title = "Checkout";
// #endregion config
```

HTML, CSS, shell and YAML-style comments are also supported:

```html
<!-- #region app -->
<main id="app"></main>
<!-- #endregion app -->
```

```css
/* #region layout */
main {
  display: grid;
}
/* #endregion layout */
```

```sh
# #region setup
npm init -y
npm install -D astro interactive-code-scroll@alpha
# #endregion setup
```

```yaml
# #region frontmatter
title: My Tutorial
preview: tab
# #endregion frontmatter
```

A few languages also accept their own region style. Each one works only in its own file type, so the same text in any other file stays an ordinary comment:

| Files | Style |
|---|---|
| `.cs` | C# `#region id` / `#endregion` |
| `.py` | `# region id` / `# endregion` (VS Code folding style) |
| `.sql`, `.lua` | `-- #region id` / `-- #endregion` |

```python
# region geocode
response = requests.get(url, params=params)
# endregion geocode
```

Rules:

- Region ids are unique per file.
- Regions may nest.
- Empty regions are errors.
- A closing id, when present, must match the opened region.
- Markers are stripped from rendered code and downloads.

### Variables

Use `@var <name>` on the same line as a string literal:

```js
const tutorialTitle = "InteractiveCodeScroll"; // @var tutorialTitle
```

Rules:

- `@var` targets the first string literal on its line.
- Use one `@var` per line.
- Variable names are unique per file.
- The same variable may appear in several files (for example a token in `main.py` and `MainActivity.kt`); one form field then fills all of them. Every occurrence must use the same default literal, or the build fails and lists each file.
- SQL and Lua files also accept `-- @var name` comments.

Runtime values are escaped for the file type and quote style:

| Files | Escaping |
|---|---|
| JS/TS, JSON, CSS, Python, Swift, Java, C#, C++, QML, YAML/TOML double quotes | Backslash escapes (`\"`, `\\`, `\n`) |
| Kotlin, Dart, Gradle/Groovy | Backslash escapes plus `\$`, so values never start a string template |
| Shell (`.sh`, `.bash`) | Double quotes escape `\ " $` and backticks; single quotes use `'\''` |
| PowerShell (`.ps1`) | Double quotes use backtick escapes; single quotes double the quote |
| SQL, YAML single quotes | The quote is doubled (`''`) |
| HTML/XML/XAML (`<!-- @var -->`) | Attribute entities (`&quot;`, `&amp;`, `&lt;`) |

Literals that cannot hold an arbitrary value are build errors: Python f-strings, raw strings and triple-quoted strings, and TOML literal strings (`'...'`). Use a plain string instead.

### `.http` file variables

In `.http` files (VS Code REST Client / JetBrains HTTP Client syntax), every file variable line is a variable with the rest of the line as its default. No `@var` marker is needed:

```http
@accessToken = YOUR_ACCESS_TOKEN

GET https://example.com/search?token={{accessToken}}
```

Values are inserted as typed, with line breaks removed.

## Preview

When Preview is enabled, `code/index.html` is required. The generated site publishes every file under `code/` next to the Preview page, with markers stripped, so relative links such as `./main.js` or `./oauth-callback.html` keep working.

Preview modes:

- `iframe`: embedded Preview only.
- `tab`: open-in-tab only.
- `both`: embedded Preview and open-in-tab.
- `off`: no Preview.

Form changes refresh the Preview after a short debounce. The Run button refreshes it manually.

## Files Not Shown in Tabs

- Binary files (images, fonts, jars, archives, anything with a NUL byte) never get a tab. They are published under `preview/` and added to the ZIP byte for byte.
- With `files` set, text files that match no pattern are also left out of the code panel and the page, and still go into the ZIP.
- Files not shown in tabs cannot contain `@var` markers, and a `<Step file>` must point at a file shown in a tab.
- `index.html` is always available to the Preview, whether or not it is shown in a tab.

## Validation

Builds fail when MDX references unknown files, regions, variables or images, when code markers are malformed, or when a frontmatter field is invalid (for example an unknown `theme`, a `logo` missing from `images/`, or Preview enabled without `code/index.html`). Every error names the MDX file, line and column; frontmatter errors point at the offending key. In dev mode, validation errors appear in Astro's browser overlay.

For a package/build/runtime change, run:

```sh
CI=true pnpm preflight:package
```

For docs-only changes, run:

```sh
CI=true pnpm preflight:docs
```
