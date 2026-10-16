# InteractiveCodeScroll

> A framework for technical writers, devrels and speakers to build guided, interactive code tutorials (in the style of the Stripe Checkout quickstart) by writing MDX and annotating source code.

This file is the shared AI context for this project. It is read by all AI coding agents.
Agent-specific behaviour rules live in each agent's own file (CLAUDE.md, AGENTS.md).

> Requirements source of truth: `SPEC.md`. This file covers **how to work** in the project — not what to build.

---

## What this project is

A framework that turns a tutorial folder (MDX + code + images) into an interactive static website: documentation on the left, code on the right, synchronized by scroll/keyboard (region highlighting, file switching, images), with forms that update code variables, an optional Preview (iframe and/or new tab), downloads and a presentation mode. Built for projecting at conferences and for reproducing at home. Desktop-first. Published on GitHub Pages.

InteractiveCodeScroll is generic. OAuth, ArcGIS and maps are example/tutorial concerns only; do not add topic-specific assumptions to the core package, runtime, validation, CLI or public documentation. Topic-specific helpers must be explicit opt-ins or example-level configuration.

Status: in development. Base: Astro + MDX + Shiki; spike findings in `docs/dev/research/technical-base-spike.md`.

---

## Commands

Package manager: **pnpm**. From the repo root:

```sh
pnpm install
pnpm dev          # framework fixture through the generic CLI
pnpm build        # build the framework fixture through the generic CLI
pnpm playground   # multi-SDK playground (examples/multi-sdk-playground) in dev mode
pnpm rest         # REST example tutorial (examples/rest-geocode) in dev mode
pnpm variants     # code variants fixture (fixtures/framework-fixture-variants) in dev mode
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

Multi-SDK plan: `docs/dev/research/arcgis-multi-sdk-plan.md` (phases, decisions, go/no-go review); requirements marked *planned* in `SPEC.md`; ordered tasks in `TODO.md`. Phase 0 is done (config-aware validation, languages + scoped markers, var escaping + shared defaults, `files:` + binaries + ZIP count badge, dev revalidation of `code/`/`images/`/`requests/`/`output/` with overlay `loc`).

Phase 1 rules are in `SPEC.md`; task order in `TODO.md` (1a → 7). Done: 1a variants validation, 1b switcher + `only=` (`notice`/`hide`), 1c Preview and ZIP per variant (`da9f036`), 2 Result pane + captured output, 3 JSON viewer, 4a `.http` parser + validation + `requests/` in every ZIP, 4b runner UI, 5 error rule + Body/Headers tabs, 6 REST example (`examples/rest-geocode`), 7 presentation fit. Phase 1 is complete. Variants code: `src/variants.ts` (build helpers), `src/client/variants.ts` + `variant-values.ts` (switcher, choice, fit rule), variant handling in `src/client/steps.ts`, `preview.ts`, `downloads.ts`, `src/preview/code-file.ts` (per-variant preview page).

Result pane code: `src/output.ts` (types, `output/<variant>/` lookup, credential scan), `src/result/output-file.ts` (publishes `output/`), `stepOutputs()` in `src/variants.ts`, `src/client/result.ts` + `result-values.ts` (pane, last-result rule), `STEP_EVENT` from `src/client/steps.ts`. JSON viewer: `src/client/json-tree.ts` (DOM, keyboard) + `json-tree-values.ts` (parse, depth rule, paging, key map); reuse `renderJsonTree()` for the runner's Body tab.

Tutorial file listing: `walk()` in `src/tutorial-files.ts` prunes `GENERATED_DIRS` and folders holding `pyvenv.cfg` without reading them (`inGeneratedDir()` also keeps them out of dev reloads in `tutorial-module.ts`); `listFiles()` drops any path with a segment starting with `.`; `listCode()` also drops gitignored paths (`walk()` applies `.gitignore` files inside `code/` and from `gitignoreParents()`, up to the git repo root, with the `ignore` package, case-sensitive; `ignoredCode` records the deciding `.gitignore`; design in `docs/dev/research/gitignore-file-listing.md`) and adds the hidden or gitignored `code/` paths matched by frontmatter `include`, read with `parseFrontmatter()` from `astro/markdown` before the MDX compile (the virtual module needs the list; `readTutorialConfig()` validates the value later). `hiddenCode` + `ignoredCode` feed the unmatched-`include` errors and the gitignored `<Step file>`/`files` errors in `validate.ts`; `skippedCodeDirs` and the include-publishes-gitignored warnings come from `mdx-validation.ts`. Covered by `src/tutorial-files.test.ts` and `test/build.test.ts`.

Requests code: `src/requests.ts` (`parseHttpFile()` → `HttpFile` with file variables and `HttpRequest`s, placeholders unresolved; `requestIndex()` for names), `requests`/`requestBinaries` in `src/tutorial-files.ts`, `checkRequest()` in `src/validate.ts`, `requests` in the virtual module and `clientData.requests` (parsed sources, used by the ZIP). Runner: `runnerRequests()` in `src/requests.ts` → `clientData.runner` (name → parsed request + file variables), `src/client/runner-values.ts` (substitution, query-only encoding, masked request line, Run as labels, messages), runner state in `src/client/result.ts` (`lastResult()` in `result-values.ts` picks the result step for outputs and requests), `data-requests`/`data-request-variants` from `Step.astro` (`resultVariants()` in `src/variants.ts`). Fixture: `request="list-items list-items-post"` and a Node-only `create` step with a request and no output; E2E mocks `api.fixture.test` with `page.route` (CORS headers + OPTIONS).

Error rule: `src/error-rule.ts` (`readErrorRule()` validates `requests/errors.json`, `matchError()` runs on any JSON response), `clientData.errorRule`; `LiveResponse` in `src/client/result.ts` holds headers, image object URL and the matched error; `#result-error` notice + `#result-tabs` (Body/Headers). File-tab code in `steps.ts` targets `calcite-tab-title[data-file]` only.

Maximized panes: `src/client/maximize.ts` (state on `body[data-maximized]`, CSS pins the pane with `position: fixed`, no DOM moves) + `maximize-values.ts`; steps dispatch `MAXIMIZE_EVENT` after the Preview state.

Step keys: `movesStep()` in `src/client/navigation.ts` (PageDown/PageUp from any focus but multi-line text; `data-own-keys` now means "owns arrow keys": JSON tree, splitters, `#result-tabs`, `#result-run-as`). Result header compact mode: `headerLevel()` in `result-values.ts` + ResizeObserver in `result.ts` (`setTooltip()` in `actions.ts`); short/narrow pane rules are `@container result-frame` queries in `tutorial.css`.

Phase 1 go/no-go review: GO (2026-09-30, in the plan). Phase 2 task 2.1 (rules in `SPEC.md`, Authoring and DX; commit order in the plan's 2.1 plan-mode pass): done (commits 2–5). Series model: `src/series.ts` (`discoverTutorials()`, card sort/select helpers), virtual module exports `series`, `tutorials[]`, `seriesIndex`, `seriesImages` (`TutorialData` + `seriesCards()` in `src/tutorial-data.ts`), MDX components read their tutorial from `Astro.locals` (`setCurrentTutorial()`/`currentTutorial()`), routes prefixed with `/[tutorial]` in a series, per-tutorial Preview storage keys, client `base` from `clientData`. Index: `src/pages/series-index.astro`, `components/TutorialList.astro` + `TutorialFilter.astro` + `TutorialFavorites.astro` (cards from `TutorialCard.astro`), `client/series.ts` + `series-values.ts`, `client/favorites.ts` + `favorites-values.ts`, `styles/series.css`; `index.mdx` validated by `validateSeriesIndex()`. Custom index: `index` option (`customIndex()` in `src/index.ts`), public module `src/series-public.ts` (package export `./series`); `TutorialList`/`TutorialFilter`/`TutorialFavorites` import `styles/series-list.css` and their own client scripts, so they work on any page; `*.astro` ambient type in `virtual.d.ts` for plain tsc; covered by `test/build.test.ts` (source import) and `scripts/smoke-pack.mjs` (published specifier). CLI: `--tutorials` + auto-detection of `tutorials/` (`seriesTutorials()` in `bin/interactive-code-scroll.mjs`); `--index <file>` passes a custom index page (series only). The series fixture runs through the CLI (auto-detected); its `astro.config.mjs` is for `astro check` only. Task 2.2 shared credentials: done (`persist="tutorial"` → `storageKey(name, scope, tutorial)` in `client/var-values.ts`, `data-persist="site|tutorial"` from `VarField.astro`, `persist` value validated in `validate.ts`). Task 2.5 sibling tutorials: done (`family`/`familyLabel` in `readTutorialConfig()`; `familyProblems()` + `familyOf()` in `series.ts`; `checkFamilies()` (run in `getStaticPaths`, warnings logged once) + `siblingsOf()` in `tutorial-data.ts`; header markup in `pages/index.astro`, `client/family.ts` + `family-values.ts`; `family` outside a series warns from `mdx-validation.ts`). Task 2.4 Pages workflow: done (author workflows npm + pnpm in `docs/deployment.md`, `ci.yml`, `base` export of the virtual module replaces `import.meta.env.BASE_URL`; see Deployment). Task 2.3 scaffolder: done (`packages/create-interactive-code-scroll`, see File map; wizard UX reviewed: one grouped kind:lang list, runtimes as languages, mixed kinds, one list per series tutorial on request). Phase 2 released as **0.2.0-beta.0** (`latest` dist-tag); embedded pages (`embed=`) released as **0.2.0-beta.1**; `<Intro>` pane props, `include` and the dot-path/generated-folder fix (issues #1, #2) as **0.2.0-beta.2**; typed/JSON/choice vars, JSON regions, card and variant logos and `.gitignore` in the `code/` listing as **0.2.0-beta.3**; `<Intro>` images/embed and the first-step fallback as **0.2.0-beta.4**; the series search bar, tag families, card variant links and tag logos, difficulty bars, favorites and step-ordered file tabs as **0.2.0-beta.5**; file switch cues, `<Intro file>`, VarField columns (radio `layout`), styled tables and step-aware notes as **0.2.0-beta.6**. Recommended next: Phase 2 go/no-go review in the plan, then Phase 3 (3.1 result views + renderer plugins). The scaffolder is where ArcGIS starters go (TODO).

Docs rule: every feature commit updates `docs/features.md` (overview) and `docs/authoring.md` (reference).

Working notes:
- Try features by hand in `examples/multi-sdk-playground` (`pnpm playground`); regressions go in `fixtures/framework-fixture` + `e2e/`.
- UI changes: show screenshots before committing. Save them under `screenshots/` (git-ignored) so the user can open them from the IDE; the scratchpad is not reachable for them, and Playwright empties `test-results/` on every E2E run. Never delete screenshots the user has been asked to review. Phase 1 UI follows the approved mockup (https://claude.ai/artifact/MQMZJaG3RrP5aukBk8k1HF).
- Dev-server behavior (HMR, revalidation, overlay) is covered by `packages/interactive-code-scroll/test/dev.test.ts`; running `astro dev()` under Vitest needs the env overrides in the Known issues table.
- Variant fixtures: `pnpm variants` / `pnpm variants:hide` (dev). E2E projects bind specs to fixtures by file name in `playwright.config.ts` (`variants.spec.ts` + `result.spec.ts` → :4401, `variants-hide.spec.ts` → :4402, `rest-example.spec.ts` → `examples/rest-geocode` on :4403, `series.spec.ts` → `fixtures/framework-fixture-series` on :4404, `site.spec.ts` → `site/` on :4405 (waits for `/interactive-code-scroll/`, the site has no root page), `json-regions.spec.ts` → `fixtures/framework-fixture-json-regions` on :4406, `intro-media.spec.ts` → `fixtures/framework-fixture-media` on :4407, the rest → :4400).
- E2E blocks every non-local host (`e2e/fixtures.ts`); mock services with `mockService()` (page routes win over the context route).
- Full E2E was green (121/121) after task 2.1 commit 2; `e2e/step-engine.spec.ts:73` was seen flaky once under parallel load. On macOS (2026-10-09) it fails every time locally, also on a clean checkout of `b78617b` (clicking a `<VarField>` in a later step scrolls it to the center line, which activates that step); CI on Linux passes. Still flaky locally on 2026-10-16 (2 of 5 and 4 of 6 runs, with and without the closing panel).
- Browser checks with the Playwright MCP: the browser caches the page; add a throwaway query (`?v=2`) after a rebuild. Wait past input debounces (the series search applies text 150 ms after the last keystroke) before reading the page or taking a screenshot.

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
CHANGELOG.md        # implemented changes (Keep a Changelog)
LICENSE             # Apache-2.0
CLAUDE.md           # Claude Code-specific rules (must stay at the root: loaded automatically)
AGENTS.md           # Codex CLI-specific rules (must stay at the root: loaded automatically)
README.md
docs/dev/SPEC.md    # requirements source of truth
docs/dev/PROJECT.md # shared AI agent context (this file)
docs/dev/TODO.md    # pending tasks only
docs/dev/research/  # plans, spikes and go/no-go reviews
docs/features.md   # public one-page overview of every capability, linking to the reference
docs/authoring.md  # public authoring/API reference for tutorial writers
docs/cli.md        # public CLI reference
docs/quick-start.md # public quick start: create, write, publish a first tutorial
docs/deployment.md # GitHub Pages/static hosting notes
docs/upgrade.md    # public upgrade guide for alpha authors
packages/create-interactive-code-scroll/  # `npm create interactive-code-scroll` wizard (plain .mjs + JSDoc, @clack/prompts)
  bin/create.mjs                    # entry → src/cli.mjs main()
  src/options.mjs                   # flags, Answers (use/useBy: kind:lang choices), defaults, unanswered(), validate()
  src/plan.mjs                      # pure planProject(answers, versions) → Map<path, content>; MDX per kind, mixed kinds via only=
  src/templates/                    # <kind>/<lang>/code/…, <kind>/{requests,output}/, pages/pages-{npm,pnpm}.yml (source of docs/deployment.md)
  src/next-steps.mjs, package-manager.mjs, write.mjs (never overwrites), versions.mjs (lockstep with the core, tested)
  test/create.test.mjs              # non-interactive CLI + build matrix of generated projects (fixtures/ ignored)
packages/interactive-code-scroll/  # core package: Astro integration
  bin/interactive-code-scroll.mjs   # generic CLI: dev, build, serve, doctor, init-scripts; --tutorial / --tutorials (auto-detected) / --index
  scripts/build-package.mjs         # package build: compiles TS and copies Astro/CSS assets
  dist/                             # generated package output (ignored; built by prepack)
  src/index.ts                     # interactiveCodeScroll() integration (MDX + Sätteri validation and field grouping, injects routes; `tutorials`/`index` for a series)
  src/series.ts                    # series discovery (discoverTutorials()), SeriesCard, card sort/select helpers, levelRank() (card difficulty bars)
  src/series-public.ts             # public `interactive-code-scroll/series` module: tutorials, TutorialList, TutorialFilter, TutorialFavorites, SeriesCard
  src/tutorial-data.ts             # TutorialData per tutorial + seriesCards() for the index
  src/tutorial-files.ts            # reads tutorial.mdx, code/**, images/**, embeds/**, output/**, requests/**; skips dot paths and (code/ only) gitignored paths unless frontmatter include, prunes generated folders
  src/output.ts                    # captured output types, per-variant lookup, credential warnings
  src/embed.ts                     # resolveEmbed() (embed= → embeds/ path or https URL, errors) + embedUrl()
  src/requests.ts                  # .http parser (supported subset) + request name index
  src/error-rule.ts                # requests/errors.json: validation (build) + matchError() (runner), shared by build and browser
  src/tutorial-module.ts           # virtual:interactive-code-scroll/tutorial (Content, frontmatter, files, images) + dev revalidation hook
  src/markers.ts                   # #region / @var parser (string, number, boolean vars) + applyVars, typedValue()
  src/json-vars.ts                 # <VarField json> targets and <Step region="/…"> JSON regions: JSON Pointer locator (own JSON tokenizer) + JSON_VARS_KEY / JSON_REGIONS_KEY
  src/field-options.ts             # <VarField type/options>: field types, static option literals, field-options/ files
  src/validate.ts                  # reference validation (pure)
  src/mdx-validation.ts            # Sätteri mdast plugin that runs validate.ts with MDX positions
  src/var-field-groups.ts          # Sätteri mdast plugin: wraps consecutive <VarField>s in div.var-fields (grid columns)
  src/highlight.ts                 # Shiki build-time highlighting
  src/frontmatter.ts               # title / preview config; logo helpers (isRemoteLogo, logoUrl), tagGroups with tag logos
  src/downloads.ts                 # project files with values applied, ZIP (fflate)
  src/completion.ts                # closing panel: next tutorial (next / index order), feedback and presentation URL placeholders
  src/components/                  # Intro.astro, Outro.astro (closing panel prose), Step.astro (both render images/embed through StepMedia.astro), VarField.astro, Hint.astro; series index: TutorialFilter.astro, TutorialList.astro, TutorialFavorites.astro (cards: TutorialCard.astro)
  src/client/                      # browser runtime: calcite.ts, steps.ts + navigation.ts + file-change-values.ts (step engine, file switch cues), vars.ts + var-values.ts (form → code), layout.ts + layout-values.ts (theme, splitters), presentation.ts, maximize.ts + maximize-values.ts (maximized panes), preview.ts, result.ts + result-values.ts (Result pane), json-tree.ts + json-tree-values.ts (JSON viewer), runner-values.ts (request runner), family.ts + family-values.ts (sibling menu links), series.ts + series-values.ts (series index search bar), completion.ts (closing panel: <Outro>, ZIP/Preview buttons, presentation slide and QR code), terminal-values.ts (prompt/ANSI colors for `.txt`/`.log`), downloads.ts
  src/pages/index.astro            # injected tutorial page (at /[tutorial]/ in a series)
  src/pages/series-index.astro     # default series index page (index.mdx or filter + one list)
  src/preview/                     # preview page, code/ files published under preview/, HTML builder
  src/result/                      # output/ files published under output/
  src/embed/                       # embeds/ files published under embeds/ (folder routes in dev only)
  test/                            # Astro build + dev-server (revalidation, overlay loc) integration tests + fixtures
examples/oauth-pkce/               # example project: astro.config.mjs + tutorial/ (tutorial.mdx, code/, images/)
fixtures/framework-fixture/        # stable fake tutorial for framework E2E coverage; do not edit for content polish
fixtures/framework-fixture-variants/      # stable fake tutorial with code variants (`notice` mode) and captured outputs; E2E in e2e/variants.spec.ts, e2e/result.spec.ts, e2e/maximize-steps.spec.ts
fixtures/framework-fixture-variants-hide/ # same, with `otherVariantSteps: hide`; E2E in e2e/variants-hide.spec.ts
fixtures/framework-fixture-series/        # stable series site (tutorials alpha, beta, gamma, delta + skipped folders; alpha/beta/delta are one family); E2E in e2e/series.spec.ts
fixtures/framework-fixture-media/         # series of tutorials without code/ and `preview: off` (intro images, intro embed, intro fallback); E2E in e2e/intro-media.spec.ts
examples/rest-geocode/              # public REST example (cURL / Python / JavaScript variants, requests/, output/, ArcGIS errors.json); `pnpm rest`; smoke E2E in e2e/rest-example.spec.ts (:4403)
examples/multi-sdk-playground/      # local hands-on tutorial for multi-SDK features (Python, Kotlin, C#, SQL); `pnpm playground`; no E2E, grows with each plan task
site/                              # project website (Astro, no framework integration): src/pages/index.astro landing, components/ (CopyCommand, DemoFrame, Shot), site-config.mjs (site/base/showcase list), scripts/build-showcase.mjs, scripts/screenshots.mjs (regenerates public/screenshots/, also used by the README and docs/*.md); docs-config.mjs + src/content.config.ts (Starlight docs under <base>docs/, rendered from the root docs/*.md: title from the H1, links rewritten, light/dark `<picture>` screenshots turned into theme-switched images), src/components/docs/ (Starlight overrides), styles/tokens.css (shared by global.css and docs.css); E2E in e2e/site.spec.ts (:4405)
.github/workflows/publish-site.yml # builds/deploys site/ on default-branch pushes
e2e/                               # Playwright tests (against the built example)
docs/dev/research/technical-base-spike.md  # spike findings (prototype code in git history, commit f265e61)
```


---

## Architecture

Implemented in `packages/interactive-code-scroll` (first proven in the spike):

| Piece | Runs | Responsibility |
|---|---|---|
| Marker parser | build | Strips `#region` / `@var`, returns clean code + region line ranges + var positions (`src/markers.ts`). A var's kind (string / number / boolean) is its `escape` (`varKind()`): the first string literal, else the first number or boolean (`@var name:type` picks one); typed values go through `typedValue()` (number as typed, boolean in the file's spelling, anything else → default). JSON files take `jsonVars` (`{ name, pointer }[]`) located by `locateJsonValue()` (`src/json-vars.ts`) |
| JSON vars | build | `<VarField json="file#/pointer">` targets are collected by `jsonVarTargets()` (`validate.ts`) and written by the MDX validation plugin into the frontmatter (`JSON_VARS_KEY`), because `pages/index.astro` parses `code/` before the MDX renders. Every `code/` parse that needs vars passes `jsonVarsOf(frontmatter)` (`parsedFiles(files, jsonVars)`, `index.astro`) |
| File tabs | build | `selectVisible()` (`visible-files.ts`; `variantVisible()` per variant in `variants.ts`) picks and orders the tabs. With `files` patterns: pattern order. Without: the files steps show, in first-reference order, then the rest by path. That order comes from `stepFileOrder()` (`variants.ts`, resolving `file` or a lone `region` per variant with `stepFiles()`), which the MDX validation plugin writes into the frontmatter (`STEP_FILES_KEY`) for `pages/index.astro` (`stepFilesOf()`), for the same reason as JSON vars. The ZIP and validation keep path order |
| Highlighter | build | Shiki dual themes; `line` transformer tags `data-line` and `data-regions`; `decorations` put `data-var` on the literal's token; an empty literal gets an empty span that the `root` hook colors like the token before it (`colorEmptyVars()`) |
| Validation | build | Each `<Step>` / `<VarField>` / `<Hint>` asserts its file, region, image and var exist, and the frontmatter is checked in the same pass (read from `ctx.data.astro.frontmatter`, errors positioned at the key's line); build fails with a clear message. In dev, a `hotUpdate` hook in `tutorial-module.ts` recompiles `tutorial.mdx` when `code/`, `images/`, `requests/`, `output/` or `field-options/` change; the error's `line`/`column` becomes the overlay `loc`. Non-fatal problems go to `warn` from `mdx-validation.ts` (credentials in outputs, unpublished `code/` dot folders, gitignored paths published by `include`, `family` or `next` outside a series, a `<summary>` parsed inline, i.e. inside a `<p>`, because no blank line follows it) |
| Field layout | build + CSS | `varFieldGroups()` (`var-field-groups.ts`) runs after the validation plugin (which reads every `<VarField>` where the author wrote it) and replaces each run of consecutive `<VarField>` siblings with a custom node (`data.hName: "div"`, class `var-fields`). `.var-fields` in `styles/tutorial.css` is a `repeat(auto-fill, minmax(min(16rem, 100%), 1fr))` grid; a textarea spans the row. A wrapper, not a grid on `.step`, so prose margins keep collapsing. The explanations have no line-length cap |
| MDX components | build | `<Intro preview maximize file images embed>`, `<Outro>` (no props: a hidden `div.outro` that `client/completion.ts` moves into the closing panel), `<Step id file region images embed preview maximize only output request>`, `<VarField name label type options json placeholder secret persist>` render static HTML (the field from `type` and the var's kind: Calcite input, number input, switch, text area, select, radio group or combobox, all with `data-var`, `data-kind`, `data-field`, `data-default-value`; `options` resolved by `resolveOptions()` from inline arrays or `field-options/`, which the virtual module exposes as `fieldOptions` and dev watches but no route publishes). With code variants, `<Step>` emits `data-files` (variant id → file, from `stepFiles` in `src/variants.ts`) and `data-only`; results emit `data-output(s)` and `data-requests` (+ `data-request-variants`: covered non-web variants, `resultVariants()`) |
| Client runtime | browser | IntersectionObserver (center line of the docs panel) + keyboard + click on a step + top of the panel (first step) → activate step (file, focus lines revealed with `revealScroll`, carousel, hash, progress); var fields → swap `textContent` of `[data-var]` spans + `localStorage` (`client/vars.ts`: one `adapterFor()` per Calcite field with its read/write/event; typed values formatted per token from its built literal; line breaks shown as `\n`). Step keys: one `keydown` listener on `window` (capture) decides with `movesStep()` (`navigation.ts`): PageDown/PageUp from any focus but multi-line text, arrows unless the focus is in a field or a `[data-own-keys]` widget (JSON tree, splitters, Result tabs, Run as); the preview page forwards PageDown/PageUp/Esc (`KEY_FORWARDER`) |
| Code variants | build + browser | Frontmatter `variants` maps each variant to `code/<dir>/`; validation checks folders, per-variant region uniqueness and `only=`. The page renders one tab group per variant; `client/variants.ts` owns the active variant (`?variant=` > `ics:variant` > first), the switcher (segmented control while every tab fits, else dropdown; `switcherKind` in `client/variant-values.ts`) and fires `ics:variant`. The step engine, Preview and downloads listen to it: same region in the new variant's file, `notice`/`hide` for `only=` steps, Preview only for web variants (own page at `preview/<dir>/index.html`, served by `preview/code-file.ts`), ZIP of the active variant's folder. Variant `logo` (validated like the tutorial `logo` in `validate.ts`): `pages/index.astro` renders it before each switcher label and as the initial header thumbnail; `startVariants(list, tutorialLogo)` rebuilds the dropdown trigger and sets `calcite-navigation-logo.thumbnail` to the active variant's logo, else the tutorial's; the favicon is static (tutorial `logo`, else the first variant logo) |
| Embedded pages | build + browser | `<Step embed=…>` (and `<Intro embed=…>`) resolves its value with `resolveEmbed()` (`embed.ts`; validation reports the same errors, `checkMedia()` in `validate.ts`) and renders, through `components/StepMedia.astro`, a `template.step-media` holding an `iframe.step-embed`. `embeds/` is published as is (`embed/embed-file.ts`; in dev a `<folder>` route per `index.html`, since `astro dev` has no directory index). In `client/steps.ts`, `showEmbed()` swaps the media panel like images, but a step with the same page and another fragment only sets `src` (fragment navigation, no reload), and the very same URL leaves `src` alone (reassigning it would reload a page without a fragment). `client/embed.ts` listens on a same-origin embed's window after each load: PageUp/PageDown (capture, stopped) and unhandled Esc are posted as the Preview's `ics:step-key` message; `#embed-open` (static, outside `.media-panel`) opens the shown page in a new tab |
| Intro media | build + browser | `<Intro images embed>` render the same `template.step-media` as `<Step>` (`StepMedia.astro`, a direct child of `.intro`). In `client/steps.ts`, `showPanel(template, index)` is the single path that swaps the media panel and the code panel for steps and the intro; it tracks the shown template (`shownMedia`) and skips re-rendering when the same template at the same image is asked again. `clearActive()` shows `introPanel()` once per visit to the intro (the `atIntro` guard; scrolling at the top calls it repeatedly): the intro's own media, else, when the page has nothing beside the intro (`emptyPane`: no `.code`, no `section.preview`, no step with `data-output(s)`/`data-requests`), the first reachable step's media, so entering that step keeps it as rendered. Step keys page the intro's own carousel (`moveCarousel()`), never a fallback one. `<Intro file>` renders `data-file` (or `data-files` per variant, `stepFiles()`) like a step; `clearActive()` shows that file, unfocused, once per visit through `fileOf()`/`showFile()`, and `mdx-validation.ts` passes the intro to `stepFileOrder()` so its file leads the tabs |
| File switch cues | browser | In `client/steps.ts`, `markFileChanges()` runs at start and on every variant change: it maps each reachable step to the file it shows (`fileOf()`; `undefined` for text-only, media and other-variant steps), passes the list and `startFile()` (the intro's file, else the first visible pane or the active variant's entry) to `fileChanges()` (`file-change-values.ts`), and adds an `aria-hidden` `span.step-file` chip (tab label + `file-code` icon) to the heading of each step that switches, or prepends it to a step without a heading. `showFile(path, announce)` returns whether the file changed; `activate()` passes `announce = !restoring`, so a step switch (not a deep-link restore, tab click, intro or variant change) replays `data-entering` on the pane (`ics-file-enter`, 180 ms) and its tab (`ics-tab-flash`, 1 s) through `enter()`, removed on `animationend`, and writes `Showing <label>` to the `.file-announcer` live region. The region scroll then waits `FILE_ENTER_MS` (skipped under `prefers-reduced-motion`, which also drops the pane animation in CSS) and runs only if that step is still current |
| Closing panel | build + browser | With `completion` (default true), `pages/index.astro` renders `section.completion` as the last child of `main.docs`: heading (`#completion-heading`, `tabindex="-1"`), `.completion-outro`, the next tutorial link (`nextTutorialOf()` in `tutorial-data.ts`: frontmatter `next`, else the next one in `sortCards()` order; `checkNext()` in `getStaticPaths` rejects unknown or self slugs), `.completion-actions` (ZIP and Preview buttons that `.click()` the code panel's `#download-zip` / `#preview-open`, index link, feedback link) and `.completion-share` (QR). URL placeholders go through `fillUrl()` (`completion.ts`); `feedbackUrl`/`presentationUrl` fall back to `index.mdx` (`readIndexConfig()`), and the QR URL then to `new URL(tutorialBase(base, slug), site)` (the virtual module exports Astro `site`), then to the page URL in the browser. In `client/steps.ts` the engine owns a `completed` flag (mirrored as `body[data-completed]`): `stepButtons()` turns Next into "Finish" at the last step and last image; `finish()` scrolls the panel to the center (`keyTarget = steps.length` so the observer ignores steps), focuses the heading and sets the flag; the panel is also observed, so scrolling it to the center line completes; any `activate()` clears it; Back/PageUp from it `goTo(current)`; `keepActiveCentered()` keeps the panel centered; `--tail` is sized from the panel. `client/completion.ts` moves `<Outro>` in, forwards the buttons and, on a `MutationObserver` of `data-presenting`/`data-completed`, moves the panel to `<body>` as the presentation slide (`[data-slide]`: fixed, grid with the QR column, CSS fade/rise skipped under reduced motion) and back; the QR is drawn once (`qrcode-generator`, dynamic `import()`) when presentation mode starts |
| Result pane | build + browser | Takes the Preview's place for non-web code (`hasResult` in `pages/index.astro`). `output/` is published as static files (`result/output-file.ts`) and fetched when shown; `client/result.ts` picks the result step with `lastResult()` (last-result rule over outputs and requests) and renders JSON (`json-tree.ts`), terminal text (`terminal-values.ts`) or images, always as text nodes. Its header compacts when it runs out of room: a `ResizeObserver` measures the controls and `headerLevel()` (`result-values.ts`) turns Keep/Show captured, then Run, into icons with tooltips (`setTooltip()` in `actions.ts`); `.result-frame` is a size container (`result-frame`), and short/narrow-pane rules are `@container` queries in `tutorial.css` |
| Request runner | build + browser | The build parses `requests/*.http` (`parseHttpFile()`), and `runnerRequests()` embeds named requests with their file variables in `clientData.runner`. In `client/result.ts`, Run resolves `{{x}}` from `<VarField>` values or file defaults (`client/runner-values.ts`: query-only URL-encoding, masked request line), builds a `Request` (build errors are not network errors), `fetch`es without cookies and with a 30 s `AbortController`, and falls back to the captured output on timeout/network failure. Live responses are dropped when the pane's context (result step, variant, chosen request) changes, unless kept in an in-memory `Map` keyed by step id + request name. A `LiveResponse` holds exposed headers, the text body or an image object URL (revoked when dropped and not kept) and the service error matched by `requests/errors.json` (`src/error-rule.ts`: `readErrorRule()` at build → `clientData.errorRule`, `matchError()` on any JSON body). The pane shows Body/Headers tabs (`#result-tabs`, own `calcite-tab-title`s with `data-tab`) and the `#result-error` notice |
| Page shell | browser | `calcite-navigation` header (explanations toggle, title, step count, present, theme, `calcite-progress`); explanations scroll in their own panel (the page never scrolls); the whole page follows one Calcite mode (`theme` frontmatter default, viewer toggle wins); the explanations handle sits on the docs/code splitter (a rail when hidden); a second splitter sizes the Preview; the right panel has header bars for code (file tabs, copy, downloads) and preview (collapse, Run, open in tab) |
| Maximized panes | browser | `client/maximize.ts` sets `body[data-maximized="code\|preview"]`; CSS pins the code area (`.code-panel` or `.media-panel`, whichever is shown) or the shown Preview/Result pane with `position: fixed; inset: 0`. Nothing moves in the DOM (the iframe keeps its state, the explanations stay laid out for the step observer, splitter sizes are untouched); a `.right::after` placeholder keeps the code panel's size under a maximized lower pane. Steps dispatch `MAXIMIZE_EVENT` (`data-maximize`) after the Preview state; maximizing expands a collapsed pane, collapsing restores. Esc (window, capture) is handled before `presentation.ts`; the preview page forwards an unhandled Esc (`KEY_FORWARDER`). Not remembered |
| Preview page | browser | `preview/` page `document.write`s the assembled HTML (local scripts/styles inlined) from `localStorage`; used by iframe and new tab. Every other `code/` file is published at `preview/<path>` (e.g. the tutorial's `oauth-callback.html`) |
| CLI | Node | Generates a temporary Astro config for the selected tutorial folder, or for a series site (`--tutorials`, auto-detected from `tutorials/` when there is no single tutorial; `--index` for a custom index page), and runs Astro `dev`, `build` or `preview` (`serve`) with generic options only. `doctor` reports root/package-manager/Astro/tutorial detection, and `init-scripts` can add optional package scripts without overwriting existing ones. OAuth/provider help stays outside the core path unless explicitly configured later. |
| Series sites | build + browser | `tutorials: "<dir>"` makes one Astro build for every `<dir>/<slug>/tutorial.mdx` (`discoverTutorials()` in `series.ts`). The virtual module exports `series`, `tutorials[]` (`TutorialData`), `seriesIndex` (`index.mdx`, validated by `validateSeriesIndex()`) and `seriesImages`. The same routes are injected once with a `/[tutorial]` prefix; MDX components find their tutorial through `Astro.locals` (`setCurrentTutorial()`/`currentTutorial()`), and the client reads its `base` from `clientData`. Preview storage keys are per tutorial; vars (unless `persist="tutorial"`), theme, splits and variant choice stay site-wide. The index at `/` is `pages/series-index.astro` (cards from `seriesCards()`, `TutorialList` + `TutorialFilter` with `styles/series-list.css` and `client/series.ts`; the search bar (`TutorialFilter`): server renders a `calcite-autocomplete`, a level `calcite-select`, every tag as a `<button aria-pressed>` pill in the one-line row and again in the `#series-tags-all` panel grouped by `tagGroups` (from `index.mdx` frontmatter via `readIndexConfig()`, or the `tagGroups` prop; unused tags checked against `seriesCards()` at render), plus a JSON blob (`#series-filter-data`) with groups and family indexes. The client keeps one `FilterState` (`q`, `tags`, `level`; read from/written to the URL with `replaceState`), runs `render()` on each change (text debounced 150 ms): cards by `matchesFilter()` (tags OR within a family, AND across), `<mark>` highlights, live tag counts (`liveTagCounts()` over the cards past text and level), row order by live count and a one-line `fit()` (ResizeObserver) that leaves the rest to "+N more", disabled empty pills in the panel, and tag suggestions (`suggestTags()`). Pure logic in `series-values.ts` (unit tested); family colors by `data-family` index (`--ics-family-0..7`, light/dark) in `series-list.css`; card tags, tag logos and variant links from `seriesCards(tutorials, base, groups, seriesImages)` in `tutorial-data.ts` (`cardTags()` adds variant labels, case-insensitive, in the `tagGroups` spelling; `tagLogos()` takes the `tagGroups` logo, else the variant's; `cardParts()` splits variant links, "+N" and plain tags for `TutorialList`; the card is an `<article>` whose title link is stretched over it, variant links above it; the client retargets the title to `?variant=` when a selected tag is one of the card's variants); card markup in `components/TutorialCard.astro`, shared by `TutorialList` and `TutorialFavorites`. Favorites (opt-in `<TutorialFavorites />`): the server renders every card in series order inside `section.series-favorites` (`hidden`, `data-base`); `client/favorites.ts` adds a `button.series-card-favorite` (`aria-pressed`, star `calcite-icon`, tooltip via `setTooltip()`) to every `.series-card-item` of the page, marks favorite section cards `.is-favorite` (CSS hides the rest), keeps slugs in `localStorage` `ics:favorites:<base>` (`favoritesKey()`/`readFavorites()`/`toggleFavorite()` in `favorites-values.ts`, every access guarded, `storage` event for other tabs), and follows the search bar through a `MutationObserver` on the cards' `hidden` attribute (the filter treats section cards like any list card; counts stay per slug); the section hides when no favorite is visible, and unmarking inside it focuses its heading)), or the author's page from the `index` option, which imports the list and components from the public `interactive-code-scroll/series` module (`series-public.ts`). Sibling tutorials (same `family`): `siblingsOf()` feeds a header menu of links (`#family-dropdown`, after a `.family-switcher::before` divider), each with the sibling's logo (`Sibling.logo`: tutorial `logo`, else its first variant logo; an empty `span.family-logo` keeps labels aligned when another sibling has one); `client/family.ts` rewrites their `href` on `calciteDropdownBeforeOpen` with the current `#step` and `?variant=` when the sibling has that variant, and sets `data-pointer-focus` on the trigger on `pointerdown` (cleared on `keydown`/`focusout`) so CSS hides Calcite's focus ring after a click only; cross-tutorial family rules run in `getStaticPaths` (`checkFamilies()`) |
| Package build | Node | `pnpm --filter interactive-code-scroll build` compiles TS to `dist`, copies `.astro`/CSS assets, rewrites internal imports to built `.js`, and emits a packaged CLI that resolves Astro from the consuming project first. `prepack` runs this before tarball creation. |

### Data flow

MDX + annotated code + images → build (validates references; fails on broken IDs) → static site → scroll/keyboard activates a step → right panel action (highlight region / switch file / show images / embed a page) · form → client-side variable substitution → re-rendered code + Preview (iframe / new tab) + download. Non-web code: step → Result pane (captured `output/` file, or an explicit Run of a `requests/` request with form values → live response, captured fallback). Series site: `tutorials/<slug>/` → one build → `/<slug>/` per tutorial + index at `/` (cards from each tutorial's metadata frontmatter).

### Framework fixture

`fixtures/framework-fixture` is the stable regression fixture for framework behavior. It is intentionally fake product content and must not be edited for tutorial narrative/design polish.

When adding or changing framework behavior, update this fixture to include the new case whenever the behavior is observable through a tutorial, and add or adjust the corresponding Playwright assertions in `e2e/`. The real tutorials (for example `examples/oauth-pkce`) may change editorially; E2E tests for framework behavior should not depend on those editorial changes.

### Public docs

Public author-facing docs live in `README.md` and `docs/`. `docs/features.md` is the one-page overview of every capability; `docs/authoring.md` is the how-to reference. Every feature commit updates both (features marked in progress there until they ship). The root README is the repository entry point; `packages/interactive-code-scroll/README.md` is the npm package entry point and should stay in sync at a high level.

`docs/quick-start.md` takes first-time authors from `npm create` to a published tutorial. It replaced the getting-started tutorial built with the tool (2026-09-30): a tutorial about writing tutorials was too recursive. Dogfooding happens through real-topic tutorials (`examples/rest-geocode`, `examples/oauth-pkce`).

---

## Coding style

- **Everything in the repo is in English**: code, comments, docs, commit messages, UI text. (Conversation with the user may be in Spanish.)
- TypeScript `strict`, no `any` (use `unknown` and narrow).
- ESM + named exports. No default exports, no CommonJS.
- No over-engineering: only what the task needs, no speculative abstractions.
- Minimal comments: only the non-obvious why.

### UI/UX workflow

Subjective visual changes need a user review loop before they are treated as final. Prefer showing a screenshot or concrete layout measurements from `fixtures/framework-fixture`, then adjust from feedback before broad validation, publishing or tagging.

**Step hierarchy rule.** The brand color and high-contrast blocks mark the active step and interactive affordances only (links, `<Hint>`, fields, focus). Decorative containers in the explanations (notes, code blocks, chips, `details`) stay neutral in inactive steps, so nothing outside the active step reads as "you are here". Do not dim inactive steps' text (WCAG 1.4.3 contrast, looks disabled though steps are clickable) or use `opacity`; avoid large luminance changes on step change (a block flipping dark/light while scrolling). Check each new prose element against this rule.

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
| UI rules | Calcite only. No inline styles. Style Calcite through its tokens, props and slots (host-level tokens/borders at most, never shadow internals); our CSS covers layout and our own content (MDX text, highlighted code). Where Calcite cannot meet a need, build our own element with Calcite tokens and record it in `docs/dev/research/calcite-gaps.md` (e.g. the tutorial header title). |
| Explore first | Before writing code for X, ask "what already exists for X?" and request existing code as a reference pattern. |
| Documentation | Check official Esri developer documentation before assuming ArcGIS APIs. |
| Off-limits | AMD modules, `watchUtils`, legacy widgets (in tutorial sample code). |

---

## Key technical patterns

### Tutorial code markup
- Regions: `// #region <id>` … `// #endregion` (HTML/CSS equivalents, plus shell/YAML-style `# #region` comments).
- Form variables: inline comment, e.g. `const clientId = "DEMO_ID"; // @var clientId`. The literal is the default (single source of truth). Number and boolean literals are vars too (`const days = 30; // @var days`); JSON files, which have no comments, use `<VarField json="config.json#/a/b">`.
- Source code must remain valid, runnable and lintable without the framework.
- Markers are stripped from rendered and downloaded code.
- `<Step file="...">` without `region` intentionally shows the whole file with no focus; text-only steps keep the current file visible but must clear any previous focused region.
- `<Intro>` is optional introduction content before the first step; it is not numbered, does not count as a step, and leaves the tutorial in a no-step state while it is at the top. Its `images`/`embed` (or, beside an otherwise empty right panel, the first step's media) show in the media panel while it is active; its `file` (`data-file`/`data-files` like a step) is shown, unfocused, by `clearActive()` once per visit.
- `<VarField placeholder="...">` changes only the input hint; the code literal remains the default value used when the field is empty.

### Preview
- Optional and configurable per tutorial: iframe, new tab, or both.
- Default mode: `both`.
- Iframe and tab both load a same-origin preview page (`preview/`) that renders the current files; iframe sandbox includes `allow-same-origin`. OAuth via popup (`OAuthInfo` with `popup: true`) + the tutorial's own `code/oauth-callback.html`, published at `preview/oauth-callback.html`.
- New tab: standalone page with current files; OAuth via regular redirect.

### Page layout (grid, not `calcite-shell`)
The page structure is our own CSS grid (`div.layout` > `div.docs-column` (`main.docs`, the scroll container, plus the Back / Next bar `nav.step-nav` pinned under it) + `div.gutter` + `aside.right`); Calcite provides the controls (`calcite-navigation`, actions, tabs, segmented control). Not a recorded upfront decision, but these requirements fit a plain grid better than `calcite-shell` / `calcite-shell-panel`:
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
- E2E coverage uses `fixtures/framework-fixture`, a dedicated fake tutorial that exercises framework cases and is not edited for content/design polish. New framework capabilities that should be protected from regressions should add a stable case there plus the corresponding E2E assertion.
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
| Calcite focus ring after a mouse click (Calcite 5.1.2) | `calcite-tab-title`: the host itself is focused, so `:focus:not(:focus-visible)` on the host hides the ring | `calcite-button`: the host delegates focus to its inner `<button>` and never matches `:focus-visible`; the same CSS also hides the keyboard ring | For buttons, mark pointer focus from JS (`data-pointer-focus` on `pointerdown`, cleared on `keydown`/`focusout`, see `client/family.ts`) and set `--calcite-color-focus: transparent` only under that attribute |
| Calcite focus ring color in E2E (Calcite 5.1.2) | Read right after the focus moves: `outline-color` may still be transparent or partly faded | Polled (`expect.poll`) until it settles | Calcite transitions `outline-color` (with other properties) over 0.15s on the shadow `.container`; a one-shot read failed 3 of 5 runs of the file tab focus ring E2E |
| Bordered `calcite-action` in a `calcite-input` `action` slot (Calcite 5.1.2) | Border on the action host with `box-sizing: border-box`: the inner `<button>` keeps its 32px min height (scale m) in the 30px content box and paints over the bottom border | `overflow: hidden` on the action host clips the button to its padding box | The secret `<VarField>` reveal toggle (`.var-field calcite-action[slot="action"]` in `tutorial.css`); `e2e/vars.spec.ts` guards it |
| OAuth redirect URI | GitHub Pages | localhost (served locally) | Both must be registered in the app by the author; the CLI prints the exact URIs |
| Pane state on load | `PREVIEW_STATE_EVENT` from the first `activate()` / `clearActive()`: missed by `startPreview` and `startResult` | Written directly to `.preview-frame` / `.result-frame` in `setPreviewState()` (`steps.ts`) | Both panes start after `startStepEngine()` in `index.astro`, so the initial step or intro state must also be applied to the DOM, not only dispatched (a deep link to a `preview="collapsed"` step once left the Result pane expanded) |
| `.gitignore` above a tutorial | A tutorial inside this monorepo: the root `.gitignore` applies to its `code/` (e.g. `.vscode/`, `dist/`) | A tutorial in its own repo, or a temp project with a `.git` marker | `gitignoreParents()` walks up to the nearest `.git`. Build tests that create tutorials under `test/fixtures/` add a `.git` folder so this repo's rules do not change their output (the root `.vscode/` rule once silenced an expected `code/.vscode/ is not published` warning). The `ignore` package is case-insensitive by default; `listCode()` passes `ignorecase: false` like git on Linux |
| Shiki themes of MDX code blocks | `satteri({...})` options: no `shikiConfig` (only plugins and `features`; TS error) | `mdx({ shikiConfig })`, or Astro `markdown.shikiConfig` (`extendMarkdownConfig`) | Astro fills `markdown.shikiConfig` with defaults (`theme: "github-dark"`, `themes: {}`), so "not customized" is detected by those values (`proseShikiConfig()` in `highlight.ts`). The fixture uses the built package: run `pnpm --filter interactive-code-scroll build` before checking its HTML |
| Boolean props on Calcite elements in `.astro` | `checked={false}` renders `checked="false"`, which Calcite reads as on | `checked={value || undefined}` omits the attribute | Made every `<VarField>` switch start on |
| MDX component props needed by the page | Read from the MDX at render time: too late, `index.astro` parses and highlights `code/` before `<Content />` renders | The MDX validation plugin writes them into `ctx.data.astro.frontmatter` (e.g. `JSON_VARS_KEY`, `STEP_FILES_KEY`), which the MDX module exports as `frontmatter`; verified in build and dev | Used by `<VarField json>`; parse `code/` with `jsonVarsOf(frontmatter)` everywhere (`parsedFiles(files, jsonVars)`) or JSON vars go missing |
| Clicking a control in E2E | `locator.click()` on an off-screen element: Playwright scrolls the docs panel first, and once a click's `keyTarget` timer (1.5 s) ends, that scroll activates the step crossing the center line | `locator.dispatchEvent("click")`, or bring the element into view before the assertions start | Made "clicking a step activates it" (`e2e/step-engine.spec.ts`) fail at random with an unexpected `#step` hash |
| Keys inside widgets vs step keys | `stopPropagation()` in a widget's own `keydown` handler: does not help | `data-own-keys` on the widget (or an ancestor): step keys ignored | The step key listener runs on `window` in the capture phase, before any widget handler; `data-own-keys` owns arrow keys only: PageUp/PageDown (clickers) still move steps (`movesStep()` in `navigation.ts`) |
| Small images in E2E | Large files: `src` is a hashed URL (`/_astro/logo.123.svg`) | Small SVGs/PNGs under Vite's inline limit: `src` is a `data:` URL | Assert logos by file name *or* content (e.g. the SVG's fill color, `%23e8a317`); a file-name-only regex fails (the new series logo tests once did). Step/intro images carry the file name as `alt`: assert on `alt`, not `src` (the intro media tests once did) |
| Calcite `calcite-tab-title` keyboard | Arrow keys: move the focus between tabs only | Enter/Space: select the focused tab | Manual activation; E2E must press Enter after the arrow before asserting `selected` |
| Preview `redirect_uri` | `srcdoc` / blob iframe: SDK builds it from `location` → `about://null/oauth-callback.html` (`<base href>` ignored) | Real same-origin preview page: correct URI | Preview (iframe and tab) must load a real URL; `oauth-callback.html` must sit next to that page |
| Preview sandbox | Without `allow-same-origin`: opaque origin, no Referer (OSM tiles 403, referrer-restricted API keys fail), callback cannot reach `window.opener` | With `allow-same-origin`: works | Preview can read the tutorial's `localStorage` (author-trusted code) |
| Keyboard step navigation | Focus in page: works | Focus inside Preview iframe: keys go to the map | Forward keys from the preview page (same origin) |
| Short / first steps | Center-line trigger: a step shorter than the gap between two others, or one above the center line at scroll top, never becomes active by scrolling | — | Click-to-activate and "top of the panel → first step", the latter only for user scrolling (a key scroll to an early step also ends at the top). The tail below the last step is computed (half the panel minus half the step), not a fixed 60vh |
| Esc in presentation mode | Browser full screen: the browser takes Esc to leave full screen, the page gets no `keydown` | Full screen refused or not used: the page gets Esc | One level per Esc: `fullscreenchange` leaves presentation mode and a maximized pane stays until the next Esc. `client/maximize.ts` starts before `presentation.ts` and stops Esc while a pane is maximized |
| `calcite-dialog` | Esc closes it while focus is inside | Focus outside (e.g. opened from a click that keeps focus on the page): Esc does nothing | Handle Esc ourselves too; `heading` is a property (not reflected): assert with `toHaveJSProperty` |
| `#step-id` deep link | Native fragment scroll aligns the step top; `scrollIntoView({ block: "center" })` also honours `scroll-margin`, so a short step lands below the center line | Trigger line is the docs panel center | No `scroll-margin` on steps; the engine centers the step itself (on load and on `hashchange`); on load a `ResizeObserver` keeps it centered while the layout settles, until user input (wheel, touch, pointer, key) |
| Astro 7 + pnpm build | Prerender bundle externalizes `cookie`; pnpm does not hoist it | Node resolves a stray copy up the tree (e.g. `~/node_modules`) → CJS import error | `vite.environments.prerender.resolve.noExternal: ["cookie"]` (core integration; `site/astro.config.mjs` repeats it, since the site does not use the integration) |
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
| npm publish `E404 Not Found` on `PUT` | Trusted publishing configured and valid: publishes | Expired trusted publishing setup on npmjs.com (seen for `create-interactive-code-scroll`, 0.2.0-beta.1) | The 404 hides an auth failure. Renew it in the package's Settings → Trusted publishing (GitHub Actions, `hhkaos/interactive-code-scroll`, `publish-npm.yml`, environment `npm-publish`, "Allow npm publish"), then re-run the workflow: versions already on npm are skipped. Older `gh` has no `rerun --failed`; `gh run rerun <id>` is safe |
| Shiki line layout | `.line` as `inline-block` inside `<pre>` | `.line` as `block` inside `<pre>` | Block line spans can make Shiki's inter-line text nodes render as extra vertical spacing; keep lines inline-level and assert adjacent line spacing in E2E |
| MDX frontmatter in Sätteri plugins | `ctx.source` has the frontmatter blanked out (lines kept) | Astro parses it first and seeds `ctx.data.astro.frontmatter` | Read the parsed object from `ctx.data`; get key line numbers from the file on disk (`frontmatterKeyLines`) |
| MDX plugins (Astro 7) | `remarkPlugins` on `@astrojs/mdx`: deprecated | Default processor is Sätteri: use `mdastPlugins` (`satteri` 0.x, API may change) | Astro does not surface Sätteri `report()` diagnostics: throw instead |
| Moving nodes in a Sätteri mdast plugin | `ctx.replaceNode(node, { children: [node, sibling] })` plus `ctx.removeNode(sibling)` | Existing nodes passed as children are references: the removed sibling is dropped from the new parent | Pass plain copies (`JSON.parse(JSON.stringify(child))`; MDX expression attributes survive) and remove the originals (`var-field-groups.ts`) |
| `astro dev` / `astro preview` (v7) | Human terminal: foreground | AI agent detected (`AI_AGENT` env): auto-backgrounds and returns | Use `--ignore-lock` to stay in the foreground (Playwright `webServer`); otherwise `astro dev stop` / `astro dev logs` |
| `astro dev()` under Vitest | `process.env.VITEST` set: Astro skips its dev request handler (every page 404 "Cannot GET"); `NODE_ENV=test`: Astro sets `server.hmr: false`, so no `hotUpdate` hooks run | Unset `VITEST` and set `NODE_ENV=development` around `dev()`, then restore | See `test/dev.test.ts`; overlay errors reach the browser over the HMR socket (`?token=` from `/@vite/client`) 200 ms after the 500 response |
| `calcite-carousel` selection | Setting `selected` on a `calcite-carousel-item` after creation: ignored (two items end up `selected`, the view does not move) | `selected` present when items are created: honoured | Public API has no next/select method; re-create the carousel with the wanted item `selected`; read the carousel's `selectedItem` (not items' flags) |
| Calcite runtime assets | Online: components wait for t9n JSON from `js.arcgis.com` before first render (~1 s, more under load) | Offline / CDN blocked: render once the fetch fails, but no icons or translated labels | Matters for the "serve locally" plan B; tests block the CDN (`e2e/fixtures.ts`). Neither `customElements.whenDefined` nor `componentOnReady()` guarantees final layout online: observe sizes instead (`ResizeObserver`) |
| Calcite mode classes | `calcite-mode-light` / `-dark` set Calcite tokens | They do not set `color-scheme` | Set it ourselves: `light-dark()` (Shiki colors) and native scrollbars follow the nearest mode class (the code panel's own class) |
| Local servers on fixture ports | Fresh `astro preview` of a just-built fixture | An older `astro dev` left running (e.g. from an earlier session) keeps the port and serves a stale virtual module (e.g. `outputs` undefined → 500 in `index.astro`) | Before manual checks or screenshots, run `lsof -nP -iTCP -sTCP:LISTEN` and use a free port; `astro preview` silently moves to the next port when one is taken. Do not kill servers you did not start |
| `calcite-input` `action` slot | Slotted `calcite-action` renders next to the field without a border | Reads as a separate button | Give the action host the input border token (`--calcite-color-border-input`), no start border |
| Stray `~/node_modules` | `tsc` and Node resolve packages up the tree, outside the repo (`@types/node`, `cookie`) | Fresh clone / CI: missing | Declare what we use (`@types/node` dev dependency); validate with a clean worktree outside the home folder |
| Site demo iframe (same origin) | The embedded tutorial reads `ics:theme` from the same localStorage as the landing page; clicking its `#theme-toggle` from the parent leaves a Calcite tooltip open | Tooltip visible over the demo | Write `ics:theme` before the lazy iframe loads and reload the iframe on theme change (`DemoFrame.astro`) |
| `astro dev` + folders in `public/` | Dev does not serve `index.html` for folder URLs (`astro preview` and Pages do), and `req.url` reaches `astro:server:setup` middleware with the base already stripped; a Vite `configureServer` plugin in `astro.config` never ran | `<base>showcase/<name>/` 404s in `pnpm site` only; E2E (preview) passes | `publicFolderIndex()` integration in `site/astro.config.mjs` rewrites folder URLs with an `index.html` in `public/` |
| Starlight 0.42 + Astro 7 Markdown | Astro 7's default processor is Sätteri: `markdown.remarkPlugins` do not run on it; Starlight's asides/heading anchors only apply under `src/content/docs/` | Plugins silently skipped for `docs/*.md` (outside `site/`) | `docsMarkdown()` in `site/docs-config.mjs` pushes a Sätteri mdast plugin into `config.markdown.processor.options.mdastPlugins` (as Starlight does); `markdown.processedDirs: [docsDir]` enables Starlight's transforms |
| Starlight theme | Stores `starlight-theme` (`auto`/`dark`/`light`), OS preference by default | Would not share the landing/tutorial `ics:theme` choice | `site/src/components/docs/ThemeProvider.astro` + `ThemeSelect.astro` overrides (keep a `window.StarlightThemeProvider.updatePickers` stub); `docs.css` redefines `--sl-color-*` for `:root[data-theme]` unlayered so it beats Starlight's light block |
| Content layer cache (`site/`) | `site/.astro/data-store.json` keeps each docs file's rendered HTML and only invalidates it when the file's content changes; editing a Markdown transform in `site/docs-config.mjs` does not invalidate it | `pnpm site` serves the old HTML (e.g. an unrewritten `<picture>` → 404 on `docs/site/public/…`) while build/E2E are correct | After changing the docs transforms: stop dev, `rm site/.astro/data-store.json`, restart |
| Preview theme | Iframe: `prefers-color-scheme` inside follows the `<iframe>` element's `color-scheme` (verified in Chromium) | New tab: follows the OS | Tutorial apps opt in with `calcite-mode-auto`; the framework never rewrites tutorial code. E2E: Playwright emulates `colorScheme: "light"` by default and forces it on every frame; use `colorScheme: null` to observe this |
| ArcGIS REST error responses | Many endpoints answer HTTP 200 with `{ "error": { "code", "message", "details" } }` in the body (e.g. 498 invalid token) | Transport failures (network, CORS) have no body at all | Request runner must not judge success by HTTP status alone: use the declarative error rule (planned); keep ArcGIS rule/codes in the preset, not core |
| Runner `fetch` and Playwright mocks | A cross-origin `page.route().fulfill()` without `Access-Control-Allow-Origin` fails as a network error; a POST with `Content-Type: application/json` also sends an `OPTIONS` preflight to the same route; `new Request()` throws a `TypeError` for a body on GET/HEAD (same type as network errors) | Same-origin fetches need no CORS headers | Mocks answer `OPTIONS` with 204 and send CORS headers (`e2e/result.spec.ts`); `result.ts` builds the `Request` before `fetch` so build errors are not reported as network failures |
| Playwright context vs page routes | `page.route()` handlers run before `context.route()` handlers for the same URL | Without a page route, the context route (abort) wins | `e2e/fixtures.ts` aborts every non-local host at context level; tests mock services with `page.route` (`mockService()`), so an unmocked call fails as a network error instead of reaching the real service |
| `calcite-action` `indicator` | Online: renders the dot | Offline / CDN blocked (t9n not loaded): render throws (`messages.indicatorLabel` undefined, `messageOverrides` does not help) and the action collapses to 0 px | Do not use `indicator` (it has no count either); draw our own badge on a wrapper element (`.zip-action`) |
| Astro attributes on custom elements | `hidden={false}` / `selected={false}` on a native element: attribute omitted | On a custom element (e.g. `calcite-tab-nav`): serialized as the string `"false"`, so `hidden="false"` hides it | Write `attr={condition \|\| undefined}` |
| Calcite sizes late | Measuring a Calcite container once (or observing only it) on load | Its children (`calcite-tab-title`, `calcite-segmented-control`) grow after they render, while the container keeps its size | Observe the children too (`ResizeObserver`); see `client/variants.ts` |
| Calcite before hydration | `main.css` hides unhydrated components with `visibility: hidden`: invisible, but they keep their light-DOM size (`calcite-navigation` 0 px instead of 65, `calcite-dialog` 672 px in the flow) | Sizes reserved in `tutorial.css` ("Before Calcite hydrates") with `:where()` rules on `:not([calcite-hydrated])`: hydrated size, or `display: none` for overlays | Measured CLS 0.188 → 0. Keep the rules at zero specificity (a plain selector beat `.media-restore { display: none }`). E2E compares the page with scripts disabled to the hydrated one; update the sizes when a component's scale or slot changes |
| CSS imported from a `<script>` | `astro build`: extracted to a `<link>` in `<head>` | `astro dev`: injected by JS after the module graph loads, so the page paints without Calcite tokens (Times font, no colors) | Import stylesheets the first paint needs (Calcite `main.css`) in the page or component frontmatter |
| Calcite props in React 19 | Set as DOM properties (e.g. `label`) | Not reflected as attributes | E2E selectors must not rely on those attributes |
| Per-tutorial context for MDX components (Astro 7) | Values set on `Astro.locals` in a page's frontmatter: visible to MDX components that page renders (`<Content components>`), one value per route in a static build | A module-level "current tutorial" variable: shared by every route, unsafe if pages render concurrently (not verified) | Series sites use `setCurrentTutorial()`/`currentTutorial()` (`src/tutorial-data.ts`). A static route (`/`) may export `getStaticPaths` (returning `[{ params: {} }]`) without warning, so one entrypoint serves both `/` and `/[tutorial]` |
| `.astro` imports in package TypeScript (`tsc`, TS 6) | `astro/client` declares no `*.astro` module: `export { default } from "./X.astro"` fails with TS2307 and the package build stops | Ambient `declare module "*.astro"` in `src/virtual.d.ts`; Astro's tooling (`astro check`, editors) still resolves the real component and its `Props` first | `src/series-public.ts` re-exports `TutorialList`/`TutorialFilter`; the emitted `.d.ts` keeps the `.astro` specifiers |
| Astro pages and `<meta charset>` | Astro does not add a charset: a page without `<meta charset="utf-8" />` is decoded as Windows-1252, so `—` shows as `â€”` | Every example `.astro` page (docs, tests, fixtures) includes `<meta charset="utf-8" />` | Seen in the custom series index example (`docs/authoring.md`); the injected pages already have it |
| `import.meta.env.BASE_URL` in Astro pages | Build with a `BASE_URL` environment variable (Vitest sets `BASE_URL=/`): pages read the variable, while Astro's own asset URLs keep `config.base`, so links and `clientData.base` lose the base | Framework code reads `base` from the virtual module (`config.base` captured in `astro:config:done`), never `import.meta.env.BASE_URL` | Found by `test/pages.test.ts`; the test sets `BASE_URL` explicitly to guard it |
| `calcite-navigation-logo` with `description` on phones | Default: the navigation slot does not constrain the logo; the heading/description do not ellipsize and widen the page (414 px at 390 px) | `max-width` + `overflow: hidden` on the logo host: no page overflow, text clipped (no ellipsis) | `styles/series.css`; E2E guards the index at 390 px. Tutorial headers have no description, so they are unaffected so far |
| `ch` widths on Calcite form hosts | `calcite-combobox` sets `font-size: var(--calcite-font-size--1)` (14 px) on its host, and `ch` resolves against the element's own font: a shared `max-width: 70ch` made the combobox ~13% narrower than the select next to it | Size form fields from their container (grid columns, `rem`), never `ch` on the field itself | `styles/tutorial.css` (`.var-fields`); E2E in `e2e/tutorial-page.spec.ts` compares combobox and select widths |
| Folder URLs of `embeds/` | Built site / static hosts: `embeds/<folder>/` serves its `index.html` | `astro dev`: only declared routes exist | `embed-file.ts` adds a `<folder>` route per `index.html` in dev only (in a build it would write the same file twice) |
| A Slidev build in `embeds/` | `astro build`: published as is | `astro check`: type-checks the bundled JS (hundreds of warnings) | Exclude it: `"exclude": ["dist", "**/embeds/**"]` in the project `tsconfig.json` (done in `fixtures/framework-fixture`; documented for authors) |
| VHS `Wait+Screen` | Output fits the terminal: matches anywhere on screen | Output has scrolled: only the first rows are read, later text never matches | `site/recordings/start.tape` waits on the prompt line (`Wait /^\$ *$/`) or uses `Sleep` once the wizard output scrolls |
| `astro dev` under an AI agent | Normal terminal: foreground server with the `Local` banner | `AI_AGENT` / `CLAUDE*` variables set: starts in the background, prints one JSON line and returns the prompt; the server outlives the command and blocks the next `astro dev` of the project ("Another astro dev server is already running") | The tape unsets them in its hidden setup, so `pnpm record` also works when an agent runs it. Agents that start `pnpm site`/`pnpm dev` stop it when done (`astro dev stop`, or `kill` the PID the error prints) and check `pgrep -fl "astro.mjs dev"` |
| `#step` in a same-origin iframe | Top-level page or cross-origin iframe: only the tutorial scrolls | Same-origin iframe (landing live demo): native fragment scrolling also scrolls the parent page (~1200 px on load and on each theme reload) | `DemoFrame.astro` loads the iframe without the hash and, after `load`, sets it with `history.replaceState` and dispatches `hashchange` (the tutorial's handler scrolls only its own panel). E2E guards `scrollY` |
| VHS `Screenshot` as the last command | Followed by more frames: PNG written | Last command: sometimes no PNG (it is written with the next frame) | Keep a `Sleep` after `Screenshot` |
| `calcite-chip` selection | `selection-mode="single"`: icon only when selected | `selection-mode="multiple"`: always draws a checkbox (empty square when off); no prop or CSS hook removes it | Series tag toggles are plain `<button aria-pressed>` pills, not chips |
| `calcite-autocomplete` | Items' `heading` / `description`: properties, not reflected (`toHaveAttribute` fails; use `toHaveJSProperty`) | Typed text is highlighted in both heading and description | The app filters and appends items itself (`calciteAutocompleteTextInput`); put extra info in the item's `content-end` slot to keep it unhighlighted. First Escape closes the menu, the next clears the text (one Escape when no menu) |
| Calcite element created in JS | Attributes (`setAttribute("value", …)`) before connecting: kept and selectable by `[value]` | Properties set before connecting (`chip.value = …`, `chip.selected = true`): no attribute, so `[value]` selectors miss the element (a chip built this way was not found and was dropped on the next render) | Set attributes on elements built in the client before appending them |
| Series card links | `index.mdx` prose links: `.series-content a:not(.series-card a)` in `series.css` paints them `--calcite-color-text-link` | Card links (stretched title link, variant links): keep the card's text color, set in `series-list.css` | The prose rule once excluded `a.series-card` (the card was the link); when the card became an `<article>` it turned every title and variant link blue. Re-check the exclusion whenever the card markup changes (`e2e/series.spec.ts` compares the card, title and variant link colors) Cards outside `.series-list` (the `<TutorialFavorites>` section) must stay excluded: the rule keyed on `.series-list` once painted their titles link blue |
| `calcite-navigation-logo` long `heading` | Its shadow `.heading` has `text-overflow: ellipsis` | The host keeps the text's full width inside `calcite-navigation` (no `min-width: 0` reaches the shadow wrapper), so a long title pushes the sibling switcher and header actions off a phone screen, with no "…"; `description` cannot hold a control or be aligned | Tutorial pages use our own `div.page-title` (img + `h1`) in the `logo` slot; `startHeaderTitle()` in `client/layout.ts` caps it to the room the other slots leave (`titleRoom`) and the `h1` ellipsizes. Fixed `max-width` values break as soon as a series adds the home action or the sibling switcher. All Calcite gaps: `docs/dev/research/calcite-gaps.md` |
| `calcite-dropdown` opened from another element | Setting `open = true` in that element's click handler | Calcite closes the menu on the same click (it counts as an outside click) | Open it in the next animation frame (`client/layout.ts`, title tap on phones) |
| `calcite-navigation` children | Children in one of its slots render | A child with no `slot` (e.g. a `calcite-popover` placed inside the header) is never rendered: the component has no default slot | Put popovers and other floating elements after `</calcite-navigation>` |
| Empty or hidden `calcite-dropdown-group` | — | Calcite still draws the separator above the next group, so a `display: none` group leaves a stray line at the top of the menu | Insert the group only while needed (`client/layout.ts` adds the full-title group of the sibling menu when the title is clipped) |
| New `.astro` component in the package | Workspace (dev, fixtures, E2E): imported from `src/`, works | Published package (`pnpm test:pack`): `dist/` holds only the files listed in `scripts/build-package.mjs`, so the page fails with `Could not resolve '../components/X.astro'` | Add every new `.astro` file (and its `rewriteAstroImports` call) to `scripts/build-package.mjs`; only the smoke-pack test catches a missing one (`<Outro>`, 2026-10-16) |
| Raw `<tag>` text in public docs | GitHub renders an unknown or stray tag in `docs/*.md` prose as text or drops it | The website (`site/`, Starlight) passes it through as HTML: a bare `<title>` became a `<title>` element and swallowed the rest of `authoring.md` (2026-10-16, caught by `e2e/site.spec.ts`) | Put tag-like placeholders in backticks (`` `<title>` ``) or reword them |
| `calcite-icon` in full-page screenshots | In or near the viewport: the icon loads | Off-screen at capture time: never fetched (lazy), so `fullPage` screenshots show empty boxes below the fold | Scroll through the page (and wait) before a full-page screenshot for review |

---

## Deployment

- GitHub Pages via GitHub Actions, on push to `main` or `master` (`publish-site.yml`): the project website `site/` at `https://www.rauljimenez.info/interactive-code-scroll/` (the owner's Pages custom domain). The showcase tutorials are built into `site/public/showcase/<name>/` (ignored) by `site/scripts/build-showcase.mjs` with base `<base>showcase/<name>/`, then Astro copies them into `site/dist/`.
- `site`/`base` from `actions/configure-pages` outputs (`origin`, `base_path`); repo variables `ICS_SITE` (origin, no trailing path) and `ICS_BASE` override them.
- Author repos: copy-paste workflows (npm and pnpm) in `docs/deployment.md`, the same file for a single tutorial or a series. `test/pages.test.ts` keeps the two flavors in sync (they may differ only in package manager commands) and builds the series fixture through the CLI with `--base /repo/`, failing on any root-absolute URL without the base.
- npm releases (`publish-npm.yml`, on `v*` tags): both packages at the same version (checked against the tag), core first, then `create-interactive-code-scroll`; `*-alpha*` → dist-tag `alpha`, anything else → `latest`. Trusted publishing (OIDC, environment `npm-publish`) needs a trusted publisher per package on npmjs.com; a new package's first publish is manual.
- CI (`ci.yml`): unit tests, `pnpm check` and E2E on every push to `main` (not on pull requests); Playwright report uploaded on failure.

---

## Git conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…), in English.
- Commit as you go: after each feature (or meaningful sub-step) is implemented and its tests pass, commit it.
- `TODO.md` holds **pending** tasks only. When a task is done, remove it from `TODO.md` and add an entry to `CHANGELOG.md` under `## [Unreleased]` in the same commit.
- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) (Added / Changed / Fixed / Removed).
- Never commit secrets: `.env`, real Client IDs, API keys. Tutorials use demo values only.
