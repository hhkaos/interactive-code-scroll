# TODO

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Re-enable the real ArcGIS SDK OAuth Preview E2E once the example tutorial UI has stabilized.
- [ ] Self-host the Calcite assets actually used (t9n `en` + used icons) so "serve locally" works without network (the full CDN asset folder is 27 MB / 6.8k files).
- [ ] ArcGIS starters as scaffolder templates (`arcgis-js`, `arcgis-rest`, `arcgis-python`, `arcgis-kotlin`), after 2.3.
- [ ] `interactive-code-scroll add`: add a tutorial to an existing project (single → series conversion included).
- [ ] Review with Calcite experts whether `calcite-shell` / `calcite-shell-panel` could replace the page grid (`div.layout`); requirements in PROJECT.md "Page layout".
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.

## Project website and repository presentation

_Rules: `SPEC.md` (Project website and repository presentation)._

- [ ] F1: repository labels (`showcase`, `enhancement`, `bug`) and GitHub private vulnerability reporting enabled; npm package READMEs aligned with the root README.
- [ ] F1: repository description, topics and homepage (`gh repo edit`), once the site exists.
- [ ] F2: `site/` landing page (Astro) + logo + VHS terminal recordings; Pages workflow publishes the site with getting-started under `/demo/getting-started/`.
- [ ] F3: Starlight docs under `/docs/`, sourced from `docs/*.md`.
- [ ] F4: showcase (REST geocode, OAuth PKCE, community list + submission issue template), social preview image, GitHub release, announcement.

## Multi-SDK support

_Plan: `docs/dev/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 1 — REST vertical slice (cURL / Python / JavaScript): done, go/no-go GO (2026-09-30). Next: Phase 2; Phase 2 is done (2.1–2.5), released as 0.2.0-beta.0. Next: Phase 3 (result views + renderer plugins) after a go/no-go review.
