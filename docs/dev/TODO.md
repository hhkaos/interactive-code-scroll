# TODO

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Re-enable the real ArcGIS SDK OAuth Preview E2E once the example tutorial UI has stabilized.
- [ ] Self-host the Calcite assets actually used (t9n `en` + used icons) so "serve locally" works without network (the full CDN asset folder is 27 MB / 6.8k files).
- [ ] ArcGIS starters as scaffolder templates (`arcgis-js`, `arcgis-rest`, `arcgis-python`, `arcgis-kotlin`), after 2.3.
- [ ] `interactive-code-scroll add`: add a tutorial to an existing project (single → series conversion included).
- [ ] Review with Calcite experts whether `calcite-shell` / `calcite-shell-panel` could replace the page grid (`div.layout`); requirements in PROJECT.md "Page layout".
- [ ] Embedded pages, phase 2: step keys page through a same-origin slide deck before moving steps (as in the carousel). Rules: `SPEC.md` (Embedded page).
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.

## VarField input types (#3)

- [ ] JSON arrays: `json=` pointing at an array of strings, edited by a multi-input or multi-select field (`JSON.stringify` keeps it valid).
- [ ] Empty `@var` defaults (`""`) never update in the code panel (`highlight()` drops zero-width vars); optional fields must also accept an empty value.
- [ ] More widgets that fill a string: `select`, `radio`, `textarea`, `combobox` (single, with search), `date` with a `format`; `options` inline or from a JSON file in `field-options/`.

## Project website and repository presentation

_Rules: `SPEC.md` (Project website and repository presentation)._

- [ ] F1: npm package READMEs aligned with the root README.
- [ ] F4: community showcase list (from showcase issues), social preview image (1280×640), GitHub release, announcement.

## Multi-SDK support

_Plan: `docs/dev/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 1 — REST vertical slice (cURL / Python / JavaScript): done, go/no-go GO (2026-09-30). Next: Phase 2; Phase 2 is done (2.1–2.5), released as 0.2.0-beta.0. Next: Phase 3 (result views + renderer plugins) after a go/no-go review.
