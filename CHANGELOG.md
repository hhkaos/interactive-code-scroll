# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project specification (`SPEC.md`).
- Shared AI agent context (`PROJECT.md`, `CLAUDE.md`, `AGENTS.md`) and Esri developer docs MCP config (`.mcp.json`).
- Task list (`TODO.md`) and changelog (`CHANGELOG.md`).
- Technical base spike (`spike/`): Code Hike and Astro prototypes of the same tutorial, shared marker parser and preview helpers, Playwright smoke tests, `FINDINGS.md`. Decision: Astro + MDX + Shiki.

- Core package scaffold: pnpm workspace with `interactive-code-scroll` (Astro integration that adds MDX and injects the tutorial page, reading the author's `tutorial/tutorial.mdx` through a virtual module) and the `examples/oauth-pkce` project. Vitest unit tests and a Playwright E2E test.
- Marker parser (`markers.ts`): `#region` / `#endregion [id]` and `@var` in JS, CSS and HTML comments; nested regions; errors with file and line (unmatched, unclosed, mismatched, empty or duplicate regions, duplicate vars, var without literal); context-aware escaping (script string vs HTML attribute).
- Build-time rendering: `<Step>` and `<VarField>` components, Shiki dual-theme highlighting with `data-regions` / `data-var`, file tabs, `title` / `preview` frontmatter.
- Strict validation as a Sätteri mdast plugin: every broken step id, file, region, image or var, and every marker error in `code/`, fails the build with `file:line:column`; shown in the dev error overlay.
- Step engine (client): the step crossing the viewport center becomes active; arrows / PageUp / PageDown (presentation clickers) move with snapping, also from a focused carousel but not from fields; deep links `#step-id` (restored after Calcite hydration); file switching, region focus with gray-out and auto-scroll, image carousel panel, progress text and bar; file tabs.
- Step keys page through an image carousel before leaving the step (backwards entry starts at the last image); the carousel's own controls stay in sync.
- Preview: iframe and/or new tab per `preview` frontmatter (`both` by default), both loading a same-origin `preview/` page; ~500 ms debounce after form changes plus Run; collapsible iframe; PageUp/PageDown pressed inside the preview move the tutorial; build fails if `code/index.html` is missing while the preview is on.
- Layout: light/dark toggle (defaults to `prefers-color-scheme`, manual choice remembered, applied before first paint; code theme follows); resizable docs/code splitter (pointer and keyboard, width remembered); usable at high browser zoom (toolbar wraps, no page-level horizontal scroll).
- Downloads: copy the visible file to the clipboard, download it, or download the project as a ZIP (`fflate`, loaded on demand) under a folder named after the tutorial; form values (secrets included) applied, markers stripped.
- Forms → variables: typing in a `<VarField>` swaps the `@var` token text in place (highlighting kept); an empty field restores the code default; `persist` stores values in `localStorage` (tolerating blocked storage); `secret` values are masked in field and code, with a reveal toggle.

### Changed

- Every `code/` file is published at `preview/<path>` (markers stripped); the OAuth popup callback is now the tutorial's own `code/oauth-callback.html` (shown as a step in the example and included in downloads) instead of a built-in framework page.
- E2E tests block the whole Esri CDN by default (`network: true` to opt in).

- `SPEC.md`: carousel keyboard behavior (step keys page through images first).
- `SPEC.md`: Preview runs from a same-origin preview page (not `srcdoc`/blob); technical base recorded.

### Removed

- Spike prototype code (`spike/`), now ported; findings kept in `spike/FINDINGS.md`.

### Fixed

- Keys pressed before Calcite finished hydrating no longer get undone by the deep-link restore scroll; the scroll observer only confirms the target of a key-driven scroll (an interrupted smooth scroll could re-activate a passed step).

- Key-driven smooth scrolling no longer lets the scroll observer re-activate the steps it passes over (which reset a carousel to its first image).
