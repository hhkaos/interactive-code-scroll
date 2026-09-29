# TODO

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Re-enable the real ArcGIS SDK OAuth Preview E2E once the example tutorial UI has stabilized.
- [ ] Self-host the Calcite assets actually used (t9n `en` + used icons) so "serve locally" works without network (the full CDN asset folder is 27 MB / 6.8k files).
- [ ] `pnpm create interactive-code-scroll` scaffolder.
- [ ] Multi-tutorial repos with index page; GitHub Pages workflow.
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.

## Multi-SDK support

_Plan: `docs/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 0 — language-agnostic code model (in order):

- [ ] Var model: one default per var name across files (build error otherwise); escaper by file type and quote (JS-like, Python, shell, XML/HTML); reject f-strings, raw and triple-quoted literals; unquoted `.http` file variables (`@name = value`). Upgrade note in `docs/upgrade.md`.
- [ ] Frontmatter `files:` visible subset; no `@var` in files without a tab; binary files published byte for byte; ZIP fetches hidden and binary files from `preview/`.
- [ ] Dev mode: re-validate when `code/`, `images/` (later `requests/`, `output/`) change; center the error overlay on the failing MDX line (`loc`).

Phase 1 — REST vertical slice (cURL / Python / JavaScript), in order:

- [ ] Code variants: `variants` frontmatter, region ids unique per variant, per-variant file map on steps, switcher, `?variant=`, per-variant ZIP; web variants (with `index.html`) get Preview under `preview/<variant>/`.
- [ ] Result pane replacing Preview for non-web variants; captured output (`output/` folder, `<Step output>`); build warning for credentials in outputs.
- [ ] Collapsible JSON viewer (text-only rendering).
- [ ] `.http` runner: `requests/` folder, several named requests per step with a "Run as" picker, URL-encoded query values, masking + "Show secrets", captured-output fallback, declarative error rule for HTTP 200 error bodies.
- [ ] Error help table with reference links + Headers tab.
- [ ] REST example tutorial + framework-fixture cases + mocked E2E (block every called host).
