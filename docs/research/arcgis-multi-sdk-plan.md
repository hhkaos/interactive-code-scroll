# Plan: tutorials for every ArcGIS SDK family

Status: proposal, agreed in a survey on 2026-09-29. `SPEC.md` updated with the planned behavior (marked *planned*); pending a go/no-go review.

## Goal

Make InteractiveCodeScroll a good fit for tutorials beyond the Maps SDK for JavaScript: REST API / location services, ArcGIS API for Python, native Maps SDKs (Kotlin, Swift, .NET, Qt, Flutter) and other web libraries (Esri Leaflet, MapLibre, OpenLayers, CesiumJS).

The core stays generic (see `PROJECT.md`). Every capability below is described in topic-neutral terms; ArcGIS-specific behavior ships only as scaffolder templates and an optional preset package.

## Survey decisions

| Topic | Decision |
|---|---|
| SDK targets | REST, Python, native SDKs and other web libraries, all in scope |
| Result for non-browser code | Author-captured output (text, JSON, images) + a live REST runner |
| Same steps in several languages | Language switcher inside one tutorial |
| Delivery | Standalone static sites (GitHub Pages) |
| Large projects | Author-selected visible subset of files; the rest (including binaries) only in the ZIP |
| Notebooks | `.py` scripts first, `.ipynb` in a later phase |
| Variables | Language-aware escaping; one shared credential per site |
| ArcGIS boundary | Generic core + ArcGIS scaffolder templates + optional preset package |
| REST request source | `.http` files in `requests/` (VS Code REST Client / JetBrains HTTP Client format); runner source only, not a reader-visible variant |
| Full tutorials per language | Sibling tutorials linked by `family` (Phase 2); code variants stay for shared-prose tutorials; no conditional prose in one MDX |
| React/Vue with a build step | Deferred; captured output until decided (options in `SPEC.md` open questions) |
| Result pane vs Preview | Result pane replaces the Preview for non-web variants |
| Service errors | HTTP 200 bodies with an error object are failures, explained with code help + reference links |
| Large projects UI | Total-count badge on the ZIP action; tooltip "X files (Y not shown in tabs)" (replaced the "+N files in ZIP" chip after visual review) |
| Several ways to run one request | A step can bind several named requests (e.g. GET and POST); "Run as" picker only when there is more than one |
| REST result rendering | Core: status, headers, collapsible JSON. Preset: draw results on a map |
| Driver | No external deadline; REST (cURL / Python / JavaScript) is the first vertical slice; phases ordered by technical risk |
| Multi-tutorial site | Early phase |

## Review findings

Gaps in the current code that block non-JavaScript tutorials:

| # | Area | Finding | Where |
|---|---|---|---|
| F1 | Highlighting | Extension map covers js/ts/html/css/json/md/sh/yaml only; Python, Kotlin, Swift, C#, XAML, Java, C++, QML, Dart, `.http`, TOML, SQL render as plain text. Shiki already bundles those grammars (no new dependency). | `src/highlight.ts` |
| F2 | Region markers | C# native `#region` and the Python/VS Code `# region` idiom are not recognized; `--` comments (SQL, Lua) are not supported. | `src/markers.ts` |
| F3 | `@var` escaping | Two contexts only (`html`, `script` with JS rules). Wrong for shell single quotes, Python raw/triple-quoted strings, XML/XAML, and URL query values. `.http` values are unquoted, so `@var` cannot target them. | `src/markers.ts` |
| F4 | Files | Every file under `code/` is read as UTF-8, becomes a tab, and is serialized into the page. Native projects (Gradle wrapper jar, asset catalogs, dozens of files) break or bloat the page. | `src/tutorial-files.ts`, `src/pages/index.astro` |
| F5 | Result view | Only a browser Preview of `code/index.html`. Python, native and cURL tutorials have nothing to show except the image carousel. | `src/preview/` |
| F6 | One code variant | A tutorial has exactly one project; no way to show the same step as cURL, Python and JavaScript. | `src/components/Step.astro`, `src/validate.ts` |
| F7 | Single tutorial per site | Already in `TODO.md`; needed to publish a series across SDKs. | `src/index.ts` (`injectRoute("/")`) |
| F8 | Dev validation | Changes in `code/` do not re-run MDX validation (already in `TODO.md`); more file types make this more visible. | `src/mdx-validation.ts` |

Existing strength worth keeping: persisted vars use the key `ics:var:<name>` per origin, so a credential is already shared by every tutorial on the same site. Phase 2 only has to make that explicit and documented.

## Phases

Sizes: S ≈ 1–2 days, M ≈ 3–5 days, L ≈ 1–2 weeks. Each item ships with focused Vitest and/or Playwright coverage and a `examples/framework-fixture` case when observable in a tutorial.

### Phase 0 — Language-agnostic code model (foundation)

| Item | Size | Scope |
|---|---|---|
| 0.1 Language map | S | Add `py`, `kt`, `kts`, `gradle`, `swift`, `cs`, `xaml`, `java`, `cpp`, `h`, `hpp`, `qml`, `dart`, `xml`, `toml`, `ini`, `sql`, `http`, `jsx`, `tsx`, `vue`, `geojson`, `ps1`. Optional frontmatter `languages: { ext: shikiLang }` override. |
| 0.2 Marker syntax | S | Accept C# `#region id` / `#endregion`, `# region id` / `# endregion`, and `-- #region id`. Unit tests per comment style. |
| 0.3 Escaping by file type | M | Replace `context: html \| script` with an escaper chosen by extension + quote: JS/TS/JSON/Kotlin/Swift/C#/Java/Dart (backslash), Python (reject raw and triple-quoted literals with a clear error), shell (single vs double quotes), XML/XAML/HTML (entities). Table-driven unit tests. |
| 0.4 `.http` variables | S | In `.http` files (under `requests/`), a file-variable line `@name = value` is a var named `name` whose default is the rest of the line. This is native `.http` syntax, so the source stays runnable in VS Code/JetBrains. |
| 0.5 Visible subset + binaries | M | Frontmatter `files:` (ordered globs) selects tabs; other files are published under `preview/` and included in the ZIP but not rendered or serialized into the page. Binary files (by extension or NUL byte) are copied as bytes. Validation: a `<Step file>` must be visible. |
| 0.6 Dev revalidation | S | Existing TODO: re-validate MDX when `code/` or `images/` change. |

Exit: a Python script tutorial and a Kotlin project tutorial (with a jar in the Gradle wrapper) build, highlight correctly and download a runnable ZIP.

### Phase 1 — REST vertical slice: cURL / Python / JavaScript

| Item | Size | Scope |
|---|---|---|
| 1.1 Code variants | L | Frontmatter `variants: [{ id, label, dir, entry }]` maps to `code/<dir>/`. Region ids are the cross-language contract: `<Step region="auth">` resolves the region in the active variant (file optional; `entry` is the default file). Validation: every step region exists in every variant, unless the step sets `only="python"`. Switcher (`calcite-segmented-control`) in the code header, remembered in `localStorage` and `?variant=` for deep links. Downloads and Preview use the active variant. Vars are shared across variants by name. |
| 1.2 Captured output | M | Optional `output/` folder. `<Step output="geocode.json">` shows a Result pane: JSON viewer for `.json`, terminal style for `.txt`/`.log`, image for images. Per-variant override via `output/<variant>/`. Works offline. |
| 1.3 `.http` runner | L | Parse requests (`###` separators, `# @name`, method, URL, headers, body), apply var values, `fetch` client-side, show status, time, headers and body. `.http` files live in `requests/` (included in the ZIP, never a tab or variant). `<Step request="geocode-get geocode-post">` binds one or more named requests; the first is the default and a "Run as" picker appears when there are several; inputs bind via file variables, so alternatives may use different parameter names, headers or body fields for the same value; Run button in the Result pane. On network/CORS failure, fall back to the step's captured output and say so. Secret vars are masked in the displayed URL, with a "Show secrets" debugging toggle. Declarative error rule (JSON paths for error object, code, message) marks HTTP 200 bodies holding an error as failures; an error help table (code → text + link, fallback link) explains them. The pane replaces the browser Preview for non-web variants. Hand-written parser, no new dependency. |
| 1.4 JSON viewer | M | Collapsible tree rendered with plain DOM + CSS (no client-side highlighter, matching the current architecture). Keyboard accessible; large arrays truncated with "show more". |
| 1.5 REST example | M | `examples/rest-geocode` (or similar): `requests/geocode.http` (GET and POST), cURL, Python and JS variants, demo key, captured outputs. Fixture cases + E2E with `page.route` mocking the endpoint (no network in tests). |
| 1.6 Presentation fit | S | Result pane survives step navigation; clicker keys work while focus is in the Result pane; readable at high zoom. User visual review before release. |

Exit: the REST tutorial runs live with a real key, degrades to captured output offline, and is presentable in presentation mode.

### Phase 2 — Series site

| Item | Size | Scope |
|---|---|---|
| 2.1 Multi-tutorial repos | L | Existing TODO. `tutorials/<name>/` → `/<name>/`, generated index page from frontmatter (`title`, `description`, `tags`, `level`, `duration` — generic metadata). CLI `--tutorials <dir>`. |
| 2.2 Shared credentials | S | Document that persisted vars are shared per site; add `persist="tutorial"` for opt-out namespacing. E2E across two tutorials. |
| 2.3 Scaffolder | M | Existing TODO `pnpm create interactive-code-scroll` with templates: `blank`, `web`, `rest`, `python`, `native`. ArcGIS starters live here as templates (e.g. `arcgis-js`, `arcgis-rest`, `arcgis-python`, `arcgis-kotlin`). |
| 2.4 Pages workflow | S | One workflow building the whole series site. |
| 2.5 Sibling tutorials | M | Frontmatter `family` + `familyLabel`; header switcher lists the family's tutorials on the site and navigates to the same step id when it exists. For tutorials whose prose differs by language (JS SDK vs Python API). Depends on 2.1. |

### Phase 3 — Extension point + ArcGIS preset package

| Item | Size | Scope |
|---|---|---|
| 3.1 Result views + renderer plugins | M/L | Integration option `renderers: { id: modulePath }`; each module default-exports `{ accepts?(data), render(element, data, context) }` (optional cleanup). Frontmatter `views: { id: { renderer, label } }`; `<Step views="map table" view="map">` adds author-labeled tabs next to Body/Headers, for captured output and live responses alike. Explicit choice (no auto-matching); `accepts()` only disables a tab that does not fit. Lazy import per tab; data, never HTML; third-party code in a sandboxed iframe. Build errors for undeclared views, unregistered renderers, missing labels, `view=` not in `views=`, `views=` without a result. Ships with the public plugin guide `docs/plugins.md` (create, install, register, use in MDX, test), `docs/authoring.md` reference, a local example renderer in `examples/multi-sdk-playground` and a fixture renderer covered by E2E. See `SPEC.md` Result pane and Public documentation. |
| 3.2 ArcGIS preset | L | Separate package (`interactive-code-scroll-arcgis`), a set of 3.1 renderer plugins: map renderers for Esri JSON / GeoJSON / geocode candidates / route and places results (e.g. `geocode-map`, later `route-map`, `features-table`) using the Maps SDK for JavaScript via CDN in a sandboxed iframe; API key field conventions; ArcGIS error rule (`error.code` / `error.message` in HTTP 200 bodies) plus a curated help table of common codes (e.g. 498 invalid token, 499 token required, 400, 403) linking to the platform error codes reference and endpoint docs; doc links. Opt-in only. Phase 1's REST example configures the same rule and a small table locally until the preset exists. |

### Phase 4 — Native and Python depth

| Item | Size | Scope |
|---|---|---|
| 4.1 Native templates | M | Kotlin, Swift, .NET, Qt, Flutter starters using the visible subset; video (`.mp4`/`.webm`) and GIF captured output for native results. |
| 4.2 Notebooks | L | `.ipynb` as a code file: render cells and saved outputs (sanitized HTML, text, PNG); regions from cell tags or markers inside cells; download as `.ipynb` with vars applied (JSON escaping). Percent-format `.py` (`# %%`) as the lightweight alternative. |

## SPEC changes required

Applied to `SPEC.md` on 2026-09-29 (planned items are marked *planned*):

- **Tech constraints / "Tutorial code without a build step"**: says HTML/JS/CSS runnable as-is and the ZIP opens `index.html`. Generalize to "runnable with its own standard toolchain; browser Preview only for web variants".
- **Out of scope / "Multi-language support"**: clarify it means UI/human languages, not programming-language variants.
- **Code markup rules**: extend supported comment styles and escaping contexts (Phase 0).
- **Data model**: add Variant, Output, Request, Error rule (and Renderer + View in Phase 3).
- **Preview**: add the Result pane and REST runner; the Result pane replaces the browser Preview for non-web variants.

## Risks

| Risk | Mitigation |
|---|---|
| Page size grows with variants and large projects | Serialize only visible files per variant; lazy-load inactive variants' HTML if needed |
| CORS or rate limits on live REST calls | Captured-output fallback per step; document which endpoints support CORS |
| Keys leaking via downloads or projected URLs | Secret masking in runner UI; downloaded files contain what the reader typed (as today), documented |
| Shell/Python escaping edge cases | Reject unsupported literal forms at build time instead of guessing |
| Scope creep into ArcGIS specifics in core | All topic behavior behind templates or the preset package; review checklist item |

## Open questions

- [x] Should a step be allowed to reference different region ids per variant? No: same id in every variant, `only=` for single-variant steps (go/no-go review).
- [x] Preset package name and location: `packages/interactive-code-scroll-arcgis` in this monorepo (go/no-go review).

## Go/no-go review (2026-09-29)

**Verdict: GO WITH CHANGES.** The direction fits the goal and keeps the core generic, and existing tutorials are unaffected (no `@var` in shell files, no bare `#region` lines in the examples). Six design gaps below must be settled in `SPEC.md` before Phase 0 code, because they change data shapes that Phase 1 builds on. Update: no external deadline, so Phase 1 keeps its full scope in the order below. Blocking fixes applied to `SPEC.md` on 2026-09-29.

### Blocking

| # | Issue | Evidence | Fix |
|---|---|---|---|
| B1 | Validation cannot see frontmatter, so it cannot enforce `files:`, `variants:`, `only=` or `request=` rules with MDX positions. Frontmatter is only checked at page render. | `src/mdx-validation.ts:45-50`, `src/pages/index.astro:13-15` | Parse the frontmatter in the mdast plugin (yaml node) and pass the config to `validateTutorial`; move frontmatter errors there. Prerequisite for 0.5 and 1.1. |
| B2 | A var name used in several files takes its default from the first match; other defaults are silently ignored. Variants make this the normal case (the same `accessToken` in `.sh`, `.py`, `.js`, `.http`). | `src/components/VarField.astro:14-16`, `SPEC.md` ("var names are unique per file") | Rule: every occurrence of a var name has the same default literal, or the build fails naming each file. |
| B3 | Region-first addressing needs region ids unique **per variant**, not per file; today two files may share an id. | `src/validate.ts:62-70`, `SPEC.md` code markup rules | Within a variant, region ids are unique across files; validation error otherwise. |
| B4 | Hidden files cannot both stay out of the page and be in the ZIP with form values applied: the ZIP is built client-side from serialized sources. Binaries are read as UTF-8 and published through `parseSource`. | `src/pages/index.astro:24`, `src/downloads.ts:9-11`, `src/preview/code-file.ts:14-20`, `src/tutorial-files.ts:32` | Hidden files may not contain `@var` (build error); on ZIP, fetch hidden and binary files from their published `preview/` URLs. Publish binaries byte for byte; extend `content-type.ts`. |
| B5 | Preview assumes one `code/index.html` at the root and one preview page. With variants, only some variants are web code. | `src/preview/build-html.ts` (`PREVIEW_ENTRY`), `src/client/preview.ts` (storage key per target), `src/pages/index.astro:13-15` | A variant is web code when its folder has `index.html`; publish `preview/<variant>/`; the frontmatter `preview` check applies per web variant. |
| B6 | Marker and escaping changes need scoping by file type, or they change meaning in existing files: bare `#region x` is an ordinary shell/YAML comment today; `f"…{…}"` needs brace escaping; `.http` values have no quotes (`VarRef.quote` is `'"' \| "'"`). | `src/markers.ts:14-16`, `src/markers.ts:39-42` | C# `#region` only in `.cs`; `# region` only in `.py`; `--` only in `.sql`/`.lua`. Reject `@var` on f-strings, raw and triple-quoted literals. Add an unquoted `.http` var kind with its own escaper. |

### Non-blocking

- Steps store one `data-file`; with variants, emit a per-variant file map at build (`data-files`) and key code panes by `<variant>/<path>` (`src/client/steps.ts:58`, `:150`).
- The JSON viewer and captured outputs must render response data as text nodes only (never `innerHTML`); responses are untrusted.
- `.http` runner: define URL-encoding of substituted query values (REST Client does not encode); document it.
- E2E: `e2e/fixtures.ts:16` blocks only the Esri CDN; also block every host a runner example calls and mock with `page.route`.
- Captured outputs are committed files: warn at build when an output contains the current value of a secret var's default pattern (e.g. `token=`), to avoid publishing real tokens.
- Extension-scoped marker rules should appear in `docs/authoring.md`; `docs/upgrade.md` needs a note on the new "same default everywhere" rule (B2), which can break a tutorial that relied on different defaults.

### Revised Phase 0 / Phase 1 order

Phase 0:

1. Config-aware validation (B1) — M
2. Language map + extension-scoped markers (0.1, 0.2, B6) — S
3. Var model: consistent defaults (B2), escaper by file type, unquoted `.http` vars, rejected literal forms (0.3, 0.4, B6) — M
4. Visible files + binaries + lazy ZIP fetch (0.5, B4) — M
5. Dev revalidation, watching `code/`, `images/`, and later `requests/`, `output/` (0.6) — S

Phase 1:

1. Variants: config, per-variant region uniqueness (B3), per-variant file map, switcher, `?variant=`, per-variant ZIP and preview (1.1, B5) — L
2. Result pane shell replacing Preview for non-web variants + captured output (1.2) — M
3. JSON viewer, text-only rendering (1.4) — M
4. `.http` parser + runner: named requests, several per step with "Run as", masking + "Show secrets", network fallback, declarative error rule showing code + message (1.3) — L
5. Error help table with reference links (moves to the ArcGIS preset in Phase 3; the example configures it locally until then) + Headers tab — M
6. REST example + framework-fixture cases + mocked E2E (1.5) — M

### Phase 1 plan-mode pass (2026-09-29)

Rules settled in `SPEC.md` before implementing: variants schema (all code in variant folders, per-variant `files`), `otherVariantSteps: notice | hide` chosen by the author, variant choice precedence (`?variant=` > `ics:variant` > first), per-variant ZIP with `requests/`, Result pane keeps the last result, captured output types and lookup, supported `.http` subset, 30 s runner timeout, Body/Headers tabs, error rule in `requests/errors.json`, JSON viewer truncation and keyboard. Variant regressions get a second fixture, `examples/framework-fixture-variants`, on its own Playwright web server.

Implementation order (one commit each): 1a variants config + validation; 1b page render, switcher, `?variant=`, `only=` behavior; 1c per-variant downloads and Preview; 2 Result pane + captured output; 3 JSON viewer; 4a `.http` parser + validation; 4b runner UI; 5 error rule + Headers tab; 6 REST example; 7 presentation fit + docs.

### Recommendations on open questions

- Variants and region ids: keep "same id in every variant" with `only=`; per-variant id maps add authoring surface for little gain.
- Preset package: `packages/interactive-code-scroll-arcgis` in this monorepo, published unscoped as `interactive-code-scroll-arcgis` (no npm org needed; shares CI and release flow).

## Phase 1 go/no-go review (2026-09-30)

**Verdict: GO for Phase 2.** Phase 1 met its exit criterion: the author's manual test of `examples/rest-geocode` passed (live run with a real key, captured-output fallback offline, presentation mode). No blocking issue found.

### Exit evidence

| Check | Result |
|---|---|
| Plan items 1.1–1.6 | Done, one commit each (`4db2a9c` … `d9a9060`); Phase 1 plan-mode order followed |
| Manual test (author) | OK: live key, offline fallback, presentation mode |
| Unit tests | 361/361 green (Vitest, 2026-09-30) |
| E2E | 113/113 green after the maximized panes work; `e2e/step-engine.spec.ts:73` seen flaky once under parallel load |
| Page size | `examples/rest-geocode/dist/index.html` is 58 KB with 3 variants: the page-size risk did not materialize |
| Phase 0 non-blocking items | Text-only rendering of results, query-only URL encoding (documented), E2E blocks every non-local host, credential scan of captured outputs, B2 note in `docs/upgrade.md`: all done |

### Carried into Phase 2

- `SPEC.md` still marked dev revalidation of `code/`/`images/`/`requests/`/`output/` as planned; it shipped in Phase 0 (`fa5e9ac`). Marker removed.
- Watch `e2e/step-engine.spec.ts:73` for flakiness; fix if it recurs in the Pages workflow (2.4), which will run E2E on every push.
- The real OAuth Preview E2E stays disabled (existing TODO).
- Build-step variants (React/Vue) stay deferred (`SPEC.md` open questions).
- Phase 2 order: 2.1 multi-tutorial repos first (2.2, 2.4 and 2.5 depend on it), then 2.2 → 2.5 → 2.4 → 2.3. The scaffolder goes last so its templates can include the series layout.

### Phase 2 task 2.1 plan-mode pass (2026-09-30)

Rules settled in `SPEC.md` (Authoring and DX, series layout): one Astro build for the whole series; slug = folder name; generic metadata frontmatter (`description`, `tags`, `level`, `duration`, `order`); index customizable at three levels (default list, `tutorials/index.mdx` with `<TutorialList tags= level=>` sections, custom Astro page via the `index` option and the public `interactive-code-scroll/series` module); cards with a client-side tag filter; `--tutorials` plus auto-detection; Preview storage namespaced per tutorial, vars/theme/splits/variant choice site-wide. Regressions get `examples/framework-fixture-series` on its own Playwright server.

Implementation order (one commit each): SPEC; series model + routes + per-tutorial context and storage keys; index page + `TutorialList` + tag filter + `index.mdx`; custom index page + `interactive-code-scroll/series`; CLI `--tutorials` + auto-detection.
