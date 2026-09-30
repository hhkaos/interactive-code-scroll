# InteractiveCodeScroll

> A framework for building guided, interactive code tutorials (in the style of the [Stripe Checkout quickstart](https://docs.stripe.com/checkout/quickstart)) by writing MDX and annotating source code — designed both for self-paced reading and for projecting at conferences.

---

## Problem

Today, technical tutorials are read step by step with the code split into many separate blocks (e.g. [ArcGIS Esri Leaflet – Find places nearby](https://developers.arcgis.com/esri-leaflet/places/find-places-nearby/)).

At conferences (e.g. explaining user authentication with OAuth 2.0 in the ArcGIS Maps SDK for JavaScript):

- Existing documentation UIs are not designed for projection: navigation bars and extra page elements add noise, and the experience is not interactive.
- Presenters open their IDE and walk through the code step by step.
- Many sessions are not recorded; remembering the steps and reproducing them at home is not trivial.

---

## What this is

A library/tool/"framework" that lets technical writers, devrels and speakers easily create guided, interactive tutorials. The author writes MDX (text for the left panel) and annotates source code; the build produces a static website with documentation and code side by side, synchronized by scrolling. It serves both for presenting in a talk and for attendees to reproduce the tutorial afterwards.

InteractiveCodeScroll is generic. It must not assume ArcGIS, OAuth, maps, or any specific tutorial topic in the core package, CLI, runtime, validation or public documentation. ArcGIS OAuth is an example/tutorial use case only.

It targets tutorials in any programming language and toolchain, not only browser code: web apps (HTML/JS/CSS), REST APIs (`.http`, cURL), scripts (e.g. Python) and native projects (e.g. Kotlin, Swift, C#, C++, Dart). Only web code runs in the browser Preview; other code shows captured output or, for HTTP requests, a live request runner. Planned work and phasing: `docs/research/arcgis-multi-sdk-plan.md`.

---

## Core features (v1)

### Layout
- **Side-by-side**: documentation (left) and code (right).
- **Resizable splitters** between docs and code, and between code and Preview; sizes are remembered. Resizing the explanations (splitter or window) keeps the active step centered and never switches steps while the text reflows. A handle on the docs/code splitter hides/shows the explanations.
- **Logo** (optional, `logo` frontmatter, a file in `images/` or an absolute `https://` URL): shown in the header and used as favicon. Square SVG, or PNG of at least 512×512.
- **Light + Dark** with a manual toggle (remembered). The author sets the tutorial's default with the `theme` frontmatter (`auto` = `prefers-color-scheme`, the default; `light`; `dark`). The code panel and the Preview iframe follow the page mode (the iframe's `prefers-color-scheme` follows it, so apps using `calcite-mode-auto` match).
- **Look and feel**: Esri corporate (Calcite Design System). Calcite components are styled only through their tokens, props and slots.
- **Readable at high zoom**: code and text must stay readable when the browser font size is increased (CMD+"+" or similar). At 200 % on a 1440×900 screen the Result pane header stays on one row (when it runs out of room, "Keep response" and "Show captured", then "Run request", become icons with tooltips; the badge text is cut last, with the full text as a tooltip); in a short pane the request line shows at most two lines and the request line, notices and body scroll together, so the body is always reachable; in a narrow pane the request source label is hidden.

### Code model
- **Final code + highlighting** (like Stripe): each file exists in its final version; steps only highlight regions. No incremental code per step.
- **Line numbers**: the rendered code panel shows stable line numbers in a left gutter.
- **Long lines**: tutorials may enable `codeWrap: true` in frontmatter to wrap long code lines instead of showing horizontal scrolling. It defaults to `false` so code shape is preserved unless the author opts in.
- **Languages**: syntax highlighting chosen by file extension for common languages (JS/TS, HTML, CSS, JSON, Markdown, shell, YAML, Python, Kotlin, Swift, C#, XAML, Java, C++, QML, Dart, XML, TOML, SQL, `.http`, …), with an optional `languages` frontmatter override (`{ extension: shikiLanguage }`).
- **Visible files**: optional frontmatter `files:` (ordered globs relative to `code/`) selects which files get tabs. Other files are not rendered or embedded in the page, but are still published under `preview/` and included in the ZIP. Binary files are copied byte for byte and never rendered. Files not shown in tabs may not contain `@var` markers (build error): the page does not embed them, so the ZIP fetches them, and binary files, from their published `preview/` copies when the reader downloads it.
- **Code variants / language switcher**: a tutorial can show the same steps in several languages (e.g. cURL, Python, JavaScript). Variants suit tutorials whose steps and prose are shared; when the explanations themselves differ by language, use sibling tutorials. `.http` request files are not variants (see Result pane).
  - **Config**: frontmatter `variants: [{ id, label, dir, entry, files }]`. `id` is lowercase letters, digits and dashes, unique; `label` is required; `dir` (relative to `code/`) is unique and must exist; `entry` (relative to `dir`) must be a text file; `files` is optional and works like the top-level `files:` (globs relative to `dir`). With `variants`, every file under `code/` must belong to exactly one variant folder (no shared root files), and the top-level `files:` is a build error. Without `variants`, the tutorial is a single project as before.
  - **Steps**: region ids are the contract across variants. Within a variant, region ids are unique across all its files (not only per file), so `<Step region="auth">` without `file` resolves the file in the active variant; each step carries a per-variant file map computed at build time. `file` is relative to the variant folder and must exist in every variant the step covers; a `file` without `region` shows that file. Every step region must exist in every variant unless the step sets `only="python curl"` (space-separated variant ids).
  - **Steps limited to other variants**: frontmatter `otherVariantSteps` chooses what readers of another variant see. `notice` (default): the step stays visible and numbered; the code panel keeps its file, clears the focus and shows a notice "This step applies to <labels>" with an action that switches to the first listed variant. `hide`: the step is removed from the explanations in other variants; numbering, progress and the step count follow the visible steps, and a `#step-id` link to a hidden step switches to the step's first variant.
  - **Choice**: the switcher sits at the start of the code header, before the file tabs. Its form is automatic, not an author option: a segmented control (every option visible, one click) for up to four variants, a dropdown showing the active variant from five on, and the dropdown also whenever the segmented control would push some of the active variant's file tabs out of view (e.g. a narrow code panel). Both forms have the same accessible name and behavior. The active variant is `?variant=`, else the remembered choice (`localStorage` `ics:variant`, shared per site, ignored when the tutorial has no such id), else the first variant. Switching updates `?variant=` without reloading, keeps the `#step` hash and the current step, and moves the focus to the same region in the new variant's files. Only the active variant's files are shown as tabs.
  - **Preview and downloads**: a variant is web code when its folder contains `index.html`: it gets the browser Preview, from its own preview page at `preview/<dir>/index.html` (every file of the variant is published next to it); other variants get the Result pane. With `variants`, the `preview` frontmatter applies to web variants only, and a tutorial with no web variant is valid with any `preview` value. Downloads and Preview use the active variant: the ZIP holds the variant folder at its root plus `requests/` when present, is named `<tutorial>-<variant>.zip`, and its badge counts that variant's files. Vars are shared across variants by name.
- **Sibling tutorials**: separate tutorials of a series site (each with its own MDX, e.g. `display-map-js`, `display-map-python`) declare the same frontmatter `family` and a `familyLabel` (e.g. "Python"). There is no conditional per-language content inside one MDX.
  - **Switcher**: in the page header, after the title (not in the code header, which holds the variant switcher). Switching tutorials is navigation, not a setting, so it looks different from the variant switcher: always a menu button labeled "Tutorial for: <current label>" (the prefix hides on narrow headers; the accessible name keeps it), whose items are plain links (`href`, usable without JS) to the family's tutorials, ordered by `order`, then label, with the current one checked. A family with a single tutorial on the site shows no switcher. No second list of siblings in the explanations (UX review 2026-09-30: redundant with the header, and it sat next to same-named variants).
  - **Navigation**: choosing a sibling loads its page with the current `#step` hash, so it lands on the step with the same id when it exists, else the top. The active code variant is passed as `?variant=` only when the sibling has a variant with that id (otherwise the sibling picks its own as usual).
  - **Validation**: `family` and `familyLabel` are non-empty strings and go together (either one alone is a build error). Two tutorials of a family with the same `familyLabel` fail the build. A family with a single tutorial and `family` on a single-tutorial site are warnings (no effect). Variants and a family may be combined.
  - **Index**: cards stay one per tutorial (no grouping by family).

### Scroll-driven focus
An optional `<Intro>` block can appear before the first `<Step>`. It is rendered as tutorial introduction content,
does not count as a step, does not get a step number, and does not activate code focus. When a tutorial has an
intro, the top of the explanations panel is a no-step state; the first real step activates only when reached by
scrolling, clicking or step-key navigation.

When a step comes into focus, its text block can:
- highlight parts of the code (focus + gray out the rest + auto-scroll so the whole region is visible when it fits, else its start; no scroll when it is already in view),
- switch from one file to another (`server.js`, `checkout.html`, etc.),
- switch the right panel from code to an image or image carousel.
- A step with a `file` and no `region` shows that file with no focused lines; a text-only step (no `file`) keeps the current file visible but also clears any previous focus.

### Step navigation
- **Free scroll**: the active step is determined by scroll position (the step crossing the center line; back at the top, the first step unless the tutorial starts with `<Intro>`, in which case there is no active step).
- **Click**: clicking a step (outside its links and fields) activates it; short steps and the first ones may never cross the center line.
- **Numbered steps**: each step's heading shows its number (as in "Step N of M").
- **Keyboard / clicker**: arrows and PageDown/PageUp jump to the next/previous step with snapping (compatible with presentation clickers). PageDown/PageUp (what clickers send) move steps wherever the focus is (fields, the JSON tree, Result pane tabs and controls, splitters, the Preview), except in multi-line text; arrows stay with the focused field or widget that uses them (fields, the JSON tree, the Body/Headers tabs, "Run as", splitters).
- **Deep link per step**: URL with `#step-id` to share or resume.
- **Progress indicator**: a bar under the header; "Step X of N" text in presentation mode.

### Image carousel
- Step keys (arrows, PageUp/PageDown, clickers) first page through the carousel's images; past the last image they move to the next step, before the first image to the previous step. Entering a carousel step backwards starts at its last image.
- The carousel's own controls also work.
- Clicking an image opens it in a full-screen viewer; step keys keep paging the images there, and leaving the step's images (or Esc) closes it.

### Preview
- **Optional**: the author can disable it per tutorial.
- **Configurable mode** per tutorial: embedded **iframe**, **open in new tab**, or **both**.
- **Preview page**: both modes load a same-origin preview page (`preview/`) that renders the current files (form values applied). Client-side only. Not `srcdoc`/blob: the ArcGIS Maps SDK derives the OAuth `redirect_uri` from `location`, which is `about:srcdoc` there.
- **Iframe mode**: iframe pointing at the preview page, collapsible to a header bar that keeps its controls (Run, open in new tab); sandbox `allow-scripts allow-popups allow-forms allow-same-origin` (same origin is required by the OAuth callback; tutorial code is trusted author code).
- **Per-step Preview state**: a step can set `preview="expanded"` or `preview="collapsed"` to open or collapse the iframe (or the Result pane) when that step becomes active; omitted or `preview="keep"` preserves the viewer's current state.
- **New tab mode**: opens the preview page in a new tab; OAuth can use a regular redirect.
- **Refresh**: automatic after form changes (~500 ms debounce) + manual Run/Reload button.
- **OAuth in iframe mode**: sign-in opens in a **popup** (ArcGIS Maps SDK `OAuthInfo` with `popup: true`) and returns via the tutorial's own `code/oauth-callback.html` (it is part of the tutorial: shown, explained, downloaded). Every `code/` file is published next to the preview page (`preview/<path>`, markers stripped), so relative references resolve there.

### Result pane *(Phase 1: pane, captured output, JSON viewer, request runner, Body/Headers tabs, error rule and presentation fit built)*
For code that cannot run in the browser Preview (scripts, native apps, HTTP requests). It takes the Preview's place under the code (same splitter and header bar): a variant with web code shows the browser Preview, any other variant shows the Result pane instead. A tutorial without variants is web code when `code/` has `index.html`. The Result pane appears only when the tutorial has at least one step with `output=` or `request=`; a step without either keeps the last result: the one of the nearest earlier step that has a result for the active variant (steps limited to other variants are skipped), so a step shows the same result however the reader reached it (scroll, keys, deep link, variant switch); before any, an empty state. Like the Preview, its header collapses the pane and a step's `preview="expanded|collapsed"` applies to it.
- **Captured output**: optional `output/` folder (per-variant override in `output/<variant>/`, looked up before `output/<name>`; the file must resolve for every non-web variant the step covers; `output=` on a step whose covered variants are all web code, or in a tutorial without variants that has `code/index.html`, is a build error, since web code shows the Preview). `<Step output="result.json">` shows it in a Result pane: collapsible JSON viewer for `.json` (a file that does not parse shows as plain text), terminal style for `.txt`/`.log` (prompt lines such as `$ cmd`, `> cmd`, `>>> cmd` or `PS C:\> cmd` color the prompt and the command; ANSI color codes (SGR: 16 colors, bold, dim, italic, underline) become colored text; other escape sequences are removed; all rendered as text nodes), image for `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` and `.svg`; any other type is a build error. Outputs are published as static files and fetched when shown (not embedded in the page). Works offline.
- **JSON viewer**: collapsible tree built from text nodes (never HTML), with token colors for keys, strings, numbers/literals and punctuation in light and dark. The root (level 0) and levels 1–2 start expanded; deeper objects and arrays start collapsed with a count (`2 keys`, `3 items`). Objects and arrays with more than 100 entries show the first 100 and a "Show more" action that adds 100 at a time. Numbers keep their source text where the browser allows it (no rounding of large ids). Keyboard: tree semantics (arrow keys move and expand/collapse, Home/End, Enter/Space toggle); arrow keys inside the tree do not move steps, PageDown/PageUp do.
- **HTTP request runner**: requests live in `.http` files under an optional `requests/` folder (VS Code REST Client / JetBrains HTTP Client syntax). They are the runner's source only: not a code variant and not a code tab, but included in the ZIP. `<Step request="name">` binds a named request (`# @name`). A step may list several names for the same operation (e.g. `request="geocode-get geocode-post"` for an HTTP GET and an HTTP POST): the first is the default, and a "Run as" picker in the Result pane appears only when there is more than one. Requests bind inputs through `.http` file variables (`{{name}}`), not through parameter names, so alternative requests may carry the same input under different parameter names, headers or body fields (e.g. `?token=` on GET, an `X-Esri-Authorization` header on POST) while one form field feeds them all. A Run button sends it with `fetch` from the browser (without cookies), with current var values applied (a var without a field takes its file default), and shows status, time, body and headers. Run is always explicit: activating a step never sends a request. Substituted values are URL-encoded in the request line's query string and inserted as-is in headers and body. A request that takes longer than 30 s is aborted. On a network/CORS failure or timeout it falls back to the step's captured output and says so. The pane shows the request line (method and URL) that Run sends; secret vars are masked in it (as in the code panel); a "Show secrets" toggle reveals them for debugging (off on every page load, never remembered). A live response lasts while the pane shows that step's result; showing another result, switching variant or picking another request drops it (and aborts a request in flight) without asking. "Keep response" keeps it in memory, keyed by step and request, until the page reloads: coming back shows it as kept, and "Show captured" discards it. A request the browser cannot build (invalid URL, a body on GET/HEAD) is reported and not sent. Response data and captured output are rendered as text only (never as HTML): they are untrusted. The build warns (without failing) when a captured output looks like it contains a credential: `token=`, `"token":`, `apiKey` or `Authorization: Bearer` followed by a value that is not a var default.
  - **Supported `.http` syntax**: `###` separators; `# @name x` or `// @name x` (letters, digits, `_`, `-`; unnamed requests are allowed but cannot be bound); file variables `@x = value`, file-scoped wherever they are defined; a request line `METHOD URL` (optional `HTTP/x`; METHOD one of GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS), optionally continued by query lines starting with `?` or `&`; headers; a blank line; the body. Build errors: request variables (`{{name.response…}}`), system variables (`{{$…}}`), `< file` bodies, pre-request and response handler scripts, `{{x}}` with no file variable `x` in the same file, a request line without a supported method, a request name defined twice across `requests/`, a `request=` name that does not exist or is listed twice, `request=` on a step whose covered variants are all web code (or in a tutorial with `code/index.html`), binary files in `requests/`, and a `code/requests/` (or `code/<variant dir>/requests/`) folder that would overwrite `requests/` in the ZIP. A `.http` file under `code/` is an ordinary code file and is never run.
  - **`requests/` contents**: `.http` files are parsed; other text files (e.g. `errors.json`, a README) are allowed and zipped as is. Every ZIP (variant or not) holds `requests/` next to the project, with form values applied to file variables, and its badge counts them. Request file variables are vars: a `<VarField>` may target one, and the same-default rule spans `code/` and `requests/`.
  - **Response view**: Body and Headers tabs. Body: JSON viewer for JSON, image for `image/*`, text otherwise (text over 200 KB is truncated with a "Show all" action). Headers: only headers the server exposes to the browser through CORS are visible; this limitation is documented.
- **Service errors in successful responses**: some APIs (e.g. ArcGIS REST) answer HTTP 200 with an error object in the body. The runner treats a response as failed when its JSON body matches a declarative error rule (JSON path of the error object, its code and its message; checked on any status, so non-2xx bodies are explained too), shows the code and message prominently, and explains the code from an error help table (short text + reference link per code, with a fallback link for unknown codes). Core ships the mechanism only; rules and help tables come from the tutorial or a preset package (the ArcGIS preset provides the ArcGIS rule and a curated table of common codes). The tutorial declares them in `requests/errors.json`: `{ "object": "error", "code": "error.code", "message": "error.message", "help": { "498": { "text": "…", "link": "https://…" } }, "fallbackLink": "https://…" }` (dot paths from the body root; `help` and `fallbackLink` optional; links must be http(s)). The pane shows a red `Error <code> · HTTP <status>` badge and a notice with code, message, help text and link above the body. The build validates this file and reports errors against it; it is not a request file and is included in the ZIP.
- **Result views and renderer plugins** *(planned, Phase 3)*: the author chooses extra views of a step's result, shown as tabs in the Result pane next to Body and Headers (e.g. **Body · Preview on map · Show as table · Headers**).
  - **Renderers** are client modules registered in the integration config: `interactiveCodeScroll({ renderers: { map: "interactive-code-scroll-arcgis/geocode-map", table: "./renderers/table.ts" } })`. Each default-exports `{ accepts?(data), render(element, data, context) }`; `render` may return a cleanup function. Core JSON, text and image rendering (the Body tab) stays built in. Topic-specific renderers (e.g. geocode candidates on a map) live in optional packages or in the tutorial.
  - **Views** are declared once in the frontmatter: `views: { map: { renderer: map, label: "Preview on map" }, table: { renderer: table, label: "Show as table" } }`. The label is the tab title.
  - **Steps** pick them: `<Step … views="map table" view="map">` lists the step's extra tabs in order; `view=` is the tab shown first (default: Body). A step without `views=` shows Body (and Headers for live responses) only. Like `output=`/`request=`, a step without a result keeps the last result, with its views.
  - **Data**: a view renders the step's current result, captured output or live response alike (so a map works offline from `output/geocode.json`): parsed JSON, text or an image URL, plus context (content type, status, source, variant). Renderers get data, never HTML to insert; renderer code is author-trusted (like Preview code), response data is not. Renderers that load third-party code (e.g. the ArcGIS Maps SDK) run it in a sandboxed iframe.
  - **Choice is explicit**: the author decides which views a step shows; `accepts(data)` only disables a tab when the result does not fit (e.g. a service error), with a short reason, and the pane falls back to Body.
  - **Loading**: each renderer is imported only when its tab is first opened; tutorials without views load none.
  - **Validation** (build errors): a step view not declared in `views`, a view whose `renderer` is not registered, a missing or empty label, `view=` not listed in the step's `views=`, `views=` on a step with no result for any variant it covers.

### Forms → variables
- Forms defined in MDX (left panel); filling them updates code variables in real time.
- **Default value**: the literal in the code is the single source of truth (default and field placeholder).
- **Custom placeholder**: `<VarField placeholder="...">` can override the input placeholder without changing the code default used for clearing, downloads or Preview.
- **localStorage persistence**: configurable per field by the author (persist or not). Persisted values are shared by every tutorial on the same site (key `ics:var:<name>`), so a credential is entered once per site; `persist="tutorial"` scopes a value to one tutorial (key `ics:var:<tutorial>:<name>`; on a single-tutorial site it is the site key). Any other `persist` value is a build error.
- **Secret fields**: the author can mark a field as sensitive → masked in the form and in the code, with a **visibility toggle** to reveal it when needed.
- Entered values are included in downloads.

### Markdown content helpers
- Standard Markdown blockquotes render as lightweight editorial notes.
- `<Hint id label>...</Hint>` renders inline clarification text with a dashed underline and a hover/focus popover. The `id` is required and unique; the body may contain HTML such as links. Hints are for short contextual explanations; longer or essential content should use standard prose or `<details>`.

### Download
- **Single file** (button on each file tab).
- **ZIP of the full project** with form values applied, runnable locally.
- **Copy to clipboard**.
- Framework markers (`#region`, `@var`) are stripped from rendered and downloaded code.

### Presentation mode
- "Full screen mode" that fully hides/collapses the navigation bar.
- Allows hiding/collapsing the explanations in the left panel.
- **Maximize a pane**: the code panel, the iframe Preview and the Result pane each have a maximize icon in their header. A maximized pane fills the browser window over the rest of the page (in full screen mode, the whole screen); the icon (then "minimize") or Esc restores the previous layout, including splitter sizes. One pane at a time. The code pane is the code area: on a step with images, the carousel fills the window instead, with a floating restore action (it has no header). Maximizing a collapsed Preview or Result pane expands it; collapsing a maximized one restores the layout first. A step can set `maximize="code"`, `maximize="preview"` (the web Preview or the Result pane, whichever the active variant shows) or `maximize="none"` to maximize a pane or restore the layout when it becomes active; omitted keeps the current state. Build errors: `maximize="preview"` with `preview="collapsed"`, and `maximize="preview"` in a tutorial with no pane to maximize (no iframe Preview and no step with a result). Step keys keep working while a pane is maximized (code focus and the last result update underneath). Esc goes one level at a time: an open dialog first, then the maximized pane, then presentation mode; Esc pressed inside the Preview (and not handled by the app) also restores the layout. In browser full screen the browser takes the first Esc to leave it (and presentation mode); the pane stays maximized until the next Esc. Page-level maximize, not the browser Fullscreen API on the pane (it would replace presentation full screen and hide Calcite popovers and dialogs). Not remembered across reloads.

### Authoring and DX
- **Dev mode** with file watching and live updates.
- **Strict validation**: if the MDX references a region, file, variable or image that does not exist, the build fails with a clear error (file, line, ID). In dev mode it is shown as a browser overlay without crashing the server. Validation also reads the frontmatter: invalid fields report the key's MDX line, and later frontmatter-dependent rules (`files:`, `variants:`, `only=`, `request=`, `output=`) use the same path. It re-runs in dev when files under `code/`, `images/`, `requests/` or `output/` change.
- **Serve locally**: the CLI can serve the built site on localhost (fallback if conference wifi fails; Preview/OAuth still need network — plan B: images/carousel of the result).
- **Generic CLI**: CLI commands must work for any InteractiveCodeScroll tutorial. Topic-specific helpers, such as OAuth redirect URI printing, must be opt-in or derived from explicit tutorial/project configuration, never hard-coded into the framework.
- Supports **both layouts**: one tutorial per repo, or several tutorials in one repo (a *series site*) with an index page:
  - **Series layout**: `tutorials/<slug>/` (each a normal tutorial folder with `tutorial.mdx`) is published at `/<slug>/`, with its Preview, published code and captured outputs under that prefix. One Astro build serves the whole site; dev serves every tutorial and the index with live updates. The slug is the folder name and must match `[a-z0-9][a-z0-9-]*` (build error otherwise). Folders starting with `_` or `.` are ignored; other folders without `tutorial.mdx` are skipped with a warning; no tutorial at all is a build error.
  - **Activation**: integration option `tutorials: "<dir>"` / CLI `--tutorials <dir>`. Without options, the CLI uses `tutorials/` when there is no `tutorial/tutorial.mdx` and no root `tutorial.mdx` but at least one `tutorials/*/tutorial.mdx`. `--tutorial tutorials/<slug>` still serves one tutorial on its own. `tutorial` and `tutorials` together are an error.
  - **Tutorial metadata** (optional frontmatter, generic): `description` (string; also the page's meta description), `tags` (string list), `level` (free text, e.g. "Beginner"), `duration` (free text, e.g. "20 min"), `order` (number). The index sorts by `order`, then title.
  - **Index page**, customizable in three levels: (1) default: title "Tutorials" and the full list; (2) optional `tutorials/index.mdx`: frontmatter `title`, `description` (shown under the title in the header), `logo` (from `tutorials/images/`, or an `https://` URL as for tutorials), `theme`, free MDX prose, `<TutorialList />` placed anywhere, filtered with `tags="…"` (comma-separated, any of them) and/or `level="…"` to build sections, and `<TutorialFilter />` (at most one) where the tag filter goes; validated at build like a tutorial; without `index.mdx`, the page shows the filter and one list; (3) integration option `index: "<path to .astro page>"` / CLI `--index <path>` replaces the page; it reads the tutorial list (slug, URL, title and metadata) and may render `<TutorialList />` and `<TutorialFilter />` from the public `interactive-code-scroll/series` module; `index` needs `tutorials`, must be an `.astro` file and cannot be combined with `tutorials/index.mdx` (build errors).
  - **List UI**: Calcite-styled cards with title, description, level, duration and tag chips, each linking to the tutorial; the tag filter (chips, any selected tag, client-side; without JS every card shows) filters every list on the page and counts each tutorial once.
  - **Back to index**: in a series, the tutorial header has an action that returns to the index.
  - **Reader state**: stored Preview HTML is namespaced per tutorial. Site-wide on purpose: persisted vars (`ics:var:<name>`, unless `persist="tutorial"`), theme, splitter sizes and the variant choice (the reader's language carries across tutorials).
- **GitHub Pages workflow** for author repos, documented in `docs/deployment.md` as a copy-paste `.github/workflows/pages.yml` in two flavors, npm and pnpm, identical except for the package manager steps. The same file publishes a single tutorial or a series site (the CLI detects the layout); it has no series-specific step.
  - Runs on push to the default branch and on `workflow_dispatch`; pull requests build without deploying. It deploys only after a successful build (validation errors fail it).
  - Node LTS and the official Pages actions (`configure-pages`, `upload-pages-artifact`, `deploy-pages`). Least-privilege permissions per job: the build job has `contents: read` and `pages: read`, the deploy job `pages: write` and `id-token: write`; only the deploy job is in the `pages` concurrency group.
  - `site` and `base` come from the `actions/configure-pages` outputs (`origin`, `base_path`), so project sites, user/organization sites and custom domains work without edits; repository variables `ICS_SITE` / `ICS_BASE` override them.
  - **Base-path contract**: with a non-root base, every internal URL of a series site (index cards, back to index, sibling menu, Preview, published code, captured outputs, ZIP, assets) carries the base, taken from Astro's `base` (a `BASE_URL` environment variable does not change it). A build test checks the series fixture output for root-absolute URLs without it.
- **This repository's CI**: a workflow runs unit tests (including the series fixture built with a project-site base), `astro check` and E2E on every push to `main` (not on pull requests). The getting-started Pages workflow keeps publishing that tutorial, with the same `configure-pages` defaults and `ICS_SITE` / `ICS_BASE` overrides.
- **Scaffolder** *(planned, Phase 2 task 2.3)*: `npm create interactive-code-scroll [dir]` / `pnpm create interactive-code-scroll [dir]` (package `create-interactive-code-scroll`, versioned in lockstep with the core and published with the same dist-tag) asks what to create, writes the project and prints the next steps.
  - **Questions**, in order, each also available as a flag: (1) folder (argument or prompt; an existing non-empty folder asks to confirm or aborts; existing files are never overwritten); (2) layout: one tutorial or a series; (3) series only: tutorial names (slugs, `[a-z0-9][a-z0-9-]*`, comma-separated) and index: default list, `tutorials/index.mdx` with sections, or a custom Astro page (`site/index.astro`, passed with `--index` in the scripts); (4) what the tutorial uses: one checkbox list grouped by kind, where each entry is a kind and a language: **Web app** (JavaScript in the browser, Preview), **REST API** (`requests/*.http`, runner and captured output; cURL, Python, Node.js), **Script** (captured output; Python, Node.js) and **Native app** (code only, no Preview; Kotlin, Swift, C#). Languages are runtimes, so browser JavaScript and Node.js are different entries (TypeScript and others can be added later); a language can be picked once per tutorial. Kinds can be mixed. In a series with several names, the wizard first asks whether all tutorials use the same entries (default yes: one list); otherwise it shows one list per tutorial; (5) with more than one entry, **variants** (one tutorial with the code switcher) or **sibling tutorials** (series only: each name becomes `<name>-<lang>` with `family: <name>` and `familyLabel`). Mixed kinds as variants get one group of steps per kind, limited with `only=` to that kind's variants and hidden for the others (`otherVariantSteps: hide`); as siblings, each tutorial has its own kind; (6) package manager: npm or pnpm, default detected from how the command was launched; (7) GitHub Pages workflow (yes/no), in that package manager's flavor; (8) `git init` (branch `main`) and installing dependencies (yes/no each).
  - **Output**: `package.json` (scripts `dev`, `build`, `serve`; dependencies `astro` and `interactive-code-scroll` at the matching version; with pnpm, `packageManager` and a `pnpm-workspace.yaml` allowing the `esbuild` build), `.gitignore`, a `README.md` with the commands, the tutorial folder(s), the chosen index file and `.github/workflows/pages.yml` when asked. Each tutorial is a minimal working example of its type (a few real steps with regions, `@var` fields and the Preview, captured output or request that type uses) that the author replaces. Endpoints and values are generic placeholders (`https://api.example.com`); a REST Run falls back to the captured output. Nothing ArcGIS-specific: ArcGIS starters come later as templates on the same generator.
  - **Next steps** printed at the end: `cd`, install (when skipped), `dev`, `doctor`; with the Pages workflow, Settings → Pages → Source "GitHub Actions", push to `main`, and the resulting URL shape.
  - **Non-interactive mode**: flags `--layout single|series`, `--tutorials <a,b>`, `--use <kind:lang,…>` (e.g. `rest:curl,script:python`; repeat as `--use <name>=<kind:lang,…>` for one tutorial of a series; `--type <kind> --langs <list>` is a shorthand for one kind), `--languages-as variants|siblings`, `--index default|mdx|custom`, `--pm npm|pnpm`, `--pages`/`--no-pages`, `--git`/`--no-git`, `--install`/`--no-install`; `--yes` fills the rest with defaults. Without a terminal and without `--yes`, a missing answer is an error that names its flag.
  - Every combination the scaffolder can produce builds without errors (tested). The Pages workflow text has one source, the scaffolder's templates; `docs/deployment.md` shows the same text (tested).
  - Out of scope: adding a tutorial to an existing project (`interactive-code-scroll add`, later).

### Public documentation
- **README for repository visitors**: explains what InteractiveCodeScroll is, who it is for, how to start, and where to find the tutorial, reference and examples.
- **Getting started tutorial**: teaches authors how to build their first tutorial with InteractiveCodeScroll. It should be built with InteractiveCodeScroll itself ("eat your own dog food") and live outside the stable E2E fixture.
- **Authoring / API reference**: documents the tutorial folder layout, frontmatter options, MDX components, code markers, Preview behavior, downloads, validation rules, limitations and gotchas.
- **CLI reference**: once the CLI exists, documents `dev`, `build`, `serve`, generated redirect URIs and scaffolding commands.
- **Renderer plugin guide** *(planned, Phase 3, ships with result views)*: `docs/plugins.md` teaches authors to extend the Result pane with custom views:
  - **Create**: the module contract (`accepts?(data)`, `render(element, data, context)`, cleanup), the data and context it receives, text-only rendering of untrusted data, sandboxed iframes for third-party code, a complete example (a table renderer in a few lines of TypeScript).
  - **Install**: a local module in the tutorial project (`./renderers/table.ts`) or an npm package (`pnpm add interactive-code-scroll-arcgis`), and how to publish one as a package.
  - **Register**: `renderers` in the integration config (and the CLI's generated config).
  - **Use in MDX**: frontmatter `views` (renderer + label), `<Step views="…" view="…">`, how views apply to captured output and live responses, and the build errors authors may see.
  - **Test**: rendering a view against captured output locally, without network.
  `docs/authoring.md` documents `views`/`views=`/`view=` and links to the guide; `docs/features.md` lists the capability; the ArcGIS preset README is the worked example of an installed plugin package.
- **Upgrade guide**: documents how authors update existing tutorials when the framework, CLI or client runtime changes, including supported version ranges, breaking-change notes, migration steps and validation commands.

---

## Key user flows

### Author (technical writer / devrel / speaker)

1. Creates a folder named after the tutorial.
2. Creates an MDX file in it with markdown and special components: the text blocks for the left panel.
3. Adds subdirectories with the required code in the same folder.
4. Marks regions in the code with `#region <id>` / `#endregion` comments.
5. Updates the markdown to link actions (highlight, switch file) via those identifiers.
6. Marks configurable variables with an inline comment (e.g. `const clientId = "DEMO_ID"; // @var clientId`) and defines the linked form in the markdown (including whether each field persists in localStorage and whether it is secret).
7. Adds images in one or more folders inside the tutorial.
8. Updates the markdown to indicate which blocks load which images.
9. Configures the Preview (disabled / iframe / new tab / both).
10. Works in dev mode (watch + live reload); reference errors show up as an overlay.
11. Builds (fails on broken references).
12. Publishes the result as a static page on GitHub Pages.
13. Uses the public authoring reference to check supported frontmatter, component props, code markers and Preview behavior.

### End user (attendee / reader)

1. Opens the URL (optionally with `#step-id`).
2. Starts reading and scrolling the left panel (or navigates with the keyboard).
3. The right panel syncs where the markdown says so: highlights code, switches file or shows images.
4. Fills in forms and sees the code change in real time; the Preview refreshes automatically or with Run.
5. At any time copies or downloads a file, or downloads the project ZIP.

### Presenter at a conference

1. Opens the tutorial (GitHub Pages or served locally with the CLI).
2. Enables presentation mode (hides navigation; optionally the explanations panel).
3. Adjusts browser zoom and the splitter; picks light/dark depending on the projector.
4. Moves between steps with the clicker / keyboard; the progress indicator shows the position.
5. Fills in fields live; shows or hides secrets with the toggle.
6. Runs the Preview; the OAuth sign-in opens in a popup (iframe) or redirects normally (new tab).

---

## Out of scope (v1)

- Running backend code. (Must support 100% client-side flows, e.g. OAuth PKCE.)
- Incremental code per step (animated diffs).
- Bundling npm dependencies in the Preview (see Tech constraints).
- CMS or visual editor, for either the writer or the end user.
- Multi-language UI (translating the tutorial interface or content into several human languages). Programming-language variants are in scope (see Code model).
- Running non-web code in the browser (e.g. Pyodide, native builds): non-web code shows captured output instead.
- Custom themes (the UI uses Esri's Calcite Design System; light/dark only).
- Support for browsers without JavaScript.
- Mobile-first: the experience is desktop-first.
- Offline mode / PWA.
- Visual regression and automated accessibility tests.
- Analytics and SEO.

---

## Data model

| Entity | Key fields | Notes |
|---|---|---|
| Tutorial | folder, MDX file, preview config (disabled / iframe / tab / both) | Contains steps, code files and images. A repo can hold one or several |
| Series | tutorials folder, optional `index.mdx` or custom index page | Several tutorials published as one site with an index page |
| Tutorial metadata | slug (folder), title, description, tags, level, duration, order | Frontmatter shown on the index cards |
| Step / Text block | id (deep link), MDX content, associated action | Fires its action when it comes into focus (scroll or keyboard) |
| Code file | path (`server.js`, `checkout.html`…) | Final version; downloadable individually or as ZIP |
| Code region | id | Marked with `#region <id>` / `#endregion`; referenced from MDX |
| Action | type: highlight / switch file / show image(s) | Links a Step to a Region, File or Image |
| Form | fields | Defined in MDX |
| Field ↔ Variable | variable name, persist (off, site-wide or `"tutorial"`), secret (bool) | Variable marked with `// @var <name>`; default = code literal |
| Image / Carousel | image files | In tutorial folders; shown instead of code; manual navigation |
| Variant | id, label, dir, entry, files (optional) | A programming-language version of the tutorial's code under `code/<dir>/`; shares region ids and vars with the other variants |
| Output | file in `output/` (optional per-variant override) | Captured result shown in the Result pane |
| Request | name, `.http` file in `requests/` | Named HTTP request the runner can send; its file variables are vars. A step can bind several requests as alternative ways to run the same operation (e.g. GET and POST) |
| Error rule | object, code, message (JSON dot paths), help (code → text + link), fallbackLink | `requests/errors.json`; marks response bodies holding an error object (any status) as failures and explains them |
| Renderer *(planned)* | id, module path | Registered in the integration config; renders a result as a view |
| View *(planned)* | id, renderer, label | Declared in frontmatter `views`; a step lists its views (`views=`) and the first shown (`view=`) |

---

## Tech constraints

- Authoring in MDX.
- Output: static website publishable on GitHub Pages.
- UI with Calcite Design System (Esri).
- Desktop-first; requires JavaScript.
- TypeScript.
- pnpm.
- Tests: **unit with Vitest** (`#region`/`@var` parser, validation, variable substitution, ZIP generation) and **E2E with Playwright** (scroll/keyboard highlighting, file switching, form → code, download, presentation mode).
- Dependencies on recent, stable and secure versions.
- All repo content (code, comments, docs, commit messages) in English.
- **Tutorial code runs with its own standard toolchain**: the framework never adds a build step. Web code runs as-is in the Preview with dependencies via CDN (script tags / import maps, e.g. `js.arcgis.com`); its ZIP works by opening `index.html` or with a static server. Other code (scripts, native projects, `.http` requests) runs with its usual tools after download (e.g. `python`, Gradle, Xcode, VS Code REST Client); the ZIP contains the complete project, including binary files.
- **Code markup in comments**: tutorial source code must remain valid, runnable and lintable without the framework. Supported marker comment styles are JavaScript/TypeScript line comments (`//`), CSS block comments (`/* */`), HTML comments (`<!-- -->`) and shell/YAML-style comments (`#`). Native styles, each recognized only in its own file types so existing comments never change meaning: C# native `#region id` / `#endregion` in `.cs`; `# region id` / `# endregion` (Python/VS Code folding style) in `.py`; `-- #region id` in `.sql` and `.lua`.
- **Technical base: Astro + MDX + Shiki** (decided after a spike; see Decisions and `docs/research/technical-base-spike.md`).
- **Tutorial folder layout**: `tutorial.mdx` + `code/` + `images/`.
- **Code markup rules** (enforced by the build):
  - `@var` targets the first string literal on its line; one `@var` per line; var names are unique per file. A var name used in several files (or variants) must have the same default literal everywhere; otherwise the build fails naming each file. Runtime values replace the literal in place in the pre-highlighted code, escaped by file type and quote style (backslash for JS-like languages and Python, plus `$` for Kotlin/Dart/Groovy templates; shell and PowerShell quoting; quote doubling for SQL and YAML single quotes; entities for HTML/XML/XAML attributes); literal forms that cannot be escaped safely (Python f-strings, raw and triple-quoted strings, TOML literal strings) are build errors. SQL and Lua also accept `-- @var` comments. In `.http` files, a file-variable line `@name = value` is an unquoted var named `name` whose default is the rest of the line.
  - Region ids are unique per file; regions may nest; empty regions are errors; `#endregion <id>` (optional id) must match the region it closes.

---

## Success criteria

- "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial published on GitHub Pages and used in a talk.
- Public documentation is good enough for a technical writer to create and publish a first tutorial without reading the framework source.
- The "getting started" documentation for InteractiveCodeScroll is itself an InteractiveCodeScroll tutorial.

---

## Decisions

- **MDX syntax.** Frontmatter holds tutorial config; components hold steps and fields. The `title` is the page's h1 (header bar): the MDX should not repeat it as `#`.

  ```mdx
  ---
  title: OAuth 2.0 with the ArcGIS Maps SDK for JavaScript
  preview: both        # off | iframe | tab | both
  theme: auto          # auto (OS preference) | light | dark: default mode; the viewer's toggle wins
  logo: logo.svg       # optional, from images/ (or an https:// URL): header logo and favicon
  ---

  <Step id="config" file="main.js" region="config">
  ## Configure the app
  <VarField name="clientId" label="Client ID" secret persist />
  </Step>

  <Step id="register-app" images={["oauth-step-1.png", "oauth-step-2.png"]}>
  </Step>
  ```

  One region per step for now (a future `region="a b"` stays backwards compatible). File paths are relative to `code/`, image names to `images/`.

- **Technical base: Astro + MDX + Shiki.** Build-time highlighting (Shiki dual themes), `@var` via in-place token substitution (no client-side highlighter), strict validation at build time, framework-free TypeScript on the client. Rejected: Code Hike (client highlighting fetches grammars from a third-party host at runtime, ~7× client JS, code-in-MDX authoring model) and TutorialKit (requires COOP/COEP isolation, which breaks the OAuth popup and is not possible on GitHub Pages).
- **Preview runs from a same-origin page, not `srcdoc`/blob** (spike finding): required for a valid OAuth `redirect_uri` and for the callback to reach `window.opener`.
- **Default Preview mode: `both`** (embedded iframe + "open in new tab"). The tab is the fallback when the OAuth popup is blocked.
- **Distribution: core npm package + `pnpm create interactive-code-scroll` scaffolder.** Generated projects depend on the core package, so improvements arrive via `pnpm update`.
- **Styling: plain CSS with CSS Modules, no SCSS.** Calcite is themed via CSS custom properties; native CSS nesting covers the rest.
- **OAuth redirect URIs: registered by the author.** The CLI prints the exact URIs to register (GitHub Pages and localhost), derived from the base path. The CLI never handles ArcGIS credentials.
- **Generic core boundary.** OAuth redirect URI support is a convenience for tutorials that opt into OAuth-style callback guidance, not a core assumption. Core APIs must stay topic-agnostic and reusable for non-ArcGIS tutorials, demos and presentations.
- **Upgrade path for existing tutorials.** Framework releases should avoid breaking existing tutorials when possible. When a breaking authoring/runtime/CLI change is necessary, document it in the upgrade guide and changelog, keep validation errors actionable, and add coverage in `examples/framework-fixture` when the behavior is observable through a tutorial.
- **Name: InteractiveCodeScroll** (brand, PascalCase); `interactive-code-scroll` for the repo and npm package (kebab-case).
- **License: Apache-2.0.**
- **Out of v1: analytics and SEO.**
- **Multi-SDK support** (survey 2026-09-29, plan in `docs/research/arcgis-multi-sdk-plan.md`): target REST, Python, native SDKs and other web libraries; captured output + `.http` runner for non-web code; language switcher inside one tutorial; visible file subset for large projects; `.py` before `.ipynb`; standalone static sites; multi-tutorial sites early. First vertical slice: a REST tutorial (cURL / Python / JavaScript). No external deadline: phases are ordered by technical risk.
- **Language switcher and requests** (mockup review 2026-09-29): switcher at the start of the code header (segmented control up to four variants, dropdown from five or when space is short; UX review 2026-09-29: an author option would add choices without a better criterion than count and space); `.http` files are only the runner's source (in `requests/`), not a reader-visible variant; a request can offer several ways to run it (e.g. GET and POST) through a "Run as" picker shown only when needed; variant choice is remembered per site and deep-linkable; switching variants keeps the same region focused.
- **Result pane** (mockup review 2026-09-29): replaces the browser Preview for non-web variants; captured output first, Run for live; secrets masked with a debugging reveal toggle; network failures fall back to captured output; error objects inside HTTP 200 responses count as failures and are explained (code, message, help link).
- **Visible files** (mockup review 2026-09-29): only files listed in `files:` get tabs; the ZIP download action shows a small neutral badge with the total number of files in the ZIP, and its tooltip reads "Download project (ZIP) · X files (Y not shown in tabs)" (replaced the "+N files in ZIP" chip after visual review); native results come from captured screenshots/video in `output/`, with no Run button.
- **Go/no-go review** (2026-09-29, `docs/research/arcgis-multi-sdk-plan.md`): go with changes. Adopted: config-aware validation, one default per var name across files, region ids unique per variant, no `@var` in files not shown in tabs (ZIP fetches them), web variants detected by `index.html`, marker styles scoped by file type. A step uses the same region id in every variant (`only=` for single-variant steps). The ArcGIS preset lives in this monorepo as `packages/interactive-code-scroll-arcgis`, published unscoped as `interactive-code-scroll-arcgis`.
- **Result pane details** (plan-mode pass for task 2, 2026-09-29): "keeps the last result" means the nearest earlier step with a result for the active variant (deterministic for deep links and backward jumps); `output=` must resolve only for non-web variants, and is a build error where only web code would show it; the pane collapses like the Preview and follows `preview=` step states.
- **Phase 1 rules** (plan-mode pass 2026-09-29): with `variants`, all code lives in variant folders and `files:` moves into each variant; `otherVariantSteps: notice | hide` lets the author choose how `only=` steps look in other variants; the Result pane keeps the last result on steps without `output=`/`request=`; the error rule and help table live in `requests/errors.json`; `.http` support is a documented subset, with unsupported features as build errors; variant regressions are covered by a second fixture (`examples/framework-fixture-variants`).
- **Request runner** (plan-mode pass 2026-09-29, task 4b): live responses are dropped when the pane shows another result unless the reader keeps them (in memory only, never in localStorage: bodies may hold private data); no prompt on leaving a step (it would break scrolling and clicker keys); "Run as" labels are the method, or the request name when methods repeat.
- **Presentation fit** (plan-mode pass 2026-09-29, task 7): clicker keys (PageDown/PageUp) move steps from any focus except multi-line text, so a presenter never has to click away from a field or the Result pane first; arrows stay with the widgets that use them. At high zoom the Result header compacts to icons (one row) instead of wrapping, and a short pane scrolls as a whole instead of squeezing the body.
- **Tutorials in several languages** (2026-09-29): code variants inside one tutorial when the process and prose are shared (e.g. REST in cURL/Python/JS); sibling tutorials linked by `family` when explanations differ (e.g. JS SDK vs Python API). No `<Variant for>`-style conditional prose inside one MDX.
- **Result views** (2026-09-29): renderers are plugins; the author chooses per step which views appear (tabs next to Body/Headers) and labels them once in the frontmatter, instead of renderers picking themselves by matching the response. Views apply to captured output and live responses alike. Replaces the earlier `match(response)` auto-selection idea.
- **Series sites** (plan-mode pass 2026-09-30, task 2.1): one Astro build for every tutorial (not one build per tutorial), so dev serves the whole site and sibling tutorials (2.5) see each other; index customizable at three levels (default, `index.mdx` with `<TutorialList>` sections, custom Astro page); cards with a client-side tag filter; `--tutorials` plus auto-detection.
- **Scaffolder as a wizard** (plan-mode pass 2026-09-30, task 2.3): questions compose the project instead of picking one of a few fixed templates; kind and language are one grouped checkbox list (2026-09-30 UX review; kinds can be mixed, languages are runtimes); several entries offer both variants and sibling tutorials; generated tutorials are minimal working examples; `@clack/prompts` for the terminal UI (dependency of the create package only); every answer has a flag for tests, agents and repeatable setups.
- **Sibling tutorials** (2026-09-30, task 2.5; UX review the same day): a labeled menu of links in the page header, deliberately unlike the segmented variant switcher (navigation vs. in-place setting); navigation carries the step hash and the variant when the sibling has it; duplicate labels in a family are errors, one-tutorial families and `family` outside a series are warnings; index cards are not grouped.
- **ArcGIS boundary for multi-SDK work**: the core stays generic; ArcGIS content ships as scaffolder templates and an optional preset package (e.g. map renderer for results). Nothing ArcGIS-specific enters core packages.

---

## Open questions

- [x] Spike outcome: Astro + MDX + Shiki.
- [x] Concrete MDX component syntax — see Decisions.
- [ ] Not covered yet: advanced accessibility, framework versioning.
- [ ] Deferred: tutorials that need a build step (React + JSX, Vue SFC). Options: no build (React via `htm`/`createElement`, Vue from CDN); opt-in build at site-build time (`build: vite`, form vars in an unbundled config so live edits need no rebuild, ZIP is a Vite project); in-browser transpiling (rejected for now: several MB and a live CDN dependency). Until decided, such variants use captured output in the Result pane.
