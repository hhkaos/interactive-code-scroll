# TODO

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Re-enable the real ArcGIS SDK OAuth Preview E2E once the example tutorial UI has stabilized.
- [ ] Self-host the Calcite assets actually used (t9n `en` + used icons) so "serve locally" works without network (the full CDN asset folder is 27 MB / 6.8k files).
- [ ] `pnpm create interactive-code-scroll` scaffolder.
- [ ] Multi-tutorial repos with index page; GitHub Pages workflow.
- [ ] Sibling tutorials: frontmatter `family` + `familyLabel`, header switcher that navigates to the same step id in the chosen tutorial (needs multi-tutorial repos).
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.

## Multi-SDK support

_Plan: `docs/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 1 — REST vertical slice (cURL / Python / JavaScript), in order:

- [ ] 1b Variants in the page: per-variant file map on steps, switcher before the file tabs, `?variant=` + `ics:variant`, focus kept on switch, `notice`/`hide` for `only=` steps; new `examples/framework-fixture-variants` + second Playwright web server.
- [ ] 1c Per-variant downloads and Preview: ZIP of the active variant plus `requests/`, `<tutorial>-<variant>.zip`, web variants published under `preview/<variant>/`.
- [ ] 2 Result pane replacing Preview for non-web code; captured output (`output/` folder, `<Step output>`, per-variant override); keeps the last result; build warning for credentials in outputs.
- [ ] 3 Collapsible JSON viewer (text-only rendering, 100-entry truncation, keyboard).
- [ ] 4a `.http` parser and build validation (`requests/`, supported subset, `request=` names).
- [ ] 4b `.http` runner UI: Run, "Run as" picker, URL-encoded query values, masking + "Show secrets", 30 s timeout, captured-output fallback.
- [ ] 5 Error rule + help table (`requests/errors.json`) + Headers tab.
- [ ] 6 REST example tutorial (cURL / Python / JavaScript, GET + POST) + playground `requests/`; E2E blocks every called host.
- [ ] 7 Presentation fit (Result pane across steps, clicker keys from the pane, high zoom) + authoring/upgrade docs.
