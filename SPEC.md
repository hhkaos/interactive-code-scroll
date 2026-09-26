# InteractiveCodeScroll

> A framework for building guided, interactive code tutorials (in the style of the [Stripe Checkout quickstart](https://docs.stripe.com/checkout/quickstart)) by writing MDX and annotating source code — designed both for self-paced reading and for projecting at conferences.

---

## Problem

Today, technical tutorials are read step by step with the code split into many separate blocks (e.g. [ArcGIS Esri Leaflet – Find places nearby](https://developers.arcgis.com/esri-leaflet/places/find-places-nearby/)).

At conferences (e.g. explaining user authentication with OAuth 2.0 in the ArcGIS Maps SDK for JavaScript):

- Existing documentation UIs are not designed for projection: navigation bars and extra page elements add noise, and the experience is not interactive.
- Presenters open their IDE and walk through the code step by step.
- Many sessions are not recorded; remembering the steps and reproducing them at home is not trivial.

---

## What this is

A library/tool/"framework" that lets technical writers, devrels and speakers easily create guided, interactive tutorials. The author writes MDX (text for the left panel) and annotates source code; the build produces a static website with documentation and code side by side, synchronized by scrolling. It serves both for presenting in a talk and for attendees to reproduce the tutorial afterwards.

---

## Core features (v1)

### Layout
- **Side-by-side**: documentation (left) and code (right).
- **Resizable splitters** between docs and code, and between code and Preview; sizes are remembered. A handle on the docs/code splitter hides/shows the explanations.
- **Logo** (optional, `logo` frontmatter, a file in `images/`): shown in the header and used as favicon. Square SVG, or PNG of at least 512×512.
- **Light + Dark** with a manual toggle (remembered). The author sets the tutorial's default with the `theme` frontmatter (`auto` = `prefers-color-scheme`, the default; `light`; `dark`). The code panel and the Preview iframe follow the page mode (the iframe's `prefers-color-scheme` follows it, so apps using `calcite-mode-auto` match).
- **Look and feel**: Esri corporate (Calcite Design System). Calcite components are styled only through their tokens, props and slots.
- **Readable at high zoom**: code and text must stay readable when the browser font size is increased (CMD+"+" or similar).

### Code model
- **Final code + highlighting** (like Stripe): each file exists in its final version; steps only highlight regions. No incremental code per step.

### Scroll-driven focus
When a step comes into focus, its text block can:
- highlight parts of the code (focus + gray out the rest + auto-scroll so the whole region is visible when it fits, else its start; no scroll when it is already in view),
- switch from one file to another (`server.js`, `checkout.html`, etc.),
- switch the right panel from code to an image or image carousel.
- A step with a `file` and no `region` shows that file with no focused lines; a text-only step (no `file`) keeps the current file visible but also clears any previous focus.

### Step navigation
- **Free scroll**: the active step is determined by scroll position (the step crossing the center line; back at the top, the first step).
- **Click**: clicking a step (outside its links and fields) activates it; short steps and the first ones may never cross the center line.
- **Numbered steps**: each step's heading shows its number (as in "Step N of M").
- **Keyboard / clicker**: arrows and PageDown/PageUp jump to the next/previous step with snapping (compatible with presentation clickers).
- **Deep link per step**: URL with `#step-id` to share or resume.
- **Progress indicator**: a bar under the header; "Step X of N" text in presentation mode.

### Image carousel
- Step keys (arrows, PageUp/PageDown, clickers) first page through the carousel's images; past the last image they move to the next step, before the first image to the previous step. Entering a carousel step backwards starts at its last image.
- The carousel's own controls also work.
- Clicking an image opens it in a full-screen viewer; step keys keep paging the images there, and leaving the step's images (or Esc) closes it.

### Preview
- **Optional**: the author can disable it per tutorial.
- **Configurable mode** per tutorial: embedded **iframe**, **open in new tab**, or **both**.
- **Preview page**: both modes load a same-origin preview page (`preview/`) that renders the current files (form values applied). Client-side only. Not `srcdoc`/blob: the ArcGIS Maps SDK derives the OAuth `redirect_uri` from `location`, which is `about:srcdoc` there.
- **Iframe mode**: iframe pointing at the preview page, collapsible to a header bar that keeps its controls (Run, open in new tab); sandbox `allow-scripts allow-popups allow-forms allow-same-origin` (same origin is required by the OAuth callback; tutorial code is trusted author code).
- **Per-step Preview state**: a step can set `preview="expanded"` or `preview="collapsed"` to open or collapse the iframe when that step becomes active; omitted or `preview="keep"` preserves the viewer's current state.
- **New tab mode**: opens the preview page in a new tab; OAuth can use a regular redirect.
- **Refresh**: automatic after form changes (~500 ms debounce) + manual Run/Reload button.
- **OAuth in iframe mode**: sign-in opens in a **popup** (ArcGIS Maps SDK `OAuthInfo` with `popup: true`) and returns via the tutorial's own `code/oauth-callback.html` (it is part of the tutorial: shown, explained, downloaded). Every `code/` file is published next to the preview page (`preview/<path>`, markers stripped), so relative references resolve there.

### Forms → variables
- Forms defined in MDX (left panel); filling them updates code variables in real time.
- **Default value**: the literal in the code is the single source of truth (default and field placeholder).
- **localStorage persistence**: configurable per field by the author (persist or not).
- **Secret fields**: the author can mark a field as sensitive → masked in the form and in the code, with a **visibility toggle** to reveal it when needed.
- Entered values are included in downloads.

### Download
- **Single file** (button on each file tab).
- **ZIP of the full project** with form values applied, runnable locally.
- **Copy to clipboard**.
- Framework markers (`#region`, `@var`) are stripped from rendered and downloaded code.

### Presentation mode
- "Full screen mode" that fully hides/collapses the navigation bar.
- Allows hiding/collapsing the explanations in the left panel.

### Authoring and DX
- **Dev mode** with file watching and live updates.
- **Strict validation**: if the MDX references a region, file, variable or image that does not exist, the build fails with a clear error (file, line, ID). In dev mode it is shown as a browser overlay without crashing the server.
- **Serve locally**: the CLI can serve the built site on localhost (fallback if conference wifi fails; Preview/OAuth still need network — plan B: images/carousel of the result).
- Supports **both layouts**: one tutorial per repo, or several tutorials in one repo (`/tutorials/<name>/`) with an index page.

---

## Key user flows

### Author (technical writer / devrel / speaker)

1. Creates a folder named after the tutorial.
2. Creates an MDX file in it with markdown and special components: the text blocks for the left panel.
3. Adds subdirectories with the required code in the same folder.
4. Marks regions in the code with `#region <id>` / `#endregion` comments.
5. Updates the markdown to link actions (highlight, switch file) via those identifiers.
6. Marks configurable variables with an inline comment (e.g. `const clientId = "DEMO_ID"; // @var clientId`) and defines the linked form in the markdown (including whether each field persists in localStorage and whether it is secret).
7. Adds images in one or more folders inside the tutorial.
8. Updates the markdown to indicate which blocks load which images.
9. Configures the Preview (disabled / iframe / new tab / both).
10. Works in dev mode (watch + live reload); reference errors show up as an overlay.
11. Builds (fails on broken references).
12. Publishes the result as a static page on GitHub Pages.

### End user (attendee / reader)

1. Opens the URL (optionally with `#step-id`).
2. Starts reading and scrolling the left panel (or navigates with the keyboard).
3. The right panel syncs where the markdown says so: highlights code, switches file or shows images.
4. Fills in forms and sees the code change in real time; the Preview refreshes automatically or with Run.
5. At any time copies or downloads a file, or downloads the project ZIP.

### Presenter at a conference

1. Opens the tutorial (GitHub Pages or served locally with the CLI).
2. Enables presentation mode (hides navigation; optionally the explanations panel).
3. Adjusts browser zoom and the splitter; picks light/dark depending on the projector.
4. Moves between steps with the clicker / keyboard; the progress indicator shows the position.
5. Fills in fields live; shows or hides secrets with the toggle.
6. Runs the Preview; the OAuth sign-in opens in a popup (iframe) or redirects normally (new tab).

---

## Out of scope (v1)

- Running backend code. (Must support 100% client-side flows, e.g. OAuth PKCE.)
- Incremental code per step (animated diffs).
- Bundling npm dependencies in the Preview (see Tech constraints).
- CMS or visual editor, for either the writer or the end user.
- Multi-language support.
- Custom themes (the UI uses Esri's Calcite Design System; light/dark only).
- Support for browsers without JavaScript.
- Mobile-first: the experience is desktop-first.
- Offline mode / PWA.
- Visual regression and automated accessibility tests.
- Analytics and SEO.

---

## Data model

| Entity | Key fields | Notes |
|---|---|---|
| Tutorial | folder, MDX file, preview config (disabled / iframe / tab / both) | Contains steps, code files and images. A repo can hold one or several |
| Step / Text block | id (deep link), MDX content, associated action | Fires its action when it comes into focus (scroll or keyboard) |
| Code file | path (`server.js`, `checkout.html`…) | Final version; downloadable individually or as ZIP |
| Code region | id | Marked with `#region <id>` / `#endregion`; referenced from MDX |
| Action | type: highlight / switch file / show image(s) | Links a Step to a Region, File or Image |
| Form | fields | Defined in MDX |
| Field ↔ Variable | variable name, persist (bool), secret (bool) | Variable marked with `// @var <name>`; default = code literal |
| Image / Carousel | image files | In tutorial folders; shown instead of code; manual navigation |

---

## Tech constraints

- Authoring in MDX.
- Output: static website publishable on GitHub Pages.
- UI with Calcite Design System (Esri).
- Desktop-first; requires JavaScript.
- TypeScript.
- pnpm.
- Tests: **unit with Vitest** (`#region`/`@var` parser, validation, variable substitution, ZIP generation) and **E2E with Playwright** (scroll/keyboard highlighting, file switching, form → code, download, presentation mode).
- Dependencies on recent, stable and secure versions.
- All repo content (code, comments, docs, commit messages) in English.
- **Tutorial code without a build step**: HTML/JS/CSS runnable as-is; dependencies via CDN (script tags / import maps, e.g. `js.arcgis.com`). The downloaded ZIP works by opening `index.html` or with a static server.
- **Code markup in comments**: tutorial source code must remain valid, runnable and lintable without the framework.
- **Technical base: Astro + MDX + Shiki** (decided after a spike; see Decisions and `docs/research/technical-base-spike.md`).
- **Tutorial folder layout**: `tutorial.mdx` + `code/` + `images/`.
- **Code markup rules** (enforced by the build):
  - `@var` targets the first string literal on its line; one `@var` per line; var names are unique per file. Runtime values replace the literal in place in the pre-highlighted code, escaped for its context (script string or HTML attribute).
  - Region ids are unique per file; regions may nest; empty regions are errors; `#endregion <id>` (optional id) must match the region it closes.

---

## Success criteria

- "OAuth PKCE with ArcGIS Maps SDK for JavaScript" tutorial published on GitHub Pages and used in a talk.

---

## Decisions

- **MDX syntax.** Frontmatter holds tutorial config; components hold steps and fields. The `title` is the page's h1 (header bar): the MDX should not repeat it as `#`.

  ```mdx
  ---
  title: OAuth 2.0 with the ArcGIS Maps SDK for JavaScript
  preview: both        # off | iframe | tab | both
  theme: auto          # auto (OS preference) | light | dark: default mode; the viewer's toggle wins
  logo: logo.svg       # optional, from images/: header logo and favicon
  ---

  <Step id="config" file="main.js" region="config">
  ## Configure the app
  <VarField name="clientId" label="Client ID" secret persist />
  </Step>

  <Step id="register-app" images={["oauth-step-1.png", "oauth-step-2.png"]}>
  </Step>
  ```

  One region per step for now (a future `region="a b"` stays backwards compatible). File paths are relative to `code/`, image names to `images/`.

- **Technical base: Astro + MDX + Shiki.** Build-time highlighting (Shiki dual themes), `@var` via in-place token substitution (no client-side highlighter), strict validation at build time, framework-free TypeScript on the client. Rejected: Code Hike (client highlighting fetches grammars from a third-party host at runtime, ~7× client JS, code-in-MDX authoring model) and TutorialKit (requires COOP/COEP isolation, which breaks the OAuth popup and is not possible on GitHub Pages).
- **Preview runs from a same-origin page, not `srcdoc`/blob** (spike finding): required for a valid OAuth `redirect_uri` and for the callback to reach `window.opener`.
- **Default Preview mode: `both`** (embedded iframe + "open in new tab"). The tab is the fallback when the OAuth popup is blocked.
- **Distribution: core npm package + `pnpm create interactive-code-scroll` scaffolder.** Generated projects depend on the core package, so improvements arrive via `pnpm update`.
- **Styling: plain CSS with CSS Modules, no SCSS.** Calcite is themed via CSS custom properties; native CSS nesting covers the rest.
- **OAuth redirect URIs: registered by the author.** The CLI prints the exact URIs to register (GitHub Pages and localhost), derived from the base path. The CLI never handles ArcGIS credentials.
- **Name: InteractiveCodeScroll** (brand, PascalCase); `interactive-code-scroll` for the repo and npm package (kebab-case).
- **License: Apache-2.0.**
- **Out of v1: analytics and SEO.**

---

## Open questions

- [x] Spike outcome: Astro + MDX + Shiki.
- [x] Concrete MDX component syntax — see Decisions.
- [ ] Not covered yet: advanced accessibility, framework versioning.
