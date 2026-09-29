# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added the Result pane with captured output: for code that is not web (a variant or tutorial without `index.html`) it takes the Preview's place, with the same splitter and a collapsible header. `<Step output="name">` shows `output/<variant>/name` or `output/name` (JSON and text as text, `.txt`/`.log` in terminal style, images as images), steps without an output keep the nearest earlier result, outputs are published under `output/` and fetched when shown, and the build warns when an output looks like it holds a credential.
- Added Preview and downloads per code variant: web variants (with `index.html`) run the Preview from their own page at `preview/<dir>/index.html` and other variants hide it; the ZIP holds the active variant's folder as `<tutorial>-<variant>.zip`, and its badge counts that variant's files.
- Added code variants to the tutorial page: a language switcher before the file tabs (segmented control for up to four variants whose tabs fit, dropdown otherwise), `?variant=` deep links and a remembered choice, per-variant tabs, steps that focus the same region in each variant's file, and `only=` steps shown with a notice (`otherVariantSteps: notice`) or hidden (`hide`).
- Added `examples/framework-fixture-variants` and `examples/framework-fixture-variants-hide` with their own Playwright web servers.
- Added build validation for code variants (Phase 1, not rendered yet): `variants` frontmatter (`id`, `label`, `dir`, `entry`, per-variant `files`) and `otherVariantSteps` (`notice` | `hide`); all code must live in variant folders, region ids are unique within a variant, `<Step region>` without `file` resolves per variant, and `only="a b"` limits a step to some variants.
- Added a `files` frontmatter list (paths/globs) that chooses which `code/` files get tabs; other files, including binaries, are published under `preview/` and fetched into the ZIP, and the ZIP action shows a badge with the total file count; its tooltip says how many are not shown in tabs.
- Added binary file support in `code/`: detected by extension or NUL byte, never rendered, published and zipped byte for byte.
- Added `.http` file variables (`@name = value`) as form-editable variables, and `-- @var` comments in SQL and Lua files.
- Added `examples/multi-sdk-playground` (`pnpm playground`), a local tutorial with Python, Kotlin, C# and SQL steps for trying multi-SDK features by hand.
- Added syntax highlighting for Python, Kotlin, Gradle, Swift, Java, C#, XML/XAML, C++, QML, Dart, TOML, INI, SQL, Lua, PowerShell, `.http`, JSX/TSX, Vue and GeoJSON files, plus a `languages` frontmatter map to override the language per extension.
- Added native region markers scoped by file type: C# `#region` in `.cs`, `# region` in `.py`, and `-- #region` in `.sql`/`.lua`.
- Added shell/YAML-style `# #region` marker support for bash commands and MDX frontmatter examples.
- Added Markdown/MDX fenced-code handling so marker examples can be shown literally in authoring tutorials.
- Added public authoring, CLI, deployment and upgrade documentation for tutorial authors.
- Added a dogfooding getting-started tutorial built with InteractiveCodeScroll.
- Added a GitHub Pages workflow to publish the getting-started tutorial on pushes to the default branch, with configurable site and base URL variables.

### Changed

- In dev mode, adding, changing or deleting a file under `code/`, `images/`, `requests/` or `output/` now re-runs the MDX validation without touching `tutorial.mdx`, and the browser error overlay opens `tutorial.mdx` at the first failing line.
- `@var` values are now escaped for the file type and quote style (backslash, Kotlin/Dart/Groovy `$`, shell, PowerShell, SQL/YAML quote doubling, HTML/XML entities). Python f-strings, raw and triple-quoted strings and TOML literal strings are rejected at build time.
- A variable name used in several files must have the same default literal everywhere; the build fails otherwise (see `docs/upgrade.md`).
- Frontmatter is now validated together with MDX references at compile time: invalid fields, a missing `logo` image and Preview without `code/index.html` report `tutorial.mdx:line:column` at the offending key instead of failing later during page rendering.
- Expanded the root and package READMEs with quick-start guidance and links to tutorials built with InteractiveCodeScroll.
- Updated shared project context to document the public docs, getting-started tutorial and GitHub Pages deployment workflow.
- Reworked the getting-started dogfooding tutorial to teach the authoring setup flow with shell commands, MDX steps and tab-only Preview.
- Added a generated-result visual checkpoint to the getting-started tutorial instead of nesting a compiled tutorial inside Preview.
- Updated the OAuth PKCE example credential setup step with a seven-image ArcGIS portal walkthrough.

### Fixed

- Resizing the explanations panel no longer switches the active step (and the URL hash) while its text reflows; the active step stays centered.

## [0.1.0-alpha.8] - 2026-09-28

### Fixed

- Fixed wrapped code lines so blank lines keep their line height and do not collapse focused regions.

## [0.1.0-alpha.7] - 2026-09-28

### Added

- Added styled Markdown blockquotes and an inline `<Hint>` MDX component for short rich clarifications.
- Added `codeWrap` frontmatter to optionally wrap long code lines in the code panel.
- Added polished tutorial markdown code blocks, disclosure blocks and active-step inline code contrast.
- Added risk-based preflight scripts and agent guidance to reduce validation overhead without weakening release quality.

## [0.1.0-alpha.6] - 2026-09-28

### Added

- Added a GitHub Actions workflow to publish the npm package from version tags via npm trusted publishing.
- Added an `<Intro>` MDX component for non-step tutorial introductions.
- Added `placeholder` support to `<VarField>` without changing the linked code default.
- Added package tarball smoke testing to the npm publish workflow.
- Added package repository metadata required for npm provenance verification.

### Changed

- Removed the intro block's horizontal padding so introduction content aligns with the step content column.

### Fixed

- Fixed the npm publish workflow by pinning the pnpm version required by `pnpm/action-setup`.

## [0.1.0-alpha.3] - 2026-09-27

### Added

- Code panels now show line numbers in a left gutter.

### Fixed

- Fixed extra vertical spacing between code lines after adding line numbers.

## [0.1.0-alpha.2] - 2026-09-27

### Added

- Added `interactive-code-scroll doctor` to report package manager, Astro resolution, project root and detected `tutorial.mdx` candidates.
- Added `interactive-code-scroll init-scripts`, with optional `--write`, to suggest or add package scripts without overwriting existing scripts.

### Changed

- Improved CLI help and missing-tutorial diagnostics with package-manager-aware commands, candidate detection and explicit npm script argument forwarding guidance.
- Documented npm/pnpm execution paths that avoid unreliable direct pnpm bin invocation in some consumer environments.

### Fixed

- CLI Astro lookup now walks parent directories, so running from a tutorial subfolder can still use Astro installed at the consuming project root.

## [0.1.0-alpha.1] - 2026-09-27

### Changed

- Improved CLI developer experience with a preflight banner, help examples, automatic root-level `tutorial.mdx` detection, and actionable missing-tutorial guidance.

### Fixed

- CLI Astro resolution now searches parent directories, so running from a tutorial subfolder with `--tutorial .` can use Astro installed in the parent project.

## [0.1.0-alpha.0] - 2026-09-26

### Added

- Package build pipeline for `interactive-code-scroll`: compiled `dist` output, packaged CLI entrypoints, `prepack`, and a tarball smoke test that installs the package in a temporary tutorial project.
- Generic `interactive-code-scroll` CLI with `dev`, `build` and `serve` commands for any tutorial project, backed by a generated Astro config and topic-agnostic options.
- Stable `examples/framework-fixture` tutorial for framework E2E coverage.
- Per-step Preview state: `<Step preview="expanded">` and `<Step preview="collapsed">` control the iframe when the step becomes active.
- Resizable Preview: a splitter between code and Preview (pointer and keyboard, height remembered).
- Image viewer: clicking a carousel image opens it full screen (`calcite-dialog`); step keys page the images inside it and leaving the step closes it.
- Optional `logo` frontmatter (a file in `images/`): header logo (`calcite-navigation-logo` thumbnail) and favicon.
- `@types/node` dev dependency (types were resolved from a stray `~/node_modules`; a fresh clone failed `pnpm check`).
- Project specification (`SPEC.md`).
- Shared AI agent context (`PROJECT.md`, `CLAUDE.md`, `AGENTS.md`).
- Task list (`TODO.md`) and changelog (`CHANGELOG.md`).
- Technical base spike: Code Hike and Astro prototypes of the same tutorial, shared marker parser and preview helpers, Playwright smoke tests, and findings now documented in `docs/research/technical-base-spike.md`. Decision: Astro + MDX + Shiki.

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

- Root and example dev/build/preview scripts now exercise the generic CLI against `examples/framework-fixture`.
- Clarified that InteractiveCodeScroll is a generic framework; OAuth/ArcGIS are example concerns only, and the next CLI work must stay topic-agnostic.
- Expanded `SPEC.md` with public documentation requirements: README, dogfooding getting-started tutorial, authoring/API reference, CLI reference and upgrade guide.
- Documented `examples/framework-fixture` as the required regression fixture for new framework behavior and matching E2E coverage.
- Documented the E2E strategy: avoid chasing OAuth tutorial editorial changes and add a stable fake tutorial fixture for framework behavior.
- The OAuth PKCE example sign-in button now becomes a sign-out action after authentication.
- Removed the basemap from the OAuth PKCE example so the tutorial focuses only on user authentication.
- Expanded the OAuth PKCE example tutorial into a complete walkthrough suitable as a CLI example, with an explicit OAuth popup callback URL and auth namespace.
- Moved the technical base spike findings to `docs/research/technical-base-spike.md`.
- Example tutorial: ArcGIS Maps SDK for JavaScript glyph as logo and favicon.
- The explanations toggle is a handle on the docs/code splitter (a rail at the left edge while they are hidden), no longer in the header.
- Steps no longer change background on hover (the pointer cursor is the hint).
- The blank room below the last step is just what it needs to reach the center line.
- Example tutorial: link to the original Esri tutorial, credential-type screenshot first in the developer credential carousel, and the demo app follows the page mode (`calcite-mode-auto`).
- Steps: clicking a step activates it; scrolling back to the top activates the first one; each step heading is numbered (the active one in brand color); the whole code region scrolls into view when it fits (no scroll when already visible) and key navigation shows tall steps from their start. The tutorial title is the page's h1 (header); the example MDX no longer repeats it.
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

- Hidden local agent/editor configuration directories and MCP config files from the repository.
- Spike prototype code (`spike/`), now ported; findings kept in `docs/research/technical-base-spike.md`.

### Fixed

- Packaged CLI execution under pnpm now follows bin symlinks correctly and resolves Astro from the consuming project before falling back to the workspace package.
- Text-only steps now clear any previously focused code region.
- Deep links and in-page `#step-id` links center the step (short steps used to land below the trigger line); on load the step stays centered while the layout settles (Calcite renders late online), until user input.

- Keys pressed before Calcite finished hydrating no longer get undone by the deep-link restore scroll; the scroll observer only confirms the target of a key-driven scroll (an interrupted smooth scroll could re-activate a passed step).

- Key-driven smooth scrolling no longer lets the scroll observer re-activate the steps it passes over (which reset a carousel to its first image).
