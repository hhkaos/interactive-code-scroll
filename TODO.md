# TODO

## Next

- [ ] **Scroll/keyboard step engine**: client runtime (port `spike/astro/src/scripts/app.ts`): active step by center line, file switch, region focus + gray-out, carousel, deep links (`scroll-margin-top`, wait for Calcite hydration), progress indicator.

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Dev mode: re-validate MDX when `code/` or `images/` change (today validation is stale until the MDX is edited); center the error overlay on the failing MDX line (`loc`).
- [ ] Forms → variables (persist, secret + reveal toggle).
- [ ] Preview page (iframe + new tab, debounce + Run, `oauth-callback.html`), key forwarding from the preview.
- [ ] Remove prototype code from `spike/` once the client runtime and Preview are ported (keep `spike/FINDINGS.md`).
- [ ] Image carousel.
- [ ] Downloads: single file, project ZIP, copy to clipboard.
- [ ] Layout: resizable splitter (remembered), light/dark toggle, high-zoom readability.
- [ ] Presentation mode.
- [ ] CLI: dev, build, serve; print OAuth redirect URIs.
- [ ] `pnpm create interactive-code-scroll` scaffolder.
- [ ] Multi-tutorial repos with index page; GitHub Pages workflow.
- [ ] Finalize MDX component syntax (open question in `SPEC.md`).
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.
