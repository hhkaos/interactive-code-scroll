# InteractiveCodeScroll

> A framework for technical writers, devrels and speakers to build guided, interactive code tutorials (in the style of the Stripe Checkout quickstart) by writing MDX and annotating source code.

This file is the shared AI context for this project. It is read by all AI coding agents.
Agent-specific behaviour rules live in each agent's own file (CLAUDE.md, AGENTS.md).

> Requirements source of truth: `SPEC.md`. This file covers **how to work** in the project — not what to build.

---

## What this project is

A framework that turns a tutorial folder (MDX + code + images) into an interactive static website: documentation on the left, code on the right, synchronized by scroll/keyboard (region highlighting, file switching, images), with forms that update code variables, an optional Preview (iframe and/or new tab), downloads and a presentation mode. Built for projecting at conferences and for reproducing at home. Desktop-first. Published on GitHub Pages.

Status: in development. Base: Astro + MDX + Shiki; spike findings in `spike/FINDINGS.md`.

---

## Commands

Package manager: **pnpm**. From the repo root:

```sh
pnpm install
pnpm dev          # example tutorial (examples/oauth-pkce) in dev mode
pnpm build        # build the example
pnpm check        # tsc (core package) + astro check (example)
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright: builds the example and serves it on :4400
```


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
.mcp.json           # MCP servers for Claude Code (Esri developer docs)
.claude/skills/     # project skills (init-spec, review-spec, init-memory)
.codex/config.toml  # Codex config (Esri developer docs MCP)
.vscode/mcp.json    # VS Code MCP config (Esri developer docs)
packages/interactive-code-scroll/  # core package: Astro integration
  src/index.ts                     # interactiveCodeScroll() integration (MDX + Sätteri validation, injects /)
  src/tutorial-files.ts            # reads tutorial.mdx, code/**, images/**
  src/tutorial-module.ts           # virtual:interactive-code-scroll/tutorial (Content, frontmatter, files, images)
  src/markers.ts                   # #region / @var parser + applyVars
  src/validate.ts                  # reference validation (pure)
  src/mdx-validation.ts            # Sätteri mdast plugin that runs validate.ts with MDX positions
  src/highlight.ts                 # Shiki build-time highlighting
  src/frontmatter.ts               # title / preview config
  src/downloads.ts                 # project files with values applied, ZIP (fflate)
  src/components/                  # Step.astro, VarField.astro
  src/client/                      # browser runtime: calcite.ts, steps.ts + navigation.ts (step engine), vars.ts + var-values.ts (form → code), layout.ts + layout-values.ts (theme, splitter), preview.ts, downloads.ts
  src/pages/index.astro            # injected tutorial page
  src/preview/                     # preview page, OAuth callback endpoint, HTML builder
  test/                            # Astro build integration tests + fixtures
examples/oauth-pkce/               # example project: astro.config.mjs + tutorial/ (tutorial.mdx, code/, images/)
e2e/                               # Playwright tests (against the built example)
spike/FINDINGS.md                  # spike findings (prototype code in git history, commit f265e61)
```


---

## Architecture

Implemented in `packages/interactive-code-scroll` (first proven in the spike):

| Piece | Runs | Responsibility |
|---|---|---|
| Marker parser | build | Strips `#region` / `@var`, returns clean code + region line ranges + var positions (`src/markers.ts`) |
| Highlighter | build | Shiki dual themes; `line` transformer tags `data-regions`; `decorations` put `data-var` on the literal's token |
| Validation | build | Each `<Step>` / `<VarField>` asserts its file, region, image and var exist; build fails with a clear message |
| MDX components | build | `<Step id file region images>`, `<VarField name label secret persist>` render static HTML |
| Client runtime | browser | IntersectionObserver (center line) + keyboard → activate step (file, focus lines, carousel, hash, progress); var inputs → swap `textContent` of `[data-var]` spans + `localStorage` |
| Preview page | browser | `preview/` page `document.write`s the assembled HTML (local scripts/styles inlined) from `localStorage`; used by iframe and new tab; `preview/oauth-callback.html` next to it |

### Data flow

MDX + annotated code + images → build (validates references; fails on broken IDs) → static site → scroll/keyboard activates a step → right panel action (highlight region / switch file / show images) · form → client-side variable substitution → re-rendered code + Preview (iframe / new tab) + download.

---

## Coding style

- **Everything in the repo is in English**: code, comments, docs, commit messages, UI text. (Conversation with the user may be in Spanish.)
- TypeScript `strict`, no `any` (use `unknown` and narrow).
- ESM + named exports. No default exports, no CommonJS.
- No over-engineering: only what the task needs, no speculative abstractions.
- Minimal comments: only the non-obvious why.

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
| UI rules | Calcite only. No inline styles. |
| Explore first | Before writing code for X, ask "what already exists for X?" and request existing code as a reference pattern. |
| Documentation | Query the Esri MCP server (`mcp-for-esri-developers`, developers.arcgis.com docs) before assuming ArcGIS APIs. |
| Off-limits | AMD modules, `watchUtils`, legacy widgets (in tutorial sample code). |

---

## Key technical patterns

### Tutorial code markup
- Regions: `// #region <id>` … `// #endregion` (HTML/CSS equivalents).
- Form variables: inline comment, e.g. `const clientId = "DEMO_ID"; // @var clientId`. The literal is the default (single source of truth).
- Source code must remain valid, runnable and lintable without the framework.
- Markers are stripped from rendered and downloaded code.

### Preview
- Optional and configurable per tutorial: iframe, new tab, or both.
- Default mode: `both`.
- Iframe and tab both load a same-origin preview page (`preview/`) that renders the current files; iframe sandbox includes `allow-same-origin`. OAuth via popup (`OAuthInfo` with `popup: true`) + the SDK's `oauth-callback.html` at `preview/oauth-callback.html`.
- New tab: standalone page with current files; OAuth via regular redirect.

---

## What to avoid

- `{{var}}`-style placeholders in tutorial code (break execution and linting).
- Referencing line numbers from MDX (fragile); use region IDs.
- Loading the OAuth sign-in page inside the Preview iframe.
- Adding dependencies without justification.
- Non-English text in the repo.
- E2E assertions that check state the code under test just set; assert the user-visible outcome (what the component actually shows).

---

## Known issues / differences

| Feature | Context A | Context B | Notes |
|---|---|---|---|
| ArcGIS OAuth sign-in | Inside iframe: expected to be blocked (X-Frame-Options) — **unverified** | Popup from the Preview iframe: **verified** (PKCE S256, real Client ID) | The SDK shows its own "Please sign in" dialog first: the popup needs a user gesture |
| OAuth redirect URI | GitHub Pages | localhost (served locally) | Both must be registered in the app by the author; the CLI prints the exact URIs |
| Preview `redirect_uri` | `srcdoc` / blob iframe: SDK builds it from `location` → `about://null/oauth-callback.html` (`<base href>` ignored) | Real same-origin preview page: correct URI | Preview (iframe and tab) must load a real URL; `oauth-callback.html` must sit next to that page |
| Preview sandbox | Without `allow-same-origin`: opaque origin, no Referer (OSM tiles 403, referrer-restricted API keys fail), callback cannot reach `window.opener` | With `allow-same-origin`: works | Preview can read the tutorial's `localStorage` (author-trusted code) |
| Keyboard step navigation | Focus in page: works | Focus inside Preview iframe: keys go to the map | Forward keys from the preview page (same origin) |
| `#step-id` deep link | Native fragment scroll puts the step at the top | Trigger line is the viewport center | Needs `scroll-margin-top` on steps and waiting for Calcite hydration (layout shift) |
| Astro 7 + pnpm build | Prerender bundle externalizes `cookie`; pnpm does not hoist it | Node resolves a stray copy up the tree (e.g. `~/node_modules`) → CJS import error | `vite.environments.prerender.resolve.noExternal: ["cookie"]` |
| MDX plugins (Astro 7) | `remarkPlugins` on `@astrojs/mdx`: deprecated | Default processor is Sätteri: use `mdastPlugins` (`satteri` 0.x, API may change) | Astro does not surface Sätteri `report()` diagnostics: throw instead |
| `astro dev` / `astro preview` (v7) | Human terminal: foreground | AI agent detected (`AI_AGENT` env): auto-backgrounds and returns | Use `--ignore-lock` to stay in the foreground (Playwright `webServer`); otherwise `astro dev stop` / `astro dev logs` |
| `calcite-carousel` selection | Setting `selected` on a `calcite-carousel-item` after creation: ignored (two items end up `selected`, the view does not move) | `selected` present when items are created: honoured | Public API has no next/select method; re-create the carousel with the wanted item `selected`; read the carousel's `selectedItem` (not items' flags) |
| Calcite props in React 19 | Set as DOM properties (e.g. `label`) | Not reflected as attributes | E2E selectors must not rely on those attributes |

---

## Deployment

- GitHub Pages via GitHub Actions, on push to `main`.
- Base path `/<repo>/`.
- Supports one tutorial per repo or several (`/tutorials/<name>/`) with an index page.
- Workflow details: _TBD — GitHub Pages task in `TODO.md`._

---

## Git conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…), in English.
- Commit as you go: after each feature (or meaningful sub-step) is implemented and its tests pass, commit it.
- `TODO.md` holds **pending** tasks only. When a task is done, remove it from `TODO.md` and add an entry to `CHANGELOG.md` under `## [Unreleased]` in the same commit.
- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) (Added / Changed / Fixed / Removed).
- Never commit secrets: `.env`, real Client IDs, API keys. Tutorials use demo values only.
