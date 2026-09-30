# InteractiveCodeScroll

> A framework for technical writers, devrels and speakers to build guided, interactive code tutorials (in the style of the Stripe Checkout quickstart) by writing MDX and annotating source code.

This file is the shared AI context for this project. It is read by all AI coding agents.
Agent-specific behaviour rules live in each agent's own file (CLAUDE.md, AGENTS.md).

> Requirements source of truth: `SPEC.md`. This file covers **how to work** in the project — not what to build.

---

## What this project is

A framework that turns a tutorial folder (MDX + code + images) into an interactive static website: documentation on the left, code on the right, synchronized by scroll/keyboard (region highlighting, file switching, images), with forms that update code variables, an optional Preview (iframe and/or new tab), downloads and a presentation mode. Built for projecting at conferences and for reproducing at home. Desktop-first. Published on GitHub Pages.

InteractiveCodeScroll is generic. OAuth, ArcGIS and maps are example/tutorial concerns only; do not add topic-specific assumptions to the core package, runtime, validation, CLI or public documentation. Topic-specific helpers must be explicit opt-ins or example-level configuration.

Status: in development. Base: Astro + MDX + Shiki; spike findings in `docs/research/technical-base-spike.md`.

---

## Commands

Package manager: **pnpm**. From the repo root:

```sh
pnpm install
pnpm dev          # framework fixture through the generic CLI
pnpm build        # build the framework fixture through the generic CLI
pnpm playground   # multi-SDK playground (examples/multi-sdk-playground) in dev mode
pnpm rest         # REST example tutorial (examples/rest-geocode) in dev mode
pnpm variants     # code variants fixture (examples/framework-fixture-variants) in dev mode
pnpm variants:hide # same with `otherVariantSteps: hide`
pnpm check        # tsc (core package) + astro check (example)
pnpm preflight:docs    # whitespace/conflict check for docs/context-only changes
pnpm preflight:ui      # focused preflight for CSS/UI-only changes
pnpm preflight:package # unit + check + package smoke test for CLI/build/package changes
pnpm preflight:release # same as package preflight before tagging/publishing
pnpm test         # Vitest unit tests
pnpm test:pack    # pack the package, install it in a temporary project, and build that project
pnpm test:e2e     # Playwright: builds and serves the fixtures (:4400 main, :4401 variants, :4402 variants with hidden steps)
```

For non-interactive agent/CI runs, prefix preflight commands with `CI=true` so pnpm never prompts while checking dependency state.


---

## Next Session Plan

Multi-SDK plan: `docs/research/arcgis-multi-sdk-plan.md` (phases, decisions, go/no-go review); requirements marked *planned* in `SPEC.md`; ordered tasks in `TODO.md`. Phase 0 is done (config-aware validation, languages + scoped markers, var escaping + shared defaults, `files:` + binaries + ZIP count badge, dev revalidation of `code/`/`images/`/`requests/`/`output/` with overlay `loc`).

Phase 1 rules are in `SPEC.md`; task order in `TODO.md` (1a → 7). Done: 1a variants validation, 1b switcher + `only=` (`notice`/`hide`), 1c Preview and ZIP per variant (`da9f036`), 2 Result pane + captured output, 3 JSON viewer, 4a `.http` parser + validation + `requests/` in every ZIP, 4b runner UI, 5 error rule + Body/Headers tabs, 6 REST example (`examples/rest-geocode`), 7 presentation fit. Phase 1 is complete. Variants code: `src/variants.ts` (build helpers), `src/client/variants.ts` + `variant-values.ts` (switcher, choice, fit rule), variant handling in `src/client/steps.ts`, `preview.ts`, `downloads.ts`, `src/preview/code-file.ts` (per-variant preview page).

Result pane code: `src/output.ts` (types, `output/<variant>/` lookup, credential scan), `src/result/output-file.ts` (publishes `output/`), `stepOutputs()` in `src/variants.ts`, `src/client/result.ts` + `result-values.ts` (pane, last-result rule), `STEP_EVENT` from `src/client/steps.ts`. JSON viewer: `src/client/json-tree.ts` (DOM, keyboard) + `json-tree-values.ts` (parse, depth rule, paging, key map); reuse `renderJsonTree()` for the runner's Body tab.

Requests code: `src/requests.ts` (`parseHttpFile()` → `HttpFile` with file variables and `HttpRequest`s, placeholders unresolved; `requestIndex()` for names), `requests`/`requestBinaries` in `src/tutorial-files.ts`, `checkRequest()` in `src/validate.ts`, `requests` in the virtual module and `clientData.requests` (parsed sources, used by the ZIP). Runner: `runnerRequests()` in `src/requests.ts` → `clientData.runner` (name → parsed request + file variables), `src/client/runner-values.ts` (substitution, query-only encoding, masked request line, Run as labels, messages), runner state in `src/client/result.ts` (`lastResult()` in `result-values.ts` picks the result step for outputs and requests), `data-requests`/`data-request-variants` from `Step.astro` (`resultVariants()` in `src/variants.ts`). Fixture: `request="list-items list-items-post"` and a Node-only `create` step with a request and no output; E2E mocks `api.fixture.test` with `page.route` (CORS headers + OPTIONS).

Error rule: `src/error-rule.ts` (`readErrorRule()` validates `requests/errors.json`, `matchError()` runs on any JSON response), `clientData.errorRule`; `LiveResponse` in `src/client/result.ts` holds headers, image object URL and the matched error; `#result-error` notice + `#result-tabs` (Body/Headers). File-tab code in `steps.ts` targets `calcite-tab-title[data-file]` only.

Maximized panes: `src/client/maximize.ts` (state on `body[data-maximized]`, CSS pins the pane with `position: fixed`, no DOM moves) + `maximize-values.ts`; steps dispatch `MAXIMIZE_EVENT` after the Preview state.

Step keys: `movesStep()` in `src/client/navigation.ts` (PageDown/PageUp from any focus but multi-line text; `data-own-keys` now means "owns arrow keys": JSON tree, splitters, `#result-tabs`, `#result-run-as`). Result header compact mode: `headerLevel()` in `result-values.ts` + ResizeObserver in `result.ts` (`setTooltip()` in `actions.ts`); short/narrow pane rules are `@container result-frame` queries in `tutorial.css`.

Phase 1 go/no-go review: GO (2026-09-30, in the plan). Phase 2 task 2.1 (rules in `SPEC.md`, Authoring and DX; commit order in the plan's 2.1 plan-mode pass): done (commits 2–5). Series model: `src/series.ts` (`discoverTutorials()`, card sort/select helpers), virtual module exports `series`, `tutorials[]`, `seriesIndex`, `seriesImages` (`TutorialData` + `seriesCards()` in `src/tutorial-data.ts`), MDX components read their tutorial from `Astro.locals` (`setCurrentTutorial()`/`currentTutorial()`), routes prefixed with `/[tutorial]` in a series, per-tutorial Preview storage keys, client `base` from `clientData`. Index: `src/pages/series-index.astro`, `components/TutorialList.astro` + `TutorialFilter.astro`, `client/series.ts` + `series-values.ts`, `styles/series.css`; `index.mdx` validated by `validateSeriesIndex()`. Custom index: `index` option (`customIndex()` in `src/index.ts`), public module `src/series-public.ts` (package export `./series`); `TutorialList`/`TutorialFilter` import `styles/series-list.css` and their own client scripts, so they work on any page; `*.astro` ambient type in `virtual.d.ts` for plain tsc; covered by `test/build.test.ts` (source import) and `scripts/smoke-pack.mjs` (published specifier). CLI: `--tutorials` + auto-detection of `tutorials/` (`seriesTutorials()` in `bin/interactive-code-scroll.mjs`); `--index <file>` passes a custom index page (series only). The series fixture runs through the CLI (auto-detected); its `astro.config.mjs` is for `astro check` only. Task 2.2 shared credentials: done (`persist="tutorial"` → `storageKey(name, scope, tutorial)` in `client/var-values.ts`, `data-persist="site|tutorial"` from `VarField.astro`, `persist` value validated in `validate.ts`). Task 2.5 sibling tutorials: done (`family`/`familyLabel` in `readTutorialConfig()`; `familyProblems()` + `familyOf()` in `series.ts`; `checkFamilies()` (run in `getStaticPaths`, warnings logged once) + `siblingsOf()` in `tutorial-data.ts`; header markup in `pages/index.astro`, `client/family.ts` + `family-values.ts`; `family` outside a series warns from `mdx-validation.ts`). Recommended next task: **2.4 Pages workflow** (plan order 2.4 → 2.3).

Docs rule: every feature commit updates `docs/features.md` (overview) and `docs/authoring.md` (reference).

Working notes:
- Try features by hand in `examples/multi-sdk-playground` (`pnpm playground`); regressions go in `examples/framework-fixture` + `e2e/`.
- UI changes: show screenshots before committing. Save them under `screenshots/` (git-ignored) so the user can open them from the IDE; the scratchpad is not reachable for them, and Playwright empties `test-results/` on every E2E run. Never delete screenshots the user has been asked to review. Phase 1 UI follows the approved mockup (https://claude.ai/artifact/MQMZJaG3RrP5aukBk8k1HF).
- Dev-server behavior (HMR, revalidation, overlay) is covered by `packages/interactive-code-scroll/test/dev.test.ts`; running `astro dev()` under Vitest needs the env overrides in the Known issues table.
- Variant fixtures: `pnpm variants` / `pnpm variants:hide` (dev). E2E projects bind specs to fixtures by file name in `playwright.config.ts` (`variants.spec.ts` + `result.spec.ts` → :4401, `variants-hide.spec.ts` → :4402, `rest-example.spec.ts` → `examples/rest-geocode` on :4403, `series.spec.ts` → `examples/framework-fixture-series` on :4404, the rest → :4400).
- E2E blocks every non-local host (`e2e/fixtures.ts`); mock services with `mockService()` (page routes win over the context route).
- Full E2E was green (121/121) after task 2.1 commit 2; `e2e/step-engine.spec.ts:73` was seen flaky once under parallel load.
- Browser checks with the Playwright MCP: the browser caches the page; add a throwaway query (`?v=2`) after a rebuild.

---

## Stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Package manager | pnpm |
| Authoring | MDX |
| UI | Calcite Design System (Esri) |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Base framework | Astro 7 + `@astrojs/mdx` (static output) |
| Code highlighting | Shiki 4 at build time (dual themes via CSS variables) |
| Client runtime | Framework-free TypeScript (add an island only if state grows) |
| Styling | Plain CSS + CSS Modules (no SCSS) |
| Output | Static website (GitHub Pages) |
| Package name | `interactive-code-scroll` |
| Distribution | Core npm package + `pnpm create interactive-code-scroll` scaffolder |

Dependencies: recent, stable and secure versions.

---

## File map

```
SPEC.md             # requirements source of truth
PROJECT.md          # shared AI agent context (this file)
TODO.md             # pending tasks only
CHANGELOG.md        # implemented changes (Keep a Changelog)
LICENSE             # Apache-2.0
CLAUDE.md           # Claude Code-specific rules
AGENTS.md           # Codex CLI-specific rules
README.md
docs/features.md   # public one-page overview of every capability, linking to the reference
docs/authoring.md  # public authoring/API reference for tutorial writers
docs/cli.md        # public CLI reference
docs/deployment.md # GitHub Pages/static hosting notes, including getting-started URL variables
docs/upgrade.md    # public upgrade guide for alpha authors
packages/interactive-code-scroll/  # core package: Astro integration
  bin/interactive-code-scroll.mjs   # generic CLI: dev, build, serve, doctor, init-scripts; --tutorial / --tutorials (auto-detected) / --index
  scripts/build-package.mjs         # package build: compiles TS and copies Astro/CSS assets
  dist/                             # generated package output (ignored; built by prepack)
  src/index.ts                     # interactiveCodeScroll() integration (MDX + Sätteri validation, injects routes; `tutorials`/`index` for a series)
  src/series.ts                    # series discovery (discoverTutorials()), SeriesCard, card sort/select helpers
  src/series-public.ts             # public `interactive-code-scroll/series` module: tutorials, TutorialList, TutorialFilter, SeriesCard
  src/tutorial-data.ts             # TutorialData per tutorial + seriesCards() for the index
  src/tutorial-files.ts            # reads tutorial.mdx, code/**, images/**, output/**, requests/**
  src/output.ts                    # captured output types, per-variant lookup, credential warnings
  src/requests.ts                  # .http parser (supported subset) + request name index
  src/error-rule.ts                # requests/errors.json: validation (build) + matchError() (runner), shared by build and browser
  src/tutorial-module.ts           # virtual:interactive-code-scroll/tutorial (Content, frontmatter, files, images) + dev revalidation hook
  src/markers.ts                   # #region / @var parser + applyVars
  src/validate.ts                  # reference validation (pure)
  src/mdx-validation.ts            # Sätteri mdast plugin that runs validate.ts with MDX positions
  src/highlight.ts                 # Shiki build-time highlighting
  src/frontmatter.ts               # title / preview config
  src/downloads.ts                 # project files with values applied, ZIP (fflate)
  src/components/                  # Step.astro, VarField.astro
  src/client/                      # browser runtime: calcite.ts, steps.ts + navigation.ts (step engine), vars.ts + var-values.ts (form → code), layout.ts + layout-values.ts (theme, splitters), presentation.ts, maximize.ts + maximize-values.ts (maximized panes), preview.ts, result.ts + result-values.ts (Result pane), json-tree.ts + json-tree-values.ts (JSON viewer), runner-values.ts (request runner), family.ts + family-values.ts (sibling menu links), terminal-values.ts (prompt/ANSI colors for `.txt`/`.log`), downloads.ts
  src/pages/index.astro            # injected tutorial page (at /[tutorial]/ in a series)
  src/pages/series-index.astro     # default series index page (index.mdx or filter + one list)
  src/preview/                     # preview page, code/ files published under preview/, HTML builder
  src/result/                      # output/ files published under output/
  test/                            # Astro build + dev-server (revalidation, overlay loc) integration tests + fixtures
examples/oauth-pkce/               # example project: astro.config.mjs + tutorial/ (tutorial.mdx, code/, images/)
examples/framework-fixture/        # stable fake tutorial for framework E2E coverage; do not edit for content polish
examples/framework-fixture-variants/      # stable fake tutorial with code variants (`notice` mode) and captured outputs; E2E in e2e/variants.spec.ts, e2e/result.spec.ts, e2e/maximize-steps.spec.ts
examples/framework-fixture-variants-hide/ # same, with `otherVariantSteps: hide`; E2E in e2e/variants-hide.spec.ts
examples/framework-fixture-series/        # stable series site (tutorials alpha, beta, gamma, delta + skipped folders; alpha/beta/delta are one family); E2E in e2e/series.spec.ts
examples/rest-geocode/              # public REST example (cURL / Python / JavaScript variants, requests/, output/, ArcGIS errors.json); `pnpm rest`; smoke E2E in e2e/rest-example.spec.ts (:4403)
examples/getting-started/           # public dogfooding tutorial for new authors; published by GitHub Pages workflow
examples/multi-sdk-playground/      # local hands-on tutorial for multi-SDK features (Python, Kotlin, C#, SQL); `pnpm playground`; no E2E, grows with each plan task
.github/workflows/publish-getting-started.yml # builds/deploys examples/getting-started on default-branch pushes
e2e/                               # Playwright tests (against the built example)
docs/research/technical-base-spike.md # spike findings (prototype code in git history, commit f265e61)
```


---

## Architecture

Implemented in `packages/interactive-code-scroll` (first proven in the spike):

| Piece | Runs | Responsibility |
|---|---|---|
| Marker parser | build | Strips `#region` / `@var`, returns clean code + region line ranges + var positions (`src/markers.ts`) |
| Highlighter | build | Shiki dual themes; `line` transformer tags `data-line` and `data-regions`; `decorations` put `data-var` on the literal's token |
| Validation | build | Each `<Step>` / `<VarField>` / `<Hint>` asserts its file, region, image and var exist, and the frontmatter is checked in the same pass (read from `ctx.data.astro.frontmatter`, errors positioned at the key's line); build fails with a clear message. In dev, a `hotUpdate` hook in `tutorial-module.ts` recompiles `tutorial.mdx` when `code/`, `images/`, `requests/` or `output/` change; the error's `line`/`column` becomes the overlay `loc` |
| MDX components | build | `<Intro>`, `<Step id file region images preview maximize only output request>`, `<VarField name label placeholder secret persist>` render static HTML. With code variants, `<Step>` emits `data-files` (variant id → file, from `stepFiles` in `src/variants.ts`) and `data-only`; results emit `data-output(s)` and `data-requests` (+ `data-request-variants`: covered non-web variants, `resultVariants()`) |
| Client runtime | browser | IntersectionObserver (center line of the docs panel) + keyboard + click on a step + top of the panel (first step) → activate step (file, focus lines revealed with `revealScroll`, carousel, hash, progress); var inputs → swap `textContent` of `[data-var]` spans + `localStorage`. Step keys: one `keydown` listener on `window` (capture) decides with `movesStep()` (`navigation.ts`): PageDown/PageUp from any focus but multi-line text, arrows unless the focus is in a field or a `[data-own-keys]` widget (JSON tree, splitters, Result tabs, Run as); the preview page forwards PageDown/PageUp/Esc (`KEY_FORWARDER`) |
| Code variants | build + browser | Frontmatter `variants` maps each variant to `code/<dir>/`; validation checks folders, per-variant region uniqueness and `only=`. The page renders one tab group per variant; `client/variants.ts` owns the active variant (`?variant=` > `ics:variant` > first), the switcher (segmented control while every tab fits, else dropdown; `switcherKind` in `client/variant-values.ts`) and fires `ics:variant`. The step engine, Preview and downloads listen to it: same region in the new variant's file, `notice`/`hide` for `only=` steps, Preview only for web variants (own page at `preview/<dir>/index.html`, served by `preview/code-file.ts`), ZIP of the active variant's folder |
| Result pane | build + browser | Takes the Preview's place for non-web code (`hasResult` in `pages/index.astro`). `output/` is published as static files (`result/output-file.ts`) and fetched when shown; `client/result.ts` picks the result step with `lastResult()` (last-result rule over outputs and requests) and renders JSON (`json-tree.ts`), terminal text (`terminal-values.ts`) or images, always as text nodes. Its header compacts when it runs out of room: a `ResizeObserver` measures the controls and `headerLevel()` (`result-values.ts`) turns Keep/Show captured, then Run, into icons with tooltips (`setTooltip()` in `actions.ts`); `.result-frame` is a size container (`result-frame`), and short/narrow-pane rules are `@container` queries in `tutorial.css` |
| Request runner | build + browser | The build parses `requests/*.http` (`parseHttpFile()`), and `runnerRequests()` embeds named requests with their file variables in `clientData.runner`. In `client/result.ts`, Run resolves `{{x}}` from `<VarField>` values or file defaults (`client/runner-values.ts`: query-only URL-encoding, masked request line), builds a `Request` (build errors are not network errors), `fetch`es without cookies and with a 30 s `AbortController`, and falls back to the captured output on timeout/network failure. Live responses are dropped when the pane's context (result step, variant, chosen request) changes, unless kept in an in-memory `Map` keyed by step id + request name. A `LiveResponse` holds exposed headers, the text body or an image object URL (revoked when dropped and not kept) and the service error matched by `requests/errors.json` (`src/error-rule.ts`: `readErrorRule()` at build → `clientData.errorRule`, `matchError()` on any JSON body). The pane shows Body/Headers tabs (`#result-tabs`, own `calcite-tab-title`s with `data-tab`) and the `#result-error` notice |
| Page shell | browser | `calcite-navigation` header (explanations toggle, title, step count, present, theme, `calcite-progress`); explanations scroll in their own panel (the page never scrolls); the whole page follows one Calcite mode (`theme` frontmatter default, viewer toggle wins); the explanations handle sits on the docs/code splitter (a rail when hidden); a second splitter sizes the Preview; the right panel has header bars for code (file tabs, copy, downloads) and preview (collapse, Run, open in tab) |
| Maximized panes | browser | `client/maximize.ts` sets `body[data-maximized="code\|preview"]`; CSS pins the code area (`.code-panel` or `.media-panel`, whichever is shown) or the shown Preview/Result pane with `position: fixed; inset: 0`. Nothing moves in the DOM (the iframe keeps its state, the explanations stay laid out for the step observer, splitter sizes are untouched); a `.right::after` placeholder keeps the code panel's size under a maximized lower pane. Steps dispatch `MAXIMIZE_EVENT` (`data-maximize`) after the Preview state; maximizing expands a collapsed pane, collapsing restores. Esc (window, capture) is handled before `presentation.ts`; the preview page forwards an unhandled Esc (`KEY_FORWARDER`). Not remembered |
| Preview page | browser | `preview/` page `document.write`s the assembled HTML (local scripts/styles inlined) from `localStorage`; used by iframe and new tab. Every other `code/` file is published at `preview/<path>` (e.g. the tutorial's `oauth-callback.html`) |
| CLI | Node | Generates a temporary Astro config for the selected tutorial folder, or for a series site (`--tutorials`, auto-detected from `tutorials/` when there is no single tutorial; `--index` for a custom index page), and runs Astro `dev`, `build` or `preview` (`serve`) with generic options only. `doctor` reports root/package-manager/Astro/tutorial detection, and `init-scripts` can add optional package scripts without overwriting existing ones. OAuth/provider help stays outside the core path unless explicitly configured later. |
| Series sites | build + browser | `tutorials: "<dir>"` makes one Astro build for every `<dir>/<slug>/tutorial.mdx` (`discoverTutorials()` in `series.ts`). The virtual module exports `series`, `tutorials[]` (`TutorialData`), `seriesIndex` (`index.mdx`, validated by `validateSeriesIndex()`) and `seriesImages`. The same routes are injected once with a `/[tutorial]` prefix; MDX components find their tutorial through `Astro.locals` (`setCurrentTutorial()`/`currentTutorial()`), and the client reads its `base` from `clientData`. Preview storage keys are per tutorial; vars (unless `persist="tutorial"`), theme, splits and variant choice stay site-wide. The index at `/` is `pages/series-index.astro` (cards from `seriesCards()`, `TutorialList` + `TutorialFilter` with `styles/series-list.css` and `client/series.ts`), or the author's page from the `index` option, which imports the list and components from the public `interactive-code-scroll/series` module (`series-public.ts`). Sibling tutorials (same `family`): `siblingsOf()` feeds a header menu of links (`#family-dropdown`); `client/family.ts` rewrites their `href` on `calciteDropdownBeforeOpen` with the current `#step` and `?variant=` when the sibling has that variant; cross-tutorial family rules run in `getStaticPaths` (`checkFamilies()`) |
| Package build | Node | `pnpm --filter interactive-code-scroll build` compiles TS to `dist`, copies `.astro`/CSS assets, rewrites internal imports to built `.js`, and emits a packaged CLI that resolves Astro from the consuming project first. `prepack` runs this before tarball creation. |

### Data flow

MDX + annotated code + images → build (validates references; fails on broken IDs) → static site → scroll/keyboard activates a step → right panel action (highlight region / switch file / show images) · form → client-side variable substitution → re-rendered code + Preview (iframe / new tab) + download. Non-web code: step → Result pane (captured `output/` file, or an explicit Run of a `requests/` request with form values → live response, captured fallback). Series site: `tutorials/<slug>/` → one build → `/<slug>/` per tutorial + index at `/` (cards from each tutorial's metadata frontmatter).

### Framework fixture

`examples/framework-fixture` is the stable regression fixture for framework behavior. It is intentionally fake product content and must not be edited for tutorial narrative/design polish.

When adding or changing framework behavior, update this fixture to include the new case whenever the behavior is observable through a tutorial, and add or adjust the corresponding Playwright assertions in `e2e/`. The real tutorials (for example `examples/oauth-pkce`) may change editorially; E2E tests for framework behavior should not depend on those editorial changes.

### Public docs and dogfooding tutorial

Public author-facing docs live in `README.md` and `docs/`. `docs/features.md` is the one-page overview of every capability; `docs/authoring.md` is the how-to reference. Every feature commit updates both (features marked in progress there until they ship). The root README is the repository entry point; `packages/interactive-code-scroll/README.md` is the npm package entry point and should stay in sync at a high level.

`examples/getting-started` is the dogfooding tutorial for first-time authors. It is not the regression fixture: use it for public author experience and docs validation, while keeping framework E2E behavior coverage in `examples/framework-fixture`.

The getting-started tutorial is published by `.github/workflows/publish-getting-started.yml`. The workflow defaults to GitHub Pages project-site URLs (`https://<owner>.github.io/<repo>/`) and can be configured with repository variables `ICS_GETTING_STARTED_SITE` and `ICS_GETTING_STARTED_BASE`.

---

## Coding style

- **Everything in the repo is in English**: code, comments, docs, commit messages, UI text. (Conversation with the user may be in Spanish.)
- TypeScript `strict`, no `any` (use `unknown` and narrow).
- ESM + named exports. No default exports, no CommonJS.
- No over-engineering: only what the task needs, no speculative abstractions.
- Minimal comments: only the non-obvious why.

### UI/UX workflow

Subjective visual changes need a user review loop before they are treated as final. Prefer showing a screenshot or concrete layout measurements from `examples/framework-fixture`, then adjust from feedback before broad validation, publishing or tagging.

### Test coverage workflow

Before committing, review the actual diff and identify which introduced behaviors need tests. Add focused unit and/or E2E coverage for those behaviors; do not automatically expand to the whole E2E suite unless the change touches shared runtime behavior, cross-panel layout, navigation, packaging, or another high-risk surface.

Use risk-based preflight to keep validation useful without wasting time or tokens:

| Change type | Default preflight | Notes |
|---|---|---|
| Docs/context only | `pnpm preflight:docs` | No app tests unless examples or generated docs behavior changed |
| CSS/UI only | `pnpm preflight:ui` plus user visual review | Add focused E2E only when behavior or layout contracts change |
| Runtime, CLI, build, package output | `pnpm preflight:package` | Add focused tests for the changed behavior |
| npm release | `pnpm preflight:release` plus tag/workflow/npm verification | Use for publishable tags |

When the user wants to save tokens, prefer preparing exact commit commands and a commit message for the user to run locally instead of having the agent execute `git commit`, `git push`, or tag commands. The agent should still report the files that should be staged and the preflight that was run or should be run.

---

## Constraints

- No backend execution; client-side flows only (e.g. OAuth PKCE).
- No incremental code per step: final code + highlighting.
- No npm bundling in the Preview: tutorial code runs as-is, dependencies via CDN.
- No CMS / visual editor.
- No multi-language support.
- No custom themes (Calcite light/dark only).
- Requires JavaScript. Desktop-first, not mobile-first.
- No offline mode / PWA.

---

## ArcGIS context

| Dimension | Value |
|---|---|
| API / SDK version | ArcGIS Maps SDK for JavaScript, latest 5.x, via CDN (`js.arcgis.com`) |
| Product tier | ArcGIS Online and Enterprise (portal URL as a form field) |
| OAuth references | [identity-oauth-basic sample](https://developers.arcgis.com/javascript/latest/sample-code/identity-oauth-basic/) · [Create OAuth credentials (Location Platform)](https://developers.arcgis.com/documentation/security-and-authentication/user-authentication/tutorials/create-oauth-credentials-user-auth/location-platform/) |
| UI rules | Calcite only. No inline styles. Style Calcite through its tokens, props and slots (host-level tokens/borders at most, never shadow internals); our CSS covers layout and our own content (MDX text, highlighted code). |
| Explore first | Before writing code for X, ask "what already exists for X?" and request existing code as a reference pattern. |
| Documentation | Check official Esri developer documentation before assuming ArcGIS APIs. |
| Off-limits | AMD modules, `watchUtils`, legacy widgets (in tutorial sample code). |

---

## Key technical patterns

### Tutorial code markup
- Regions: `// #region <id>` … `// #endregion` (HTML/CSS equivalents, plus shell/YAML-style `# #region` comments).
- Form variables: inline comment, e.g. `const clientId = "DEMO_ID"; // @var clientId`. The literal is the default (single source of truth).
- Source code must remain valid, runnable and lintable without the framework.
- Markers are stripped from rendered and downloaded code.
- `<Step file="...">` without `region` intentionally shows the whole file with no focus; text-only steps keep the current file visible but must clear any previous focused region.
- `<Intro>` is optional introduction content before the first step; it is not numbered, does not count as a step, and leaves the tutorial in a no-step state while it is at the top.
- `<VarField placeholder="...">` changes only the input hint; the code literal remains the default value used when the field is empty.

### Preview
- Optional and configurable per tutorial: iframe, new tab, or both.
- Default mode: `both`.
- Iframe and tab both load a same-origin preview page (`preview/`) that renders the current files; iframe sandbox includes `allow-same-origin`. OAuth via popup (`OAuthInfo` with `popup: true`) + the tutorial's own `code/oauth-callback.html`, published at `preview/oauth-callback.html`.
- New tab: standalone page with current files; OAuth via regular redirect.

### Page layout (grid, not `calcite-shell`)
The page structure is our own CSS grid (`div.layout` > `main.docs` + `div.gutter` + `aside.right`); Calcite provides the controls (`calcite-navigation`, actions, tabs, segmented control). Not a recorded upfront decision, but these requirements fit a plain grid better than `calcite-shell` / `calcite-shell-panel`:
- Docs/code splitter as a percentage (`--split`, 20–70 %), remembered and keyboard-operable; `calcite-shell-panel resizable` works in px within `--calcite-shell-panel-min/max-width` and exposes no persistent width.
- A second, nested splitter (code/Preview) inside `aside.right`; shell only has edge panels.
- The step engine observes and centers the scroll of `main.docs` (center line, deep links, `ResizeObserver`); inside `calcite-shell-panel` / `calcite-panel` the scroll container lives in shadow DOM.
- Layout correct from first paint, without waiting for Calcite hydration (late online, see Known issues).
- Own states (`data-docs-hidden` with the toggle as a rail, maximized panes, presentation mode) are simple CSS on the grid.

**Pending review:** not validated with Calcite experts. Ask whether current shell components can meet these requirements before any refactor (TODO.md).

---

## What to avoid

- `{{var}}`-style placeholders in tutorial code (break execution and linting).
- Referencing line numbers from MDX (fragile); use region IDs.
- Loading the OAuth sign-in page inside the Preview iframe.
- Adding dependencies without justification.
- Layout changes that reflow the explanations (splitter, window resize, showing them again) without going through `keepActiveCentered()` in `client/steps.ts`: the center-line observer then switches to whichever step crosses it and rewrites the URL hash.
- Importing `highlight.ts` (Shiki) from modules the browser bundle uses (`markers.ts`, `downloads.ts`, `client/*`): shared helpers such as `extensionOf` live in `file-types.ts`.
- Non-English text in the repo.
- E2E tests that depend on the network: import `test` from `e2e/fixtures.ts` (blocks the Esri CDN: SDK and Calcite assets); opt in with `test.use({ network: true })` only when testing the SDK itself.
- Do not update E2E tests just to follow editorial changes in `examples/oauth-pkce`; while the tutorial is being polished, prefer testing framework behavior against stable fixtures.
- E2E coverage uses `examples/framework-fixture`, a dedicated fake tutorial that exercises framework cases and is not edited for content/design polish. New framework capabilities that should be protected from regressions should add a stable case there plus the corresponding E2E assertion.
- E2E assertions that check state the code under test just set; assert the user-visible outcome (what the component actually shows).
- Generic class names in E2E selectors (e.g. `.progress`): Playwright pierces shadow DOM and matches Calcite internals; use ids or `data-*` attributes.
- Global selectors for shared Calcite elements in client modules (e.g. `$$("calcite-tab-title")`, `querySelectorAll("calcite-notice")`): the page has several groups of the same component (file tabs, Result pane tabs, notices). Scope to the owning container or a `data-*` attribute (`calcite-tab-title[data-file]`), and when adding a second instance of a component, grep for unscoped selectors of it first.
- `@container` rules in `tutorial.css` with the same specificity as the base rule they override: the base rule usually comes later in the file and wins. Raise the selector's specificity (e.g. `.result-live > .result-body`) and check the computed style.
- Overriding Calcite styles by reaching into components (`::part` hacks, `!important`, shadow selectors); use tokens, props and slots.

---

## Known issues / differences

| Feature | Context A | Context B | Notes |
|---|---|---|---|
| ArcGIS OAuth sign-in | Inside iframe: expected to be blocked (X-Frame-Options) — **unverified** | Popup from the Preview iframe: **verified** (PKCE S256, real Client ID) | The SDK shows its own "Please sign in" dialog first: the popup needs a user gesture |
| OAuth redirect URI | GitHub Pages | localhost (served locally) | Both must be registered in the app by the author; the CLI prints the exact URIs |
| Keys inside widgets vs step keys | `stopPropagation()` in a widget's own `keydown` handler: does not help | `data-own-keys` on the widget (or an ancestor): step keys ignored | The step key listener runs on `window` in the capture phase, before any widget handler; `data-own-keys` owns arrow keys only: PageUp/PageDown (clickers) still move steps (`movesStep()` in `navigation.ts`) |
| Calcite `calcite-tab-title` keyboard | Arrow keys: move the focus between tabs only | Enter/Space: select the focused tab | Manual activation; E2E must press Enter after the arrow before asserting `selected` |
| Preview `redirect_uri` | `srcdoc` / blob iframe: SDK builds it from `location` → `about://null/oauth-callback.html` (`<base href>` ignored) | Real same-origin preview page: correct URI | Preview (iframe and tab) must load a real URL; `oauth-callback.html` must sit next to that page |
| Preview sandbox | Without `allow-same-origin`: opaque origin, no Referer (OSM tiles 403, referrer-restricted API keys fail), callback cannot reach `window.opener` | With `allow-same-origin`: works | Preview can read the tutorial's `localStorage` (author-trusted code) |
| Keyboard step navigation | Focus in page: works | Focus inside Preview iframe: keys go to the map | Forward keys from the preview page (same origin) |
| Short / first steps | Center-line trigger: a step shorter than the gap between two others, or one above the center line at scroll top, never becomes active by scrolling | — | Click-to-activate and "top of the panel → first step", the latter only for user scrolling (a key scroll to an early step also ends at the top). The tail below the last step is computed (half the panel minus half the step), not a fixed 60vh |
| Esc in presentation mode | Browser full screen: the browser takes Esc to leave full screen, the page gets no `keydown` | Full screen refused or not used: the page gets Esc | One level per Esc: `fullscreenchange` leaves presentation mode and a maximized pane stays until the next Esc. `client/maximize.ts` starts before `presentation.ts` and stops Esc while a pane is maximized |
| `calcite-dialog` | Esc closes it while focus is inside | Focus outside (e.g. opened from a click that keeps focus on the page): Esc does nothing | Handle Esc ourselves too; `heading` is a property (not reflected): assert with `toHaveJSProperty` |
| `#step-id` deep link | Native fragment scroll aligns the step top; `scrollIntoView({ block: "center" })` also honours `scroll-margin`, so a short step lands below the center line | Trigger line is the docs panel center | No `scroll-margin` on steps; the engine centers the step itself (on load and on `hashchange`); on load a `ResizeObserver` keeps it centered while the layout settles, until user input (wheel, touch, pointer, key) |
| Astro 7 + pnpm build | Prerender bundle externalizes `cookie`; pnpm does not hoist it | Node resolves a stray copy up the tree (e.g. `~/node_modules`) → CJS import error | `vite.environments.prerender.resolve.noExternal: ["cookie"]` |
| Astro 7 CLI `--config` | Absolute path passed to `--config` | Astro joins it with `--root` and reports `ConfigNotFound` | Pass a config path relative to `--root`; the generated CLI config may still be written via an absolute path |
| pnpm package bin shim | `process.argv[1]` points at a symlink under `node_modules/.bin` | `import.meta.url` points at the real file under `.pnpm` | Resolve `process.argv[1]` with `realpathSync` before deciding whether the CLI is the entrypoint |
| Packaged CLI Astro lookup | Workspace package has Astro under the package root | Installed package usually has Astro as a peer in the consuming project | Resolve `root/node_modules/astro/bin/astro.mjs` first, then fall back to the package-local path for workspace/dev |
| Tutorial subfolder execution | User runs the CLI from inside a tutorial subfolder with `--tutorial .` | `astro` is installed in a parent project root | Search parent directories for `node_modules/astro/bin/astro.mjs` instead of only checking the current root |
| External pnpm invocation | Direct `./node_modules/.bin/interactive-code-scroll` works | `pnpm exec interactive-code-scroll` may hang in some consumer environments | Keep the direct bin path and package scripts documented as reliable fallbacks while investigating pnpm behavior |
| npm script arguments | `npm run dev -- --tutorial .` forwards `--tutorial` to the CLI | `npm run dev --tutorial .` is consumed by npm and does not reach the CLI | Missing tutorial diagnostics and unexpected positional arguments should show the `npm run ... -- ...` form explicitly |
| npm publish workflow | `pnpm/action-setup@v4` without `version` or root `packageManager` | Explicit `version` in the workflow | The action fails before install with "No pnpm version is specified" |
| `JSON.parse` error position (Node/V8) | "Expected …" / "Unterminated string" messages include `position N (line L column C)` | "Unexpected token …" messages have no position | `readErrorRule()` reports those at line 1; do not rely on the message for exact positions |
| Response headers in the runner | Same-origin or CORS-safelisted headers (`Content-Type`, `Content-Length`…): readable | Other headers of a cross-origin response: hidden unless listed in `Access-Control-Expose-Headers` | The Headers tab lists `response.headers` as the browser exposes them (lowercase names) and says so |
| npm trusted publishing provenance | Missing or mismatched package `repository.url` | URL matching the GitHub provenance repository | Publish can fail with E422; npm may normalize the URL to `git+https://github.com/<owner>/<repo>.git` |
| Shiki line layout | `.line` as `inline-block` inside `<pre>` | `.line` as `block` inside `<pre>` | Block line spans can make Shiki's inter-line text nodes render as extra vertical spacing; keep lines inline-level and assert adjacent line spacing in E2E |
| MDX frontmatter in Sätteri plugins | `ctx.source` has the frontmatter blanked out (lines kept) | Astro parses it first and seeds `ctx.data.astro.frontmatter` | Read the parsed object from `ctx.data`; get key line numbers from the file on disk (`frontmatterKeyLines`) |
| MDX plugins (Astro 7) | `remarkPlugins` on `@astrojs/mdx`: deprecated | Default processor is Sätteri: use `mdastPlugins` (`satteri` 0.x, API may change) | Astro does not surface Sätteri `report()` diagnostics: throw instead |
| `astro dev` / `astro preview` (v7) | Human terminal: foreground | AI agent detected (`AI_AGENT` env): auto-backgrounds and returns | Use `--ignore-lock` to stay in the foreground (Playwright `webServer`); otherwise `astro dev stop` / `astro dev logs` |
| `astro dev()` under Vitest | `process.env.VITEST` set: Astro skips its dev request handler (every page 404 "Cannot GET"); `NODE_ENV=test`: Astro sets `server.hmr: false`, so no `hotUpdate` hooks run | Unset `VITEST` and set `NODE_ENV=development` around `dev()`, then restore | See `test/dev.test.ts`; overlay errors reach the browser over the HMR socket (`?token=` from `/@vite/client`) 200 ms after the 500 response |
| `calcite-carousel` selection | Setting `selected` on a `calcite-carousel-item` after creation: ignored (two items end up `selected`, the view does not move) | `selected` present when items are created: honoured | Public API has no next/select method; re-create the carousel with the wanted item `selected`; read the carousel's `selectedItem` (not items' flags) |
| Calcite runtime assets | Online: components wait for t9n JSON from `js.arcgis.com` before first render (~1 s, more under load) | Offline / CDN blocked: render once the fetch fails, but no icons or translated labels | Matters for the "serve locally" plan B; tests block the CDN (`e2e/fixtures.ts`). Neither `customElements.whenDefined` nor `componentOnReady()` guarantees final layout online: observe sizes instead (`ResizeObserver`) |
| Calcite mode classes | `calcite-mode-light` / `-dark` set Calcite tokens | They do not set `color-scheme` | Set it ourselves: `light-dark()` (Shiki colors) and native scrollbars follow the nearest mode class (the code panel's own class) |
| Local servers on fixture ports | Fresh `astro preview` of a just-built fixture | An older `astro dev` left running (e.g. from an earlier session) keeps the port and serves a stale virtual module (e.g. `outputs` undefined → 500 in `index.astro`) | Before manual checks or screenshots, run `lsof -nP -iTCP -sTCP:LISTEN` and use a free port; `astro preview` silently moves to the next port when one is taken. Do not kill servers you did not start |
| `calcite-input` `action` slot | Slotted `calcite-action` renders next to the field without a border | Reads as a separate button | Give the action host the input border token (`--calcite-color-border-input`), no start border |
| Stray `~/node_modules` | `tsc` and Node resolve packages up the tree, outside the repo (`@types/node`, `cookie`) | Fresh clone / CI: missing | Declare what we use (`@types/node` dev dependency); validate with a clean worktree outside the home folder |
| Preview theme | Iframe: `prefers-color-scheme` inside follows the `<iframe>` element's `color-scheme` (verified in Chromium) | New tab: follows the OS | Tutorial apps opt in with `calcite-mode-auto`; the framework never rewrites tutorial code. E2E: Playwright emulates `colorScheme: "light"` by default and forces it on every frame; use `colorScheme: null` to observe this |
| ArcGIS REST error responses | Many endpoints answer HTTP 200 with `{ "error": { "code", "message", "details" } }` in the body (e.g. 498 invalid token) | Transport failures (network, CORS) have no body at all | Request runner must not judge success by HTTP status alone: use the declarative error rule (planned); keep ArcGIS rule/codes in the preset, not core |
| Runner `fetch` and Playwright mocks | A cross-origin `page.route().fulfill()` without `Access-Control-Allow-Origin` fails as a network error; a POST with `Content-Type: application/json` also sends an `OPTIONS` preflight to the same route; `new Request()` throws a `TypeError` for a body on GET/HEAD (same type as network errors) | Same-origin fetches need no CORS headers | Mocks answer `OPTIONS` with 204 and send CORS headers (`e2e/result.spec.ts`); `result.ts` builds the `Request` before `fetch` so build errors are not reported as network failures |
| Playwright context vs page routes | `page.route()` handlers run before `context.route()` handlers for the same URL | Without a page route, the context route (abort) wins | `e2e/fixtures.ts` aborts every non-local host at context level; tests mock services with `page.route` (`mockService()`), so an unmocked call fails as a network error instead of reaching the real service |
| `calcite-action` `indicator` | Online: renders the dot | Offline / CDN blocked (t9n not loaded): render throws (`messages.indicatorLabel` undefined, `messageOverrides` does not help) and the action collapses to 0 px | Do not use `indicator` (it has no count either); draw our own badge on a wrapper element (`.zip-action`) |
| Astro attributes on custom elements | `hidden={false}` / `selected={false}` on a native element: attribute omitted | On a custom element (e.g. `calcite-tab-nav`): serialized as the string `"false"`, so `hidden="false"` hides it | Write `attr={condition \|\| undefined}` |
| Calcite sizes late | Measuring a Calcite container once (or observing only it) on load | Its children (`calcite-tab-title`, `calcite-segmented-control`) grow after they render, while the container keeps its size | Observe the children too (`ResizeObserver`); see `client/variants.ts` |
| Calcite props in React 19 | Set as DOM properties (e.g. `label`) | Not reflected as attributes | E2E selectors must not rely on those attributes |
| Per-tutorial context for MDX components (Astro 7) | Values set on `Astro.locals` in a page's frontmatter: visible to MDX components that page renders (`<Content components>`), one value per route in a static build | A module-level "current tutorial" variable: shared by every route, unsafe if pages render concurrently (not verified) | Series sites use `setCurrentTutorial()`/`currentTutorial()` (`src/tutorial-data.ts`). A static route (`/`) may export `getStaticPaths` (returning `[{ params: {} }]`) without warning, so one entrypoint serves both `/` and `/[tutorial]` |
| `.astro` imports in package TypeScript (`tsc`, TS 6) | `astro/client` declares no `*.astro` module: `export { default } from "./X.astro"` fails with TS2307 and the package build stops | Ambient `declare module "*.astro"` in `src/virtual.d.ts`; Astro's tooling (`astro check`, editors) still resolves the real component and its `Props` first | `src/series-public.ts` re-exports `TutorialList`/`TutorialFilter`; the emitted `.d.ts` keeps the `.astro` specifiers |
| Astro pages and `<meta charset>` | Astro does not add a charset: a page without `<meta charset="utf-8" />` is decoded as Windows-1252, so `—` shows as `â€”` | Every example `.astro` page (docs, tests, fixtures) includes `<meta charset="utf-8" />` | Seen in the custom series index example (`docs/authoring.md`); the injected pages already have it |
| `calcite-navigation-logo` with `description` on phones | Default: the navigation slot does not constrain the logo; the heading/description do not ellipsize and widen the page (414 px at 390 px) | `max-width` + `overflow: hidden` on the logo host: no page overflow, text clipped (no ellipsis) | `styles/series.css`; E2E guards the index at 390 px. Tutorial headers have no description, so they are unaffected so far |

---

## Deployment

- GitHub Pages via GitHub Actions, on push to `main` or `master`.
- Current published site: the dogfooding getting-started tutorial (`examples/getting-started`).
- Default Pages URL shape: `https://<owner>.github.io/<repo>/`.
- Configurable repo variables: `ICS_GETTING_STARTED_SITE` (origin, no trailing path) and `ICS_GETTING_STARTED_BASE` (`/<repo>/` by default, `/` for custom domains or user/org pages).
- Multi-tutorial repos with an index page are still pending in `TODO.md`.

---

## Git conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…), in English.
- Commit as you go: after each feature (or meaningful sub-step) is implemented and its tests pass, commit it.
- `TODO.md` holds **pending** tasks only. When a task is done, remove it from `TODO.md` and add an entry to `CHANGELOG.md` under `## [Unreleased]` in the same commit.
- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) (Added / Changed / Fixed / Removed).
- Never commit secrets: `.env`, real Client IDs, API keys. Tutorials use demo values only.
