# InteractiveCodeScroll

> A framework for technical writers, devrels and speakers to build guided, interactive code tutorials (in the style of the Stripe Checkout quickstart) by writing MDX and annotating source code.

This file is the shared AI context for this project. It is read by all AI coding agents.
Agent-specific behaviour rules live in each agent's own file (CLAUDE.md, AGENTS.md).

> Requirements source of truth: `SPEC.md`. This file covers **how to work** in the project — not what to build.

---

## What this project is

A framework that turns a tutorial folder (MDX + code + images) into an interactive static website: documentation on the left, code on the right, synchronized by scroll/keyboard (region highlighting, file switching, images), with forms that update code variables, an optional Preview (iframe and/or new tab), downloads and a presentation mode. Built for projecting at conferences and for reproducing at home. Desktop-first. Published on GitHub Pages.

Status: pre-implementation. The technical base will be chosen after a spike (see `TODO.md`).

---

## Commands

_TBD — after spike._ Package manager: **pnpm**.

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
| Base framework | _TBD — spike: Code Hike (Vite/Next) vs Astro + MDX + Shiki_ |
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
```

Rest: _TBD — after spike._

---

## Architecture

_TBD — after spike._

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
- Iframe: sandboxed (srcdoc/blob) with current files; OAuth via popup (`OAuthInfo` with `popup: true`) + static `callback.html`.
- New tab: standalone page with current files; OAuth via regular redirect.

---

## What to avoid

- `{{var}}`-style placeholders in tutorial code (break execution and linting).
- Referencing line numbers from MDX (fragile); use region IDs.
- Loading the OAuth sign-in page inside the Preview iframe.
- Adding dependencies without justification.
- Non-English text in the repo.

---

## Known issues / differences

| Feature | Context A | Context B | Notes |
|---|---|---|---|
| ArcGIS OAuth sign-in | Inside iframe: expected to be blocked (X-Frame-Options) — **unverified** | Popup / new tab: works | Verify during spike |
| OAuth redirect URI | GitHub Pages | localhost (served locally) | Both must be registered in the app by the author; the CLI prints the exact URIs |

---

## Deployment

- GitHub Pages via GitHub Actions, on push to `main`.
- Base path `/<repo>/`.
- Supports one tutorial per repo or several (`/tutorials/<name>/`) with an index page.
- Workflow details: _TBD — after spike._

---

## Git conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…), in English.
- Commit as you go: after each feature (or meaningful sub-step) is implemented and its tests pass, commit it.
- `TODO.md` holds **pending** tasks only. When a task is done, remove it from `TODO.md` and add an entry to `CHANGELOG.md` under `## [Unreleased]` in the same commit.
- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) (Added / Changed / Fixed / Removed).
- Never commit secrets: `.env`, real Client IDs, API keys. Tutorials use demo values only.
