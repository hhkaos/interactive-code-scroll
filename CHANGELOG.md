# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@types/node` dev dependency (types were resolved from a stray `~/node_modules`; a fresh clone failed `pnpm check`).
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
- Presentation mode: browser full screen with a compact toolbar (progress, preview and exit stay; Esc exits); explanations can be hidden so code takes the full width while keys/clickers keep moving steps, and showing them again returns to the active step.
- Forms → variables: typing in a `<VarField>` swaps the `@var` token text in place (highlighting kept); an empty field restores the code default; `persist` stores values in `localStorage` (tolerating blocked storage); `secret` values are masked in field and code, with a reveal toggle.

### Changed

- UI redesign on Calcite: `calcite-navigation` header (explanations toggle, title, present, theme, progress bar; "Step X of N" only while presenting); explanations scroll in their own panel (no page scroll, separated scrollbars); Calcite type scale (16 px text, 13 px code with the Calcite code font, 1.6/1.7 line heights), compact steps (no minimum height, no dimmed text; active step gets a subtle background and brand edge), numbered section headings, styled inline code, 70ch line length; icon-only `calcite-action`s with tooltips; file icons on tabs; thin splitter and scrollbars.
- Theme: `theme` frontmatter sets the tutorial's default mode (`auto` / `light` / `dark`; the viewer's toggle wins); code panel and Preview iframe follow the page mode (apps using `calcite-mode-auto` match). Code: GitHub default themes; outside the focused region the code turns uniformly gray, the region keeps its colors on a brand band.
- Preview: own header bar next to the iframe (collapse, Run, open in new tab); collapsing keeps the header.
- Image carousel fits and centers in the panel (never scrolls).
- `<VarField>`: Calcite `label-text` instead of a `calcite-label` wrapper; the secret reveal toggle is a `calcite-action` in the input's `action` slot, joined to the field.
- Every `code/` file is published at `preview/<path>` (markers stripped); the OAuth popup callback is now the tutorial's own `code/oauth-callback.html` (shown as a step in the example and included in downloads) instead of a built-in framework page.
- E2E tests block the whole Esri CDN by default (`network: true` to opt in).

- `SPEC.md`: carousel keyboard behavior (step keys page through images first).
- `SPEC.md`: Preview runs from a same-origin preview page (not `srcdoc`/blob); technical base recorded.

### Removed

- Spike prototype code (`spike/`), now ported; findings kept in `spike/FINDINGS.md`.

### Fixed

- Deep links and in-page `#step-id` links center the step (short steps used to land below the trigger line); on load the step stays centered while the layout settles (Calcite renders late online), until user input.

- Keys pressed before Calcite finished hydrating no longer get undone by the deep-link restore scroll; the scroll observer only confirms the target of a key-driven scroll (an interrupted smooth scroll could re-activate a passed step).

- Key-driven smooth scrolling no longer lets the scroll observer re-activate the steps it passes over (which reset a carousel to its first image).
