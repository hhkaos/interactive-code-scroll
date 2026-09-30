# Contributing to InteractiveCodeScroll

Thanks for your interest! InteractiveCodeScroll is in beta and grows with the needs of people who build tutorials, so every report and idea counts.

## Ways to help

- **Report a bug** — [open a bug report](https://github.com/hhkaos/interactive-code-scroll/issues/new?template=bug_report.yml) with the steps, what you expected and what happened. A minimal `tutorial.mdx` that reproduces it is gold.
- **Propose a feature** — [open a feature request](https://github.com/hhkaos/interactive-code-scroll/issues/new?template=feature_request.yml). Start from the tutorial you are trying to build: the use case matters more than the proposed API.
- **Share your tutorial** — [submit it to the showcase](https://github.com/hhkaos/interactive-code-scroll/issues/new?template=showcase.yml).
- **Improve the docs** — typos, unclear steps, missing examples: pull requests welcome.
- **Write code** — for anything bigger than a small fix, open an issue first so we can agree on the approach.

## Development setup

Requirements: Node.js 24 and pnpm 11.

```sh
git clone https://github.com/hhkaos/interactive-code-scroll.git
cd interactive-code-scroll
pnpm install
pnpm exec playwright install chromium   # once, for E2E tests
pnpm rest                               # REST example tutorial in dev mode
```

### Repository layout

| Path | What it is |
|---|---|
| `packages/interactive-code-scroll/` | Core package: Astro integration, CLI, browser runtime |
| `packages/create-interactive-code-scroll/` | `npm create interactive-code-scroll` wizard |
| `examples/` | User-facing tutorials (REST geocoding, OAuth PKCE, multi-SDK playground) |
| `fixtures/` | Stable fake tutorials for E2E tests — not edited for content polish |
| `e2e/` | Playwright tests (each fixture is built and served on its own port) |
| `docs/` | Public documentation |
| `docs/dev/` | Specification (`SPEC.md`), project context (`PROJECT.md`), task list (`TODO.md`), research |

### Useful commands

```sh
pnpm dev             # main fixture in dev mode
pnpm playground      # multi-SDK playground in dev mode
pnpm test            # unit tests (Vitest)
pnpm check           # type check (tsc + astro check)
pnpm test:e2e        # E2E tests (Playwright)
pnpm test:pack       # pack both packages, install them in temporary projects and build them
```

## Pull requests

1. **Tests ship with the change.** Unit tests (Vitest) for logic, E2E (Playwright) for behavior readers can see. Framework behavior worth protecting gets a case in `fixtures/framework-fixture` plus an E2E assertion.
2. **Pick the right preflight** before pushing:
   - docs only: `pnpm preflight:docs`
   - CSS/UI only: `pnpm preflight:ui` (and add a screenshot to the PR)
   - runtime, CLI, build or package output: `pnpm preflight:package`
3. **Update `CHANGELOG.md`** under `## [Unreleased]`.
4. **Conventional Commits** in English (`feat:`, `fix:`, `docs:`, `chore:`, `test:`…).
5. **Keep the core generic.** Topic-specific behavior (ArcGIS, OAuth, maps…) belongs in tutorials, templates or optional presets, never in the core package.
6. **Behavior changes follow the spec.** If your change alters requirements, update `docs/dev/SPEC.md` in the same PR.
7. **New dependencies** need a short justification (why this package, why this version).

## Working with AI coding agents

This project is built with AI coding agents, and you are welcome to use them too. [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md) at the root give Claude Code, Codex and similar tools the project rules; they point to `docs/dev/` for the full context. You remain responsible for every line you submit: review it, test it and be ready to explain it.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing, you agree that your contributions are licensed under the [Apache-2.0 License](LICENSE).
