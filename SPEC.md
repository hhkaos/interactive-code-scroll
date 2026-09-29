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
- **Resizable splitters** between docs and code, and between code and Preview; sizes are remembered. A handle on the docs/code splitter hides/shows the explanations.
- **Logo** (optional, `logo` frontmatter, a file in `images/`): shown in the header and used as favicon. Square SVG, or PNG of at least 512×512.
- **Light + Dark** with a manual toggle (remembered). The author sets the tutorial's default with the `theme` frontmatter (`auto` = `prefers-color-scheme`, the default; `light`; `dark`). The code panel and the Preview iframe follow the page mode (the iframe's `prefers-color-scheme` follows it, so apps using `calcite-mode-auto` match).
- **Look and feel**: Esri corporate (Calcite Design System). Calcite components are styled only through their tokens, props and slots.
- **Readable at high zoom**: code and text must stay readable when the browser font size is increased (CMD+"+" or similar).

### Code model
- **Final code + highlighting** (like Stripe): each file exists in its final version; steps only highlight regions. No incremental code per step.
- **Line numbers**: the rendered code panel shows stable line numbers in a left gutter.
- **Long lines**: tutorials may enable `codeWrap: true` in frontmatter to wrap long code lines instead of showing horizontal scrolling. It defaults to `false` so code shape is preserved unless the author opts in.
- **Languages**: syntax highlighting chosen by file extension for common languages (JS/TS, HTML, CSS, JSON, Markdown, shell, YAML, Python, Kotlin, Swift, C#, XAML, Java, C++, QML, Dart, XML, TOML, SQL, `.http`, …), with an optional `languages` frontmatter override (`{ extension: shikiLanguage }`).
- **Visible files** *(planned, Phase 0)*: optional frontmatter `files:` (ordered globs relative to `code/`) selects which files get tabs. Other files are not rendered or embedded in the page, but are still published under `preview/` and included in the ZIP. Binary files are copied byte for byte and never rendered. Files without a tab may not contain `@var` markers (build error): the page does not embed them, so the ZIP fetches them, and binary files, from their published `preview/` copies when the reader downloads it.
- **Code variants / language switcher** *(planned, Phase 1)*: a tutorial can show the same steps in several languages (e.g. cURL, Python, JavaScript). Frontmatter `variants: [{ id, label, dir, entry }]` maps each variant to `code/<dir>/`. Region ids are the contract across variants: `<Step region="auth">` resolves the region in the active variant (`file` optional; defaults to the variant's `entry`). Every step region must exist in every variant unless the step sets `only="<variant id>"`. Within a variant, region ids are unique across all its files (not only per file), so a region id identifies one file; each step carries a per-variant file map computed at build time. A variant is web code when its folder contains `index.html`: it gets the browser Preview, published under `preview/<variant>/`; other variants get the Result pane. The reader picks the variant in the code header; the choice is remembered and deep-linkable (`?variant=`). Downloads and Preview use the active variant; vars are shared across variants by name. The switcher is a segmented control at the start of the code header, before the file tabs. `.http` request files are not variants (see Result pane).

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
- **Keyboard / clicker**: arrows and PageDown/PageUp jump to the next/previous step with snapping (compatible with presentation clickers).
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
- **Per-step Preview state**: a step can set `preview="expanded"` or `preview="collapsed"` to open or collapse the iframe when that step becomes active; omitted or `preview="keep"` preserves the viewer's current state.
- **New tab mode**: opens the preview page in a new tab; OAuth can use a regular redirect.
- **Refresh**: automatic after form changes (~500 ms debounce) + manual Run/Reload button.
- **OAuth in iframe mode**: sign-in opens in a **popup** (ArcGIS Maps SDK `OAuthInfo` with `popup: true`) and returns via the tutorial's own `code/oauth-callback.html` (it is part of the tutorial: shown, explained, downloaded). Every `code/` file is published next to the preview page (`preview/<path>`, markers stripped), so relative references resolve there.

### Result pane *(planned, Phase 1)*
For code that cannot run in the browser Preview (scripts, native apps, HTTP requests). It takes the Preview's place under the code (same splitter and header bar): a variant with web code shows the browser Preview, any other variant shows the Result pane instead.
- **Captured output**: optional `output/` folder (per-variant override in `output/<variant>/`). `<Step output="result.json">` shows it in a Result pane: collapsible JSON viewer for `.json`, terminal style for `.txt`/`.log`, image for images. Works offline.
- **HTTP request runner**: requests live in `.http` files under an optional `requests/` folder (VS Code REST Client / JetBrains HTTP Client syntax). They are the runner's source only: not a code variant and not a code tab, but included in the ZIP. `<Step request="name">` binds a named request (`# @name`). A step may list several names for the same operation (e.g. `request="geocode-get geocode-post"` for an HTTP GET and an HTTP POST): the first is the default, and a "Run as" picker in the Result pane appears only when there is more than one. Requests bind inputs through `.http` file variables (`{{name}}`), not through parameter names, so alternative requests may carry the same input under different parameter names, headers or body fields (e.g. `?token=` on GET, an `X-Esri-Authorization` header on POST) while one form field feeds them all. A Run button sends it with `fetch` from the browser, with current var values applied, and shows status, time, headers and body. Substituted values are URL-encoded in the request line's query string and inserted as-is in headers and body. On a network/CORS failure it falls back to the step's captured output and says so. Secret vars are masked in the displayed request; a "Show secrets" toggle reveals them for debugging. Response data and captured output are rendered as text only (never as HTML): they are untrusted. The build warns when a captured output looks like it contains a credential (e.g. a `token=` value that is not the var's default).
- **Service errors in successful responses**: some APIs (e.g. ArcGIS REST) answer HTTP 200 with an error object in the body. The runner treats a response as failed when it matches a declarative error rule (JSON path of the error object, its code and its message), shows the code and message prominently, and explains the code from an error help table (short text + reference link per code, with a fallback link for unknown codes). Core ships the mechanism only; rules and help tables come from the tutorial or a preset package (the ArcGIS preset provides the ArcGIS rule and a curated table of common codes).
- **Result renderers** *(planned, Phase 3)*: the Result pane renders through a generic renderer API (`match(response)`, `render(element, data)`); core ships JSON, text and image renderers. Topic-specific renderers (e.g. drawing results on a map) live in optional preset packages.

### Forms → variables
- Forms defined in MDX (left panel); filling them updates code variables in real time.
- **Default value**: the literal in the code is the single source of truth (default and field placeholder).
- **Custom placeholder**: `<VarField placeholder="...">` can override the input placeholder without changing the code default used for clearing, downloads or Preview.
- **localStorage persistence**: configurable per field by the author (persist or not). Persisted values are shared by every tutorial on the same site (key `ics:var:<name>`), so a credential is entered once per site; *(planned, Phase 2)* `persist="tutorial"` scopes a value to one tutorial.
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

### Authoring and DX
- **Dev mode** with file watching and live updates.
- **Strict validation**: if the MDX references a region, file, variable or image that does not exist, the build fails with a clear error (file, line, ID). In dev mode it is shown as a browser overlay without crashing the server. Validation also reads the frontmatter: invalid fields report the key's MDX line, and later frontmatter-dependent rules (`files:`, `variants:`, `only=`, `request=`, `output=`) use the same path. *Planned (Phase 0)*: it re-runs when files under `code/`, `images/`, `requests/` or `output/` change.
- **Serve locally**: the CLI can serve the built site on localhost (fallback if conference wifi fails; Preview/OAuth still need network — plan B: images/carousel of the result).
- **Generic CLI**: CLI commands must work for any InteractiveCodeScroll tutorial. Topic-specific helpers, such as OAuth redirect URI printing, must be opt-in or derived from explicit tutorial/project configuration, never hard-coded into the framework.
- Supports **both layouts**: one tutorial per repo, or several tutorials in one repo (`/tutorials/<name>/`) with an index page.

### Public documentation
- **README for repository visitors**: explains what InteractiveCodeScroll is, who it is for, how to start, and where to find the tutorial, reference and examples.
- **Getting started tutorial**: teaches authors how to build their first tutorial with InteractiveCodeScroll. It should be built with InteractiveCodeScroll itself ("eat your own dog food") and live outside the stable E2E fixture.
- **Authoring / API reference**: documents the tutorial folder layout, frontmatter options, MDX components, code markers, Preview behavior, downloads, validation rules, limitations and gotchas.
- **CLI reference**: once the CLI exists, documents `dev`, `build`, `serve`, generated redirect URIs and scaffolding commands.
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
| Step / Text block | id (deep link), MDX content, associated action | Fires its action when it comes into focus (scroll or keyboard) |
| Code file | path (`server.js`, `checkout.html`…) | Final version; downloadable individually or as ZIP |
| Code region | id | Marked with `#region <id>` / `#endregion`; referenced from MDX |
| Action | type: highlight / switch file / show image(s) | Links a Step to a Region, File or Image |
| Form | fields | Defined in MDX |
| Field ↔ Variable | variable name, persist (bool), secret (bool) | Variable marked with `// @var <name>`; default = code literal |
| Image / Carousel | image files | In tutorial folders; shown instead of code; manual navigation |
| Variant *(planned)* | id, label, dir, entry | A programming-language version of the tutorial's code under `code/<dir>/`; shares region ids and vars with the other variants |
| Output *(planned)* | file in `output/` (optional per-variant override) | Captured result shown in the Result pane |
| Request *(planned)* | name, `.http` file in `requests/` | Named HTTP request the runner can send; its file variables are vars. A step can bind several requests as alternative ways to run the same operation (e.g. GET and POST) |

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
  - `@var` targets the first string literal on its line; one `@var` per line; var names are unique per file. A var name used in several files (or variants) must have the same default literal everywhere; otherwise the build fails naming each file. Runtime values replace the literal in place in the pre-highlighted code, escaped for its context (script string or HTML attribute). *Planned (Phase 0)*: the escaper is chosen by file type and quote style (JS-like languages, Python, shell single/double quotes, XML/XAML/HTML); literal forms that cannot be escaped safely (Python f-strings, raw and triple-quoted strings) are build errors. In `.http` files, a file-variable line `@name = value` is an unquoted var named `name` whose default is the rest of the line.
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
  logo: logo.svg       # optional, from images/: header logo and favicon
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
- **Language switcher and requests** (mockup review 2026-09-29): switcher at the start of the code header; `.http` files are only the runner's source (in `requests/`), not a reader-visible variant; a request can offer several ways to run it (e.g. GET and POST) through a "Run as" picker shown only when needed; variant choice is remembered per site and deep-linkable; switching variants keeps the same region focused.
- **Result pane** (mockup review 2026-09-29): replaces the browser Preview for non-web variants; captured output first, Run for live; secrets masked with a debugging reveal toggle; network failures fall back to captured output; error objects inside HTTP 200 responses count as failures and are explained (code, message, help link).
- **Visible files** (mockup review 2026-09-29): only files listed in `files:` get tabs; a "+N files in ZIP" chip is enough to signal the rest; native results come from captured screenshots/video in `output/`, with no Run button.
- **Go/no-go review** (2026-09-29, `docs/research/arcgis-multi-sdk-plan.md`): go with changes. Adopted: config-aware validation, one default per var name across files, region ids unique per variant, no `@var` in files without a tab (ZIP fetches them), web variants detected by `index.html`, marker styles scoped by file type. A step uses the same region id in every variant (`only=` for single-variant steps). The ArcGIS preset lives in this monorepo as `packages/interactive-code-scroll-arcgis`, published unscoped as `interactive-code-scroll-arcgis`.
- **ArcGIS boundary for multi-SDK work**: the core stays generic; ArcGIS content ships as scaffolder templates and an optional preset package (e.g. map renderer for results). Nothing ArcGIS-specific enters core packages.

---

## Open questions

- [x] Spike outcome: Astro + MDX + Shiki.
- [x] Concrete MDX component syntax — see Decisions.
- [ ] Not covered yet: advanced accessibility, framework versioning.
