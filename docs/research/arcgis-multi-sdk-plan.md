# Plan: tutorials for every ArcGIS SDK family

Status: proposal, agreed in a survey on 2026-09-29. Not yet reflected in `SPEC.md` (see [SPEC changes](#spec-changes-required)).

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
| REST request source | `.http` files in `code/` (VS Code REST Client / JetBrains HTTP Client format) |
| REST result rendering | Core: status, headers, collapsible JSON. Preset: draw results on a map |
| Driver | Upcoming conference: ship a REST (cURL / Python / JavaScript) vertical slice first |
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
| 0.4 `.http` variables | S | In `.http` files, a file-variable line `@name = value` is a var named `name` whose default is the rest of the line. This is native `.http` syntax, so the source stays runnable in VS Code/JetBrains. |
| 0.5 Visible subset + binaries | M | Frontmatter `files:` (ordered globs) selects tabs; other files are published under `preview/` and included in the ZIP but not rendered or serialized into the page. Binary files (by extension or NUL byte) are copied as bytes. Validation: a `<Step file>` must be visible. |
| 0.6 Dev revalidation | S | Existing TODO: re-validate MDX when `code/` or `images/` change. |

Exit: a Python script tutorial and a Kotlin project tutorial (with a jar in the Gradle wrapper) build, highlight correctly and download a runnable ZIP.

### Phase 1 — Conference slice: REST tutorial in cURL / Python / JavaScript

| Item | Size | Scope |
|---|---|---|
| 1.1 Code variants | L | Frontmatter `variants: [{ id, label, dir, entry }]` maps to `code/<dir>/`. Region ids are the cross-language contract: `<Step region="auth">` resolves the region in the active variant (file optional; `entry` is the default file). Validation: every step region exists in every variant, unless the step sets `only="python"`. Switcher (`calcite-segmented-control`) in the code header, remembered in `localStorage` and `?variant=` for deep links. Downloads and Preview use the active variant. Vars are shared across variants by name. |
| 1.2 Captured output | M | Optional `output/` folder. `<Step output="geocode.json">` shows a Result pane: JSON viewer for `.json`, terminal style for `.txt`/`.log`, image for images. Per-variant override via `output/<variant>/`. Works offline. |
| 1.3 `.http` runner | L | Parse requests (`###` separators, `# @name`, method, URL, headers, body), apply var values, `fetch` client-side, show status, time, headers and body. `<Step request="geocode">` binds a named request; Run button in the Result pane. On network/CORS failure, fall back to the step's captured output and say so. Secret vars are masked in the displayed URL. Hand-written parser, no new dependency. |
| 1.4 JSON viewer | M | Collapsible tree rendered with plain DOM + CSS (no client-side highlighter, matching the current architecture). Keyboard accessible; large arrays truncated with "show more". |
| 1.5 REST example | M | `examples/rest-geocode` (or similar): `.http`, cURL, Python and JS variants, demo key, captured outputs. Fixture cases + E2E with `page.route` mocking the endpoint (no network in tests). |
| 1.6 Presentation fit | S | Result pane survives step navigation; clicker keys work while focus is in the Result pane; readable at high zoom. User visual review before release. |

Exit: the REST tutorial is presentable at the conference, runs live with a real key, and degrades to captured output offline.

### Phase 2 — Series site

| Item | Size | Scope |
|---|---|---|
| 2.1 Multi-tutorial repos | L | Existing TODO. `tutorials/<name>/` → `/<name>/`, generated index page from frontmatter (`title`, `description`, `tags`, `level`, `duration` — generic metadata). CLI `--tutorials <dir>`. |
| 2.2 Shared credentials | S | Document that persisted vars are shared per site; add `persist="tutorial"` for opt-out namespacing. E2E across two tutorials. |
| 2.3 Scaffolder | M | Existing TODO `pnpm create interactive-code-scroll` with templates: `blank`, `web`, `rest`, `python`, `native`. ArcGIS starters live here as templates (e.g. `arcgis-js`, `arcgis-rest`, `arcgis-python`, `arcgis-kotlin`). |
| 2.4 Pages workflow | S | One workflow building the whole series site. |

### Phase 3 — Extension point + ArcGIS preset package

| Item | Size | Scope |
|---|---|---|
| 3.1 Result renderer API | M | Generic integration option `resultRenderers` (module paths): each exports `match(response)` and `render(element, data)`. Core renderers (JSON, text, image) use the same API. |
| 3.2 ArcGIS preset | L | Separate package (name TBD, e.g. `interactive-code-scroll-arcgis`): map renderer for Esri JSON / GeoJSON / geocode candidates / route and places results using the Maps SDK for JavaScript via CDN in a sandboxed iframe; API key field conventions; doc links. Opt-in only. |

### Phase 4 — Native and Python depth

| Item | Size | Scope |
|---|---|---|
| 4.1 Native templates | M | Kotlin, Swift, .NET, Qt, Flutter starters using the visible subset; video (`.mp4`/`.webm`) and GIF captured output for native results. |
| 4.2 Notebooks | L | `.ipynb` as a code file: render cells and saved outputs (sanitized HTML, text, PNG); regions from cell tags or markers inside cells; download as `.ipynb` with vars applied (JSON escaping). Percent-format `.py` (`# %%`) as the lightweight alternative. |

## SPEC changes required

These parts of `SPEC.md` conflict with or do not yet cover the plan; update them before implementing the related phase:

- **Tech constraints / "Tutorial code without a build step"**: says HTML/JS/CSS runnable as-is and the ZIP opens `index.html`. Generalize to "runnable with its own standard toolchain; browser Preview only for web variants".
- **Out of scope / "Multi-language support"**: clarify it means UI/human languages, not programming-language variants.
- **Code markup rules**: extend supported comment styles and escaping contexts (Phase 0).
- **Data model**: add Variant, Output, Request (and Result renderer in Phase 3).
- **Preview**: add the Result pane and REST runner alongside the browser Preview.

## Risks

| Risk | Mitigation |
|---|---|
| Page size grows with variants and large projects | Serialize only visible files per variant; lazy-load inactive variants' HTML if needed |
| CORS or rate limits on live REST calls | Captured-output fallback per step; document which endpoints support CORS |
| Keys leaking via downloads or projected URLs | Secret masking in runner UI; downloaded files contain what the reader typed (as today), documented |
| Shell/Python escaping edge cases | Reject unsupported literal forms at build time instead of guessing |
| Scope creep into ArcGIS specifics in core | All topic behavior behind templates or the preset package; review checklist item |

## Open questions

- Should a step be allowed to reference different region ids per variant, or is "same id in every variant" strict enough?
- Should the Result pane replace the browser Preview for non-web variants, or sit beside it?
- Preset package name and whether it lives in this monorepo.
