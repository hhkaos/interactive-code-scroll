# TODO

## UI polish

- Embed steps: the "Open in new tab" action (`.embed-open`) floats over the embedded page. Show it in a strip (bar) instead, so it does not cover the page.
- Framework Fixture Tutorial, step 4 (`config`): the textarea `<VarField type="textarea">` leaves too little bottom margin.

## Step index and outline (SPEC: Step navigation, Step outline, Presentation mode; decision 2026-10-16)

Approved mockup v3: https://claude.ai/artifact/XgJaeCjnw3cDHbxaTj8KSg (private). Remaining (manual):
- Check `b` / `.` (step index) with a real clicker.

---

Bug: <VarField> values don't reach files the Preview loads indirectly, which breaks OAuth demos with ArcGIS REST JS.

Repro (tutorial with code/index.html, main.js, config.js, callback.html):
- config.js: `export const clientId = "YOUR_CLIENT_ID"; // @var clientId`
- main.js does `import { clientId } from "./config.js"` and calls ArcGISIdentityManager.beginOAuth2({ clientId, redirectUri, popup: true }).
- callback.html (popup redirect target) also imports ./config.js and calls ArcGISIdentityManager.completeOAuth2({ clientId, ... }).
- Enter a Client ID in the VarField, sign in from the Preview → the app sends "YOUR_CLIENT_ID".

Cause:
- buildPreviewHtml (dist/preview/build-html.js) only inlines <script src> and <link rel=stylesheet> referenced from index.html, with values applied (projectFiles(files, values())).
- Any other local file is fetched from /preview/<path>, which preview/page.astro's GET serves from disk with markers stripped and *code defaults*:
  - ES module imports (`import ... from "./config.js"`);
  - secondary pages such as an OAuth callback.html.
- REST JS completeOAuth2 needs the real clientId: it reads localStorage `ARCGIS_REST_JS_AUTH_STATE_<clientId>` and dispatches `arcgis-rest-js-popup-auth-<clientId>` on window.opener. The examples/oauth-pkce example only works because the Maps SDK callback page needs no clientId.

Expected: every code/ file the Preview loads (imported modules, fetched files, other .html pages opened in popups or iframes) sees the current form values, as the ZIP does.

Possible approach (your call):
1. Imported modules: when building the preview HTML, add import map entries (merged with any import map already in the entry HTML) that map each local module path, resolved against the preview URL, to a data:/blob: URL of its value-applied source. Mind modules that import other local modules: either rewrite their specifiers too, or map them all.
2. Secondary .html pages: publish them under preview/ as loader pages (like variantPreviewPage) that read their value-applied, inlined HTML from localStorage (one key per file, written by startPreview). That keeps a real same-origin URL, so OAuth redirect_uri and window.opener keep working.
3. Add a test with an OAuth-like setup: index.html + main.js importing config.js, plus callback.html importing config.js; assert both get the VarField value.
4. Document the limitation/behaviour in docs/authoring.md (Preview / VarField sections).

Context: tutorial at demos/credential-console-basics in the "working-with-arcgis-rest-js-dtseu-2026" talk repo currently works around it by putting the config in main.js (window.oauthOptions) and having callback.html read window.opener.oauthOptions. Once fixed, that tutorial can go back to a shared config.js.



## Ideas to triage

- Show authors?
- Review Google Codelabs navigation patterns (e.g. https://codelabs.developers.google.com/codelabs/the-lit-path?hl=en#5) and decide which to adopt or adapt: a table of contents (step overview, sense of progress, jump to any step) and a header with "XX mins remaining" ("Back" / "Next" buttons: done). The tool serves both as a tutorial and as a presentation, so check each idea against both uses (e.g. hide or collapse them in presentation mode) and against what the page already has (step navigation, progress).

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Phone layout follow-ups (rules in `SPEC.md` Layout → Phones): tooltips stay open after a tap (no hover on touch); hints by tap; `100dvh` so the virtual keyboard (VarFields) does not hide the layout; check on a real iOS and Android device.
- [ ] Re-enable the real ArcGIS SDK OAuth Preview E2E once the example tutorial UI has stabilized.
- [ ] Self-host the Calcite assets actually used (t9n `en` + used icons) so "serve locally" works without network (the full CDN asset folder is 27 MB / 6.8k files).
- [ ] Low priority (load already feels fast after the CLS fix, 2026-10-15): measure first with the throttled Playwright/Lighthouse run, then consider `<link rel="modulepreload">` for the page bundle in `<head>` (the module script sits at the end of a ~63 KB HTML) and splitting it (538 KB, 138 KB gzip): critical Calcite (navigation, action, progress) first, the rest (carousel, dialog, combobox, JSON tree…) through `import()`.
- [ ] ArcGIS starters as scaffolder templates (`arcgis-js`, `arcgis-rest`, `arcgis-python`, `arcgis-kotlin`), after 2.3.
- [ ] `interactive-code-scroll add`: add a tutorial to an existing project (single → series conversion included).
- [ ] Review with Calcite experts whether `calcite-shell` / `calcite-shell-panel` could replace the page grid (`div.layout`); requirements in PROJECT.md "Page layout".
- [ ] Embedded pages, phase 2: step keys page through a same-origin slide deck before moving steps (as in the carousel). Rules: `SPEC.md` (Embedded page).
- [ ] Publish the "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial.
- [ ] Idea raised 2026-10-15, not needed yet: if series cards get 6+ variants, a compact "Available in 6 languages" band with logo-only links, each keeping its name as accessible name and never hiding it behind a hover tooltip (touch has no hover; shared logos such as ArcGIS API for Python / ArcGIS REST JS would be ambiguous). Today: at most four logo + label links, else three and "+N". Rules: `SPEC.md` (Variant links and tag logos).
- [ ] Optional `logoDark` (tutorial, variant, `tagGroups` entries and `index.mdx`): same rules as `logo`. Card tag logos, variant links and the variant switcher render both images and CSS on `.calcite-mode-dark` picks one; the page header thumbnail (and favicon) follow the theme toggle from the client. Today logos must read on both backgrounds.

## VarField input types (#3)

- [ ] JSON arrays (after the widgets): `json=` pointing at an array of strings, edited by a multi-input (add/remove values, e.g. HTTP referrers) or a multi-select `combobox` with `options` (e.g. privileges). `JSON.stringify` keeps the data valid; the code panel shows the array on one line (`["a", "b"]`) in place of the original tokens, so the original formatting and per-item colors are lost (re-rendering lines instead is more work). Est. 2–3 days. Pattern for code in other languages: import the JSON (`import config from "./key-config.json" with { type: "json" }`). Arrays in each language's syntax, objects and `null` stay out.
- [ ] Optional: a prop to let a field with a non-empty default be cleared to an empty value (today an empty field restores the default; an `""` default already works).
- [ ] `<VarField type="date" format="…">`: tokens `YYYY MM DD HH mm` (a `datetime-local` input when the format has a time) and `x` (epoch milliseconds, for number vars); the code default must match the format.
- [ ] A checkbox variant for boolean vars (`type="checkbox"`) if authors ask for it; the switch is the default.

## Project website and repository presentation

_Rules: `SPEC.md` (Project website and repository presentation)._

- [ ] F1: npm package READMEs aligned with the root README.
- [ ] F4: community showcase list (from showcase issues), social preview image (1280×640), GitHub release, announcement.

## Multi-SDK support

_Plan: `docs/dev/research/arcgis-multi-sdk-plan.md`. Update `SPEC.md` before implementing each phase._

Phase 1 — REST vertical slice (cURL / Python / JavaScript): done, go/no-go GO (2026-09-30). Next: Phase 2; Phase 2 is done (2.1–2.5), released as 0.2.0-beta.0. Next: Phase 3 (result views + renderer plugins) after a go/no-go review.
