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
  output/            # optional: captured results for the Result pane
    geocode.json
  requests/          # optional: .http requests, zipped with the project
    geocode.http
```

- `tutorial.mdx` contains frontmatter, prose and MDX components.
- `code/` contains the final runnable project files. Large projects can keep everything here (Gradle wrappers, asset catalogs, binaries) and pick the files that get tabs with the `files` frontmatter.
- `images/` contains logos, screenshots and carousel images referenced by steps.
- `output/` (optional) contains captured results of code that cannot run in the browser, shown by steps with `output=` in the [Result pane](#result-pane).
- `requests/` (optional) contains [HTTP requests](#http-requests) (`.http` files) bound by steps with `request=`, plus supporting files; it is added to every ZIP.

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
| `variants` | list | none | Code variants: the same steps in several languages. See [Code Variants](#code-variants). |
| `otherVariantSteps` | `notice`, `hide` | `notice` | How steps limited with `only=` look to readers of another variant. See [Code Variants](#code-variants). |
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
| `file` | no | Path relative to `code/` (to the variant folder with `variants`). Shows that file in the code panel. |
| `region` | no | Region id in `file`. Omitting it shows the whole file with no focus. With `variants`, `region` alone is enough: it names one file per variant. |
| `only` | no | With `variants`: space-separated variant ids the step applies to, e.g. `only="python curl"`. |
| `images` | no | Array of paths relative to `images/`. Shows an image carousel instead of code. |
| `output` | no | Captured output under `output/` shown in the [Result pane](#result-pane), e.g. `output="geocode.json"`. |
| `request` | no | Space-separated [request names](#http-requests) from `requests/`, e.g. `request="geocode-get geocode-post"`; the first is the default. |
| `preview` | no | `expanded`, `collapsed` or `keep`. Controls iframe state (or the Result pane) when the step activates. |

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

In `.http` files (VS Code REST Client / JetBrains HTTP Client syntax), every file variable line is a variable with the rest of the line as its default. No `@var` marker is needed. This applies to `.http` files in `code/` and in [`requests/`](#http-requests); a `<VarField>` can target either, and a var used in both needs the same default:

```http
@accessToken = YOUR_ACCESS_TOKEN

GET https://example.com/search?token={{accessToken}}
```

Values are inserted as typed, with line breaks removed.

## Preview

When Preview is enabled, `code/index.html` is required (with code variants, see [Preview and downloads](#preview-and-downloads)). The generated site publishes every file under `code/` next to the Preview page, with markers stripped, so relative links such as `./main.js` or `./oauth-callback.html` keep working.

Preview modes:

- `iframe`: embedded Preview only.
- `tab`: open-in-tab only.
- `both`: embedded Preview and open-in-tab.
- `off`: no Preview.

Form changes refresh the Preview after a short debounce. The Run button refreshes it manually.

## Result Pane

Code that cannot run in the browser (scripts, native apps, HTTP requests) shows its result in the Result pane, which takes the Preview's place under the code, with the same splitter height and a collapsible header. A tutorial without variants is web code when `code/` has `index.html`; with variants, each variant with `index.html` shows the Preview and every other variant shows the Result pane. The pane appears only when some step has `output=` or `request=`.

```mdx
<Step id="request" region="request" output="geocode.json">

## Send the request

</Step>
```

- **Captured output**: files under `output/`. A step's `output="name"` looks up `output/<variant id>/name` first (a per-variant override), then `output/name`; it must resolve for every non-web variant the step covers.
- **Types**: `.json` (JSON viewer, below), `.txt` and `.log` (terminal style: prompt lines such as `$ cmd`, `> cmd`, `>>> cmd` or `PS C:\> cmd` are colored, and ANSI color codes become colors; other escape sequences are removed), `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` and `.svg` (image). Any other type is a build error.
- **JSON viewer**: a collapsible tree with colored keys, strings, numbers and punctuation (light and dark). The root and the next two levels start expanded; deeper objects and arrays start collapsed with a count (`3 keys`, `12 items`). Objects and arrays with more than 100 entries show the first 100 and a "Show more" button that adds 100 at a time. Click a row or use the keyboard: arrow keys move and expand/collapse, Enter/Space toggle, Home/End jump; arrow keys inside the tree do not change steps. Numbers keep their source text (large ids are not rounded). A `.json` file that does not parse is shown as plain text.
- **Keeps the last result**: a step without `output` or `request` shows the result of the nearest earlier step that has one for the active variant, whether the reader scrolled, used step keys or opened a deep link. Before the first output the pane shows an empty state.
- **Published, not embedded**: outputs are published under `output/` on the site and fetched when shown, so the page stays small and works offline. They are rendered as text (or an image), never as HTML.
- **Credentials**: outputs are committed and published. The build warns (without failing) when one looks like it holds a credential: `token=`, `"token":`, `apiKey` or `Authorization: Bearer` followed by a value that is not a var default. Replace real values with the var's default (the demo value in the code) before publishing.
- `output=` in web code is a build error: web code shows the Preview.
- `output/` is not part of the ZIP.

## HTTP Requests

Requests live in `.http` files under `requests/` (VS Code REST Client / JetBrains HTTP Client syntax), so they stay runnable in those tools. They are not code tabs or variants: they are the source of the Result pane's [request runner](#request-runner) and are included in every ZIP as `requests/`, with form values applied. A `.http` file under `code/` is an ordinary code file and is never run.

```http
@serviceUrl = https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer
@accessToken = YOUR_ACCESS_TOKEN

# @name geocode-get
GET {{serviceUrl}}/findAddressCandidates
  ?singleLine=380 New York St, Redlands
  &f=json
  &token={{accessToken}}

###

# @name geocode-post
POST {{serviceUrl}}/findAddressCandidates
Content-Type: application/x-www-form-urlencoded
X-Esri-Authorization: Bearer {{accessToken}}

singleLine=380 New York St, Redlands&f=json
```

```mdx
<Step id="geocode" region="geocode" request="geocode-get geocode-post">
```

Supported syntax:

- `###` separates requests.
- `# @name x` or `// @name x` names the next request (letters, digits, `_` and `-`). Unnamed requests are allowed but cannot be bound by `request=`.
- File variables `@x = value` anywhere in the file; `{{x}}` uses them within the same file.
- A request line `METHOD URL` (optional `HTTP/x` suffix) with `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` or `OPTIONS`, optionally continued by lines starting with `?` or `&`; then headers (`Name: value`), a blank line and the body.
- Comments (`#`, `//`) outside the body.

Build errors: request variables (`{{name.response…}}`), system variables (`{{$guid}}`…), `< file` bodies, pre-request and response handler scripts (`< {% %}`, `> {% %}`, `>> file`), `{{x}}` with no file variable `x`, a request line without a supported method, a request name defined twice across `requests/`, a `request=` name that does not exist or is listed twice, `request=` on a step whose variants are all web code (or in a tutorial with `code/index.html`), binary files in `requests/`, and a `code/requests/` (or `code/<variant dir>/requests/`) folder that would overwrite `requests/` in the ZIP.

Other text files in `requests/` (for example a README) are zipped as is. `requests/errors.json` is the [error rule](#service-errors).

### Request runner

A step with `request=` gets a **Run request** button in the Result pane. Nothing is sent until the reader presses it: activating a step never sends a request.

[examples/rest-geocode](../examples/rest-geocode) is a complete example: cURL, Python and JavaScript variants, a GET step (token in the query) and a POST step (token in a header), each running the request its code shows, captured outputs and an ArcGIS `requests/errors.json`.

- **Run as**: when a step lists several requests, a picker labeled with each request's method (or its name when two share a method) chooses which one to send. The first is the default each time the step is shown. Offer an alternative only when the step's code shows it too: readers expect Run to send what they read.
- **Values**: every `{{x}}` takes the reader's `<VarField>` value, else the file variable's default; file variables may use other file variables. Values substituted in the query string (after `?`) are URL-encoded; in the path, headers and body they are inserted as is.
- **Request line**: above the result, the method and URL that will be sent, with the request file and name; long URLs wrap at `/`, `?` and `&`. Values of `secret` vars are masked (as in the code) unless the reader presses **Show secrets**, which is off on every page load and never remembered. Headers and body are not shown.
- **Response**: the badge shows status and time (`Live · 200 OK · 318 ms`); non-2xx statuses get a red badge. A live response has two tabs:
  - **Body**: `image/*` responses as an image; otherwise the JSON viewer when the body parses, else plain text, never as HTML. Text over 200 KB shows its first 200 KB and a **Show all** action.
  - **Headers**: the response headers the browser can read. Cross-origin responses expose only the CORS-safelisted headers (such as `Content-Type`) plus those the server lists in `Access-Control-Expose-Headers`; the tab says so. The chosen tab stays until the page reloads.
- **Keep response**: a live response lasts while the pane shows that step's result (steps without a result keep it too) and is dropped when the reader moves to another result, switches variant or picks another request. **Keep response** keeps it in memory until the page reloads, so coming back shows it (`Kept · …`); **Show captured** discards it.
- **Failures**: a request is aborted after 30 s. On a timeout or a network/CORS failure the pane says so and shows the step's captured output instead (or only the notice when the step has none). A request the browser cannot build (an invalid URL, a body on `GET`/`HEAD`) is reported and not sent.
- **Service errors**: see [below](#service-errors).
- **CORS**: requests are sent with `fetch` from the reader's browser without cookies, so the service must allow cross-origin requests; browsers drop headers they forbid (such as `Host` or `Cookie`). Give such steps a captured `output=` so they still show a result.

### Service errors

Some APIs report errors inside a successful response: ArcGIS REST, for example, answers HTTP 200 with `{ "error": { "code": 498, "message": "Invalid token." } }`. Declare how to recognize them in `requests/errors.json`:

```json
{
  "object": "error",
  "code": "error.code",
  "message": "error.message",
  "help": {
    "498": { "text": "The token is expired, revoked or mistyped.", "link": "https://…/error-codes#498" }
  },
  "fallbackLink": "https://…/error-codes"
}
```

- `object`, `code` and `message` (required) are dot paths from the root of the response body. A JSON body where `object` is an object is a service error, whatever the HTTP status.
- `help` (optional) maps codes to a short `text` and a `link`; `fallbackLink` (optional) is shown for codes without help. Links must be `http(s)` URLs.
- The pane shows the failure prominently: a red badge (`Error 498 · HTTP 200`), a notice with the code, the message, the help text and its link, and the body below it.
- The build validates the file (valid JSON, required paths, help entries, URLs, unknown keys) and reports errors as `requests/errors.json:<line>`. It is not a request file and is zipped with `requests/`.

## Files Not Shown in Tabs

- Binary files (images, fonts, jars, archives, anything with a NUL byte) never get a tab. They are published under `preview/` and added to the ZIP byte for byte.
- With `files` set, text files that match no pattern are also left out of the code panel and the page, and still go into the ZIP.
- Files not shown in tabs cannot contain `@var` markers, and a `<Step file>` must point at a file shown in a tab.
- `index.html` is always available to the Preview, whether or not it is shown in a tab.

## Code Variants

Variants show the same tutorial in several programming languages, for example a REST call as cURL, Python and Node.js. The prose and the steps are shared; only the code changes. When the explanations themselves differ by language, write separate tutorials instead.

### Layout

Each variant lives in its own folder under `code/`. With `variants`, every code file must belong to a variant folder.

```text
tutorial/
  tutorial.mdx
  code/
    python/
      request.py
      requirements.txt
    curl/
      request.sh
    node/
      index.mjs
      api.mjs
```

```yaml
---
title: Call the items API
variants:
  - { id: python, label: Python, dir: python, entry: request.py, files: ["request.py", "requirements.txt"] }
  - { id: curl, label: cURL, dir: curl, entry: request.sh }
  - { id: node, label: Node.js, dir: node, entry: index.mjs }
---
```

| Key | Required | Notes |
|---|---:|---|
| `id` | yes | Lowercase letters, digits and dashes. Used in `?variant=` and `only=`. |
| `label` | yes | Shown in the language switcher. |
| `dir` | yes | Folder relative to `code/`. Folders must not overlap. |
| `entry` | yes | File shown first, relative to `dir`. |
| `files` | no | Like the top-level `files`, relative to `dir`. The top-level `files` cannot be combined with `variants`. |

### Steps across variants

Region ids are the contract between variants. Give the same region the same id in every variant, in whichever file it lives:

```mdx
<Step id="request" region="request">

## Send the request

</Step>
```

- Within a variant, a region id may appear in only one file, so `region` alone identifies the file.
- `file` is relative to the variant folder and must exist in every variant the step covers.
- Every step region must exist in every variant, unless the step sets `only`:

```mdx
<Step id="install" file="requirements.txt" only="python">

## Install dependencies

</Step>
```

`otherVariantSteps` decides what readers of other variants see for such a step:

- `notice` (default): the step stays in place and keeps its number; the code panel keeps its file, clears the focus and shows "This step applies to Python" with an action to switch.
- `hide`: the step disappears from the explanations; numbering and progress count only the steps of the active variant. A `#step` link to a hidden step switches to that step's variant.

### Reader experience

- The language switcher sits at the start of the code header. It is a segmented control for up to four variants whose file tabs all fit next to it, and a dropdown otherwise (five or more variants, or a narrow code panel). This is automatic.
- Switching keeps the current step and focuses the same region in the new variant's file. A text-only step keeps the file with the same path when the new variant has it, else shows the new variant's `entry`.
- The choice is remembered for the whole site and can be linked: `?variant=curl#request`. An unknown id is ignored.
- Form fields are shared: one `@var` name fills every variant, and all its occurrences need the same default literal.

### Preview and downloads

- A variant is web code when its folder has `index.html`. Only web variants show the Preview; other variants show the [Result pane](#result-pane) instead when the tutorial has captured outputs. `preview` in the frontmatter applies to the web variants, and a tutorial without any web variant needs no `index.html`.
- A web variant's Preview runs from its own page, `preview/<dir>/index.html`, with every file of the variant published next to it, so relative references such as `./main.js` or an OAuth callback page resolve inside the variant folder.
- The ZIP holds only the active variant: its folder becomes the root of the archive, named `<tutorial>-<variant id>.zip`, plus `requests/` when the tutorial has it. The ZIP badge and tooltip count those files.

## Validation

Builds fail when MDX references unknown files, regions, variables or images, when code markers are malformed, or when a frontmatter field is invalid (for example an unknown `theme`, a `logo` missing from `images/`, or Preview enabled without `code/index.html`). Every error names the MDX file, line and column; frontmatter errors point at the offending key. In dev mode, validation re-runs whenever `tutorial.mdx` or a file under `code/`, `images/`, `requests/` or `output/` changes, and errors appear in Astro's browser overlay at the first failing MDX line.

For a package/build/runtime change, run:

```sh
CI=true pnpm preflight:package
```

For docs-only changes, run:

```sh
CI=true pnpm preflight:docs
```
