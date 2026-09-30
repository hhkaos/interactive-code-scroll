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
- [ ] F1: repository description and topics (`gh repo edit`).
- [ ] F2: VHS terminal recording (`.tape` script, GIF for the README, video for the landing "Start in 30 seconds" section in place of the static terminal); needs the core `0.2.0-beta.0` on npm.
- [ ] F2: set the repository homepage to `https://www.rauljimenez.info/interactive-code-scroll/` once the site is deployed.
- [ ] F3: Starlight docs under `/docs/`, sourced from `docs/*.md`. Handoff (2026-09-30):
  - `@astrojs/starlight` approved by the owner (dependency of `site/` only); pick the latest stable version compatible with Astro 7.3.5 and justify it.
  - Same visual line as the landing: dark by default, the tokens in `site/src/styles/global.css` (colors, accent gradient, system fonts), the logo in `site/public/logo.svg`, and the `ics:theme` storage key so landing, docs and tutorials share the theme choice. Get owner approval on screenshots before publishing.
  - Single source: keep `docs/*.md` as the source (GitHub links and the npm README point there); do not fork copies into `site/`. Sidebar order: Quick start, Features, Authoring reference, CLI, Deployment, Upgrade guide. `docs/dev/` stays out of the site.
  - Then point the landing's Docs links (`site/src/pages/index.astro`, `${docs}/…`) and the README to `/docs/`, extend `e2e/site.spec.ts` (docs pages resolve under the base, theme shared), and keep `publish-site.yml` unchanged if possible.
  - Watch for: the base path rule (no `import.meta.env.BASE_URL`), the `cookie` `noExternal` workaround and the dev folder-index middleware in `site/astro.config.mjs`.
- [ ] F4: community showcase list (from showcase issues), social preview image (1280×640), GitHub release, announcement.

## Multi-SDK support

_Plan: `docs/dev/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 1 — REST vertical slice (cURL / Python / JavaScript): done, go/no-go GO (2026-09-30). Next: Phase 2; Phase 2 is done (2.1–2.5), released as 0.2.0-beta.0. Next: Phase 3 (result views + renderer plugins) after a go/no-go review.
