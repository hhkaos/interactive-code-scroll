# TODO

## Next

- [ ] **Preview**: `preview/` page (iframe + new tab, ~500 ms debounce + Run, `preview/oauth-callback.html`), `preview` frontmatter modes, key forwarding from the preview (port `spike/shared/preview.ts`).

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Dev mode: re-validate MDX when `code/` or `images/` change (today validation is stale until the MDX is edited); center the error overlay on the failing MDX line (`loc`).
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
