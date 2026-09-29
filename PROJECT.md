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

Phase 1 plan-mode pass is done: its rules are in `SPEC.md` (commit `f4f303a`) and its task order in `TODO.md` (1a → 7).

Recommended next task: **1a Variants config + validation** (`src/frontmatter.ts`, `src/validate.ts`, `src/visible-files.ts`; Vitest only, no UI).

Working notes:
- Try features by hand in `examples/multi-sdk-playground` (`pnpm playground`); regressions go in `examples/framework-fixture` + `e2e/`.
- UI changes: show screenshots before committing. Save them under `screenshots/` (git-ignored) so the user can open them from the IDE; the scratchpad is not reachable for them, and Playwright empties `test-results/` on every E2E run. Never delete screenshots the user has been asked to review. Phase 1 UI follows the approved mockup (https://claude.ai/artifact/MQMZJaG3RrP5aukBk8k1HF).
- Dev-server behavior (HMR, revalidation, overlay) is covered by `packages/interactive-code-scroll/test/dev.test.ts`; running `astro dev()` under Vitest needs the env overrides in the Known issues table.
- Full E2E was green (61/61) at `c559d8c`; `e2e/step-engine.spec.ts:73` was seen flaky once under parallel load.

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
docs/authoring.md  # public authoring/API reference for tutorial writers
docs/cli.md        # public CLI reference
docs/deployment.md # GitHub Pages/static hosting notes, including getting-started URL variables
docs/upgrade.md    # public upgrade guide for alpha authors
packages/interactive-code-scroll/  # core package: Astro integration
  bin/interactive-code-scroll.mjs   # generic CLI: dev, build, serve, doctor, init-scripts
  scripts/build-package.mjs         # package build: compiles TS and copies Astro/CSS assets
  dist/                             # generated package output (ignored; built by prepack)
  src/index.ts                     # interactiveCodeScroll() integration (MDX + Sätteri validation, injects /)
  src/tutorial-files.ts            # reads tutorial.mdx, code/**, images/**
  src/tutorial-module.ts           # virtual:interactive-code-scroll/tutorial (Content, frontmatter, files, images) + dev revalidation hook
  src/markers.ts                   # #region / @var parser + applyVars
  src/validate.ts                  # reference validation (pure)
  src/mdx-validation.ts            # Sätteri mdast plugin that runs validate.ts with MDX positions
  src/highlight.ts                 # Shiki build-time highlighting
  src/frontmatter.ts               # title / preview config
  src/downloads.ts                 # project files with values applied, ZIP (fflate)
  src/components/                  # Step.astro, VarField.astro
  src/client/                      # browser runtime: calcite.ts, steps.ts + navigation.ts (step engine), vars.ts + var-values.ts (form → code), layout.ts + layout-values.ts (theme, splitter), presentation.ts, preview.ts, downloads.ts
  src/pages/index.astro            # injected tutorial page
  src/preview/                     # preview page, code/ files published under preview/, HTML builder
  test/                            # Astro build + dev-server (revalidation, overlay loc) integration tests + fixtures
examples/oauth-pkce/               # example project: astro.config.mjs + tutorial/ (tutorial.mdx, code/, images/)
examples/framework-fixture/        # stable fake tutorial for framework E2E coverage; do not edit for content polish
examples/framework-fixture-variants/      # stable fake tutorial with code variants (`notice` mode); E2E in e2e/variants.spec.ts
examples/framework-fixture-variants-hide/ # same, with `otherVariantSteps: hide`; E2E in e2e/variants-hide.spec.ts
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
| MDX components | build | `<Intro>`, `<Step id file region images>`, `<VarField name label placeholder secret persist>` render static HTML |
| Client runtime | browser | IntersectionObserver (center line of the docs panel) + keyboard + click on a step + top of the panel (first step) → activate step (file, focus lines revealed with `revealScroll`, carousel, hash, progress); var inputs → swap `textContent` of `[data-var]` spans + `localStorage` |
| Page shell | browser | `calcite-navigation` header (explanations toggle, title, step count, present, theme, `calcite-progress`); explanations scroll in their own panel (the page never scrolls); the whole page follows one Calcite mode (`theme` frontmatter default, viewer toggle wins); the explanations handle sits on the docs/code splitter (a rail when hidden); a second splitter sizes the Preview; the right panel has header bars for code (file tabs, copy, downloads) and preview (collapse, Run, open in tab) |
| Preview page | browser | `preview/` page `document.write`s the assembled HTML (local scripts/styles inlined) from `localStorage`; used by iframe and new tab. Every other `code/` file is published at `preview/<path>` (e.g. the tutorial's `oauth-callback.html`) |
| CLI | Node | Generates a temporary Astro config for the selected tutorial folder and runs Astro `dev`, `build` or `preview` (`serve`) with generic options only. `doctor` reports root/package-manager/Astro/tutorial detection, and `init-scripts` can add optional package scripts without overwriting existing ones. OAuth/provider help stays outside the core path unless explicitly configured later. |
| Package build | Node | `pnpm --filter interactive-code-scroll build` compiles TS to `dist`, copies `.astro`/CSS assets, rewrites internal imports to built `.js`, and emits a packaged CLI that resolves Astro from the consuming project first. `prepack` runs this before tarball creation. |

### Data flow

MDX + annotated code + images → build (validates references; fails on broken IDs) → static site → scroll/keyboard activates a step → right panel action (highlight region / switch file / show images) · form → client-side variable substitution → re-rendered code + Preview (iframe / new tab) + download.

### Framework fixture

`examples/framework-fixture` is the stable regression fixture for framework behavior. It is intentionally fake product content and must not be edited for tutorial narrative/design polish.

When adding or changing framework behavior, update this fixture to include the new case whenever the behavior is observable through a tutorial, and add or adjust the corresponding Playwright assertions in `e2e/`. The real tutorials (for example `examples/oauth-pkce`) may change editorially; E2E tests for framework behavior should not depend on those editorial changes.

### Public docs and dogfooding tutorial

Public author-facing docs live in `README.md` and `docs/`. The root README is the repository entry point; `packages/interactive-code-scroll/README.md` is the npm package entry point and should stay in sync at a high level.

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
- Overriding Calcite styles by reaching into components (`::part` hacks, `!important`, shadow selectors); use tokens, props and slots.

---

## Known issues / differences

| Feature | Context A | Context B | Notes |
|---|---|---|---|
| ArcGIS OAuth sign-in | Inside iframe: expected to be blocked (X-Frame-Options) — **unverified** | Popup from the Preview iframe: **verified** (PKCE S256, real Client ID) | The SDK shows its own "Please sign in" dialog first: the popup needs a user gesture |
| OAuth redirect URI | GitHub Pages | localhost (served locally) | Both must be registered in the app by the author; the CLI prints the exact URIs |
| Preview `redirect_uri` | `srcdoc` / blob iframe: SDK builds it from `location` → `about://null/oauth-callback.html` (`<base href>` ignored) | Real same-origin preview page: correct URI | Preview (iframe and tab) must load a real URL; `oauth-callback.html` must sit next to that page |
| Preview sandbox | Without `allow-same-origin`: opaque origin, no Referer (OSM tiles 403, referrer-restricted API keys fail), callback cannot reach `window.opener` | With `allow-same-origin`: works | Preview can read the tutorial's `localStorage` (author-trusted code) |
| Keyboard step navigation | Focus in page: works | Focus inside Preview iframe: keys go to the map | Forward keys from the preview page (same origin) |
| Short / first steps | Center-line trigger: a step shorter than the gap between two others, or one above the center line at scroll top, never becomes active by scrolling | — | Click-to-activate and "top of the panel → first step", the latter only for user scrolling (a key scroll to an early step also ends at the top). The tail below the last step is computed (half the panel minus half the step), not a fixed 60vh |
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
| npm trusted publishing provenance | Missing or mismatched package `repository.url` | URL matching the GitHub provenance repository | Publish can fail with E422; npm may normalize the URL to `git+https://github.com/<owner>/<repo>.git` |
| Shiki line layout | `.line` as `inline-block` inside `<pre>` | `.line` as `block` inside `<pre>` | Block line spans can make Shiki's inter-line text nodes render as extra vertical spacing; keep lines inline-level and assert adjacent line spacing in E2E |
| MDX frontmatter in Sätteri plugins | `ctx.source` has the frontmatter blanked out (lines kept) | Astro parses it first and seeds `ctx.data.astro.frontmatter` | Read the parsed object from `ctx.data`; get key line numbers from the file on disk (`frontmatterKeyLines`) |
| MDX plugins (Astro 7) | `remarkPlugins` on `@astrojs/mdx`: deprecated | Default processor is Sätteri: use `mdastPlugins` (`satteri` 0.x, API may change) | Astro does not surface Sätteri `report()` diagnostics: throw instead |
| `astro dev` / `astro preview` (v7) | Human terminal: foreground | AI agent detected (`AI_AGENT` env): auto-backgrounds and returns | Use `--ignore-lock` to stay in the foreground (Playwright `webServer`); otherwise `astro dev stop` / `astro dev logs` |
| `astro dev()` under Vitest | `process.env.VITEST` set: Astro skips its dev request handler (every page 404 "Cannot GET"); `NODE_ENV=test`: Astro sets `server.hmr: false`, so no `hotUpdate` hooks run | Unset `VITEST` and set `NODE_ENV=development` around `dev()`, then restore | See `test/dev.test.ts`; overlay errors reach the browser over the HMR socket (`?token=` from `/@vite/client`) 200 ms after the 500 response |
| `calcite-carousel` selection | Setting `selected` on a `calcite-carousel-item` after creation: ignored (two items end up `selected`, the view does not move) | `selected` present when items are created: honoured | Public API has no next/select method; re-create the carousel with the wanted item `selected`; read the carousel's `selectedItem` (not items' flags) |
| Calcite runtime assets | Online: components wait for t9n JSON from `js.arcgis.com` before first render (~1 s, more under load) | Offline / CDN blocked: render once the fetch fails, but no icons or translated labels | Matters for the "serve locally" plan B; tests block the CDN (`e2e/fixtures.ts`). Neither `customElements.whenDefined` nor `componentOnReady()` guarantees final layout online: observe sizes instead (`ResizeObserver`) |
| Calcite mode classes | `calcite-mode-light` / `-dark` set Calcite tokens | They do not set `color-scheme` | Set it ourselves: `light-dark()` (Shiki colors) and native scrollbars follow the nearest mode class (the code panel's own class) |
| `calcite-input` `action` slot | Slotted `calcite-action` renders next to the field without a border | Reads as a separate button | Give the action host the input border token (`--calcite-color-border-input`), no start border |
| Stray `~/node_modules` | `tsc` and Node resolve packages up the tree, outside the repo (`@types/node`, `cookie`) | Fresh clone / CI: missing | Declare what we use (`@types/node` dev dependency); validate with a clean worktree outside the home folder |
| Preview theme | Iframe: `prefers-color-scheme` inside follows the `<iframe>` element's `color-scheme` (verified in Chromium) | New tab: follows the OS | Tutorial apps opt in with `calcite-mode-auto`; the framework never rewrites tutorial code. E2E: Playwright emulates `colorScheme: "light"` by default and forces it on every frame; use `colorScheme: null` to observe this |
| ArcGIS REST error responses | Many endpoints answer HTTP 200 with `{ "error": { "code", "message", "details" } }` in the body (e.g. 498 invalid token) | Transport failures (network, CORS) have no body at all | Request runner must not judge success by HTTP status alone: use the declarative error rule (planned); keep ArcGIS rule/codes in the preset, not core |
| `calcite-action` `indicator` | Online: renders the dot | Offline / CDN blocked (t9n not loaded): render throws (`messages.indicatorLabel` undefined, `messageOverrides` does not help) and the action collapses to 0 px | Do not use `indicator` (it has no count either); draw our own badge on a wrapper element (`.zip-action`) |
| Astro attributes on custom elements | `hidden={false}` / `selected={false}` on a native element: attribute omitted | On a custom element (e.g. `calcite-tab-nav`): serialized as the string `"false"`, so `hidden="false"` hides it | Write `attr={condition \|\| undefined}` |
| Calcite sizes late | Measuring a Calcite container once (or observing only it) on load | Its children (`calcite-tab-title`, `calcite-segmented-control`) grow after they render, while the container keeps its size | Observe the children too (`ResizeObserver`); see `client/variants.ts` |
| Calcite props in React 19 | Set as DOM properties (e.g. `label`) | Not reflected as attributes | E2E selectors must not rely on those attributes |

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
