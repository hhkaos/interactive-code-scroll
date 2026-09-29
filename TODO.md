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

- [ ] 6 REST example tutorial (cURL / Python / JavaScript, GET + POST) + playground `requests/`; E2E blocks every called host.
- [ ] Maximize pane: maximize icon on the code panel, web Preview and Result pane headers (fills the window; icon or Esc restores the layout and splitter sizes; one pane at a time; step keys keep working; not remembered), `maximize="code|preview|none"` per step (build error with `preview="collapsed"`).
- [ ] 7 Presentation fit (Result pane across steps, clicker keys from the pane, high zoom) + authoring/upgrade docs.
