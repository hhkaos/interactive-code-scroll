# Public documentation review — 2026-10-17

Scope: the seven public guides and the root and two published package READMEs. Review compared their usage descriptions with the current source, changelog and existing regression coverage. This is an initial editorial review, not a certification of every platform, external link or browser behavior.

| Document | Main checks |
|---|---|
| `README.md` | Wizard, supported CLI commands, tutorial model and request runner. Corrected the CLI summary and captured-output description. |
| `docs/quick-start.md` | Wizard entry point, generated layout, markers, MDX and build/publish flow against scaffolder templates and CLI. |
| `docs/features.md` | Current capabilities, panel/console API, series controls and narration. Corrected the obsolete reading-mode-only restriction. |
| `docs/authoring.md` | Frontmatter, component props, markers, Preview/Console, Result/requests, variants and series against their source modules. Corrected text-only step terminology, outline/media fallback, request-only Result panes and independent card controls. |
| `docs/presenting.md` | Keyboard navigation, panes, closing slide and narration against the client runtime and existing speech/presentation E2E coverage. Added narration controls and pause behavior. |
| `docs/cli.md` | Core command/option parsing and scaffolder flags against both CLI implementations. |
| `docs/deployment.md` | Author workflow snippets against scaffolder templates and repository workflows. Added the repository's documentation publication checks. |
| `docs/upgrade.md` | Recent panel migration, narration, pane sizing and compatibility notes against the changelog and current authoring APIs. |
| `packages/interactive-code-scroll/README.md` | Install, scripts, markers, MDX example and reference links. It remains a concise package introduction. |
| `packages/create-interactive-code-scroll/README.md` | Wizard invocation, options and example against scaffolder parsing and templates. |

The original `docs:check` passed while Features incorrectly limited narration to reading mode. Its document fingerprints covered only `authoring.md` and `upgrade.md`, since those were the only cited pages. Coverage now discovers every top-level `docs/*.md` file and always includes all three READMEs. Regression tests exercise edits to uncited pages, added/removed pages, incomplete fingerprint coverage and missing package READMEs.

The actual checker CLI was also exercised against a temporary copy of this repository. A simulated ready beta.11 release passed; restoring the obsolete reading-mode-only sentence made both the normal and release checks exit with code 1 and name `docs/features.md`. Restoring the reviewed text made the release check pass again. Unreviewed edits to `docs/cli.md` and each README were also blocked. The working repository's package versions were unchanged.

Fingerprint refresh records a review; it does not perform that review. An incorrect statement can still be accepted if the reviewer overlooks it. Internal context/research files are deliberately outside the public document fingerprints. The changelog review boundary remains beta.10; historical releases are not retroactively certified.
