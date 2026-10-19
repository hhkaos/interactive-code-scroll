# Components

MDX tags available in `tutorial.mdx` without imports. Build errors name the file, line and column.

## `<Step>`

One step: heading, explanation, and what the right side shows while it is active.

```mdx
<Step id="configure" file="main.js" region="config" collapsed>

## Configure the app

Explain the change here.

</Step>
```

| Prop | Values | Notes |
|---|---|---|
| `id` | lowercase letters, digits, `-` | Required, unique. URL anchor `#id`. |
| `file` | path relative to `code/` (to the variant folder with variants) | Omitted: keeps the current file. Must be shown in tabs. |
| `region` | region id, or JSON Pointer (`/dependencies`, range `/name../scripts`) | Omitted: whole file, no highlight. Without variants, needs `file`. With variants, a region id alone names one file per variant. |
| `images` | `{["a.png", "b.png"]}` | Carousel from `images/` instead of code. Static array only. Step keys page through images first. |
| `embed` | path in `embeds/` (file, or folder with `index.html`, `?query`/`#fragment` kept) or `https://` URL | Page in an iframe instead of code. Same page with another fragment on consecutive steps moves in place (slide decks). Not with `images`. |
| `output` | file name in `output/` | Captured result in the Result pane (non-web code only). Looks up `output/<variant id>/name` first. |
| `request` | space-separated `# @name`s from `requests/` | Adds **Run request**; the first is the default. Give the step an `output` too (shown before running and on network failure). |
| `view` | `preview`, `console`, `result` | Selects a view and opens the lower pane. `console` needs frontmatter `console: true`. |
| `collapsed` | flag, or `{false}` | Folds the lower pane; `collapsed={false}` opens it without changing view. Do not combine with `view`. |
| `panelHeight` | number 15–85 | Lower pane height, % of the right column, applied on each entry. Static number only. |
| `maximize` | `code`, `panel`, `none` | Maximizes code/media or the pane (Preview or Result); `none` restores. `panel` needs a pane and cannot go with `collapsed`. |
| `only` | space-separated variant ids | With variants: the step applies to those only. |
| `outline` | flag (no value) | The list of steps instead of code (a recap). Not with `file`, `region`, `images`, `embed`. |

Examples:

```mdx
<Step id="config" file="main.js" region="config">
<Step id="register-app" images={["1-create-item.png", "2-copy-client-id.png"]}>
<Step id="why-pkce" embed="oauth-slides/#/3">
<Step id="results" region="results" output="candidates.txt">
<Step id="request" region="request" output="geocode.json" request="geocode-get geocode-post">
<Step id="run-it" output="geocode.json" maximize="panel">…</Step>
<Step id="back" maximize="none">…</Step>
<Step id="recap" outline>
<Step id="install" file="requirements.txt" only="python">
<Step id="inspect" file="main.js" region="response" view="console" panelHeight={30}>
```

A step that switches to another file shows a file chip and animates the switch; keep headings short (they are the titles in the step index and outline; a step without a heading is "Step N").

Slidev decks for `embed`: `routerMode: hash`, then `npx slidev build --base ./ --out ../tutorial/embeds/<deck>`.

## `<Intro>`

Optional content before the first step: not numbered, no code focus.

```mdx
<Intro>

## Before you start

Install the prerequisites.

</Intro>
```

| Prop | Notes |
|---|---|
| `view`, `collapsed`, `panelHeight`, `maximize` | As on `<Step>`, applied while the intro is shown. `<Intro collapsed>` gives a calm first screen. |
| `file` | File shown (no focus), e.g. `README.md`; comes first in the tabs. Not with `images`/`embed`. |
| `images`, `embed` | Media instead of code (a title slide, an overview picture). |
| `outline` | Step list instead of code; the default when the intro sets no `file`, `images` or `embed` (frontmatter `outline: false` turns that default off). |

`region`, `output`, `request` and `only` are build errors on `<Intro>`.

## `<Outro>`

Your text in the closing panel after the last step (the panel also offers the next tutorial, the ZIP, the Preview and feedback). No props, once, after the last `<Step>`. With frontmatter `completion: false` there is no panel and `<Outro>` is an error. In presentation mode it is the closing slide with a QR code.

```mdx
<Outro>

You signed in with OAuth. Next, store the token on a server.

</Outro>
```

## `<VarField>`

A form field that edits an `@var` literal in the code, the Preview, the ZIP and the requests. Empty restores the default (the literal in the code).

```mdx
<VarField name="clientId" label="Client ID" secret persist />
<VarField name="portalUrl" label="Portal URL" placeholder="https://example.com" persist />
<VarField name="keyTitle" label="Key name" json="key-config.json#/title" />
<VarField name="portal" label="Portal" type="select" options="portals.json" />
<VarField name="slot" label="Key slot" type="radio" layout="horizontal" options={[{ value: 1, label: "Slot 1" }, { value: 2, label: "Slot 2" }]} />
<VarField name="privilege" label="Privilege" type="combobox" options={["premium:user:basemaps", "premium:user:geocode"]} />
<VarField name="description" label="Description" type="textarea" />
```

| Prop | Values | Notes |
|---|---|---|
| `name` | var name | Required. An `@var` in a code file, or a file variable of a `.http` file. |
| `label` | string | Required. |
| `json` | `"file.json#/pointer"` or an array of them | Makes a JSON value the var (JSON has no comments). Array: one target per variant. |
| `type` | `text`, `textarea`, `select`, `radio`, `combobox` | Default from the var: text (string), number input (number), switch (boolean). Choice types take string or number vars. |
| `options` | static array of strings, numbers or `{ value, label }`, or a JSON file name in `field-options/` | For `select`, `radio`, `combobox`. The code default must be one of the values (`combobox` may start empty with `""`). |
| `layout` | `vertical`, `horizontal` | `radio` only. |
| `placeholder` | string | Hint only; not for boolean vars, `select`, `radio`. |
| `secret` | flag | Text fields of string vars: masks input, code and request line. |
| `persist` | flag, or `"tutorial"` | Stores the value in `localStorage`; plain `persist` shares it across the series site, `"tutorial"` keeps it to this tutorial. |

Consecutive fields form a grid group; prose between them starts a new group.

## `<Hint>`

Inline side note with a hover/focus popover. The content between the tags is the popover.

```mdx
The Preview runs from a <Hint id="same-origin" label="same-origin page">A real URL under the generated site.</Hint>.
```

| Prop | Notes |
|---|---|
| `id` | Required, unique, lowercase letters, digits, `-`. |
| `label` | Required: the underlined text in the sentence. |

For essential or long content use prose or `<details>` (blank line after `<summary>` and before `</details>`). `data-speech="skip"` on an element keeps it out of read-aloud.

## Series index components (`tutorials/index.mdx` or a custom index page)

| Component | Props | Notes |
|---|---|---|
| `<TutorialList>` | `tags="A, B"`, `level="Beginner"` | A section of cards; `tags` keeps tutorials with any of them; a tag or level no tutorial has fails the build. No props: every tutorial. |
| `<TutorialFilter>` | none (`tagGroups={…}` on a custom page) | Search bar filtering every list on the page. At most one. |
| `<TutorialFavorites>` | none | Star on every card plus a "Favorites" section. At most one. |

Any other component in `index.mdx` is a build error.
