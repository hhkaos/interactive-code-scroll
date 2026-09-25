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

### Changed

- `SPEC.md`: Preview runs from a same-origin preview page (not `srcdoc`/blob); technical base recorded.
