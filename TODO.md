# TODO

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Dev mode: re-validate MDX when `code/` or `images/` change (today validation is stale until the MDX is edited); center the error overlay on the failing MDX line (`loc`).
- [ ] Re-enable the real ArcGIS SDK OAuth Preview E2E once the example tutorial UI has stabilized.
- [ ] Self-host the Calcite assets actually used (t9n `en` + used icons) so "serve locally" works without network (the full CDN asset folder is 27 MB / 6.8k files).
- [ ] `pnpm create interactive-code-scroll` scaffolder.
- [ ] Multi-tutorial repos with index page; GitHub Pages workflow.
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.

## Multi-SDK support

_Plan: `docs/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 0 — language-agnostic code model:

- [ ] Highlight Python, Kotlin, Swift, C#, XAML, Java, C++, QML, Dart, `.http`, TOML, SQL and other common extensions; optional `languages` frontmatter override.
- [ ] Region markers: C# `#region`, `# region`, `-- #region`.
- [ ] `@var` escaping chosen by file type and quote (JS-like, Python, shell, XML/HTML); reject unsupported literal forms.
- [ ] `.http` file variables (`@name = value`) as vars.
- [ ] Frontmatter `files:` visible subset; binary files copied to ZIP/preview but never rendered or serialized.

Phase 1 — REST conference slice (cURL / Python / JavaScript):

- [ ] Code variants with a language switcher (`variants` frontmatter, region ids shared across variants).
- [ ] Captured output (`output/` folder, `<Step output>`) in a Result pane.
- [ ] `.http` request runner with captured-output fallback.
- [ ] Collapsible JSON viewer.
- [ ] REST example tutorial + framework-fixture cases + mocked E2E.
