# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Console object trees no longer draw a native list bullet over the preceding log label.

### Added

- Live Console has a dedicated Features section, light/dark screenshots captured from a real Preview interaction, a screenshot scene that regenerates them without credentials, a landing page highlight, and links to the authoring reference and migration guide. Unreleased availability is explicit for authors.
- Console entries show a source file and line when available; inlined scripts and substituted modules preserve source names and cleaned-code line numbers. Collapsed summaries now color keys and scalar types like DevTools. A collapsible help explains selecting the Preview iframe context in browser DevTools and filtering to that context.
- Embedded Preview / Console tabs capture real `console.log/info/warn/error` calls as bounded, in-memory snapshots with labeled entries, severity, collapsible colored JSON trees and compact property previews. Tabs, collapse and maximize preserve the running iframe and its logs; Run resets the log. Capture works in dev and static builds, without adding code to the tutorial app.

### Changed

- The embedded web pane is headed "Output", with "Preview" and "Console" as its tabs; the heading stays consistent when collapsed or selected by a step.
- Console snapshot and DevTools guidance now share one collapsible footer below the scrolling messages, labeled "Live output · Objects captured at log time · DevTools" The help clarifies that messages are live and objects preserve their values when logged; selecting a step does not run code. The separate toolbar and manual Clear button have been removed.
- **Breaking authoring change:** `<Step>` and `<Intro>` now use `panel="preview|console|result|collapsed"` to select and open the lower pane or fold it. Omitted keeps the reader's state. This replaces their `preview="expanded|collapsed|keep"` prop; `maximize="preview"` becomes `maximize="panel"`. Frontmatter `preview` is unchanged. Validation includes migration guidance; examples, fixtures and authoring/upgrade docs use the new API.

## [0.2.0-beta.9] - 2026-10-17

### Changed

- Read aloud keeps playing in presentation mode, with the audio row shown while active; Alt+Shift+L starts it there. Hiding the explanations pauses it, and starting while they are hidden announces "Show the explanations to listen".
- Read aloud reads collapsed `<details>`: the summary, then a short pause, then the section opens and its content is read. `data-speech="skip"` keeps any element (e.g. a solution) out of narration.

### Fixed

- Read aloud and `<Hint>`: the hinted term was skipped and the hint text was mixed into the sentence, splitting it; the reveal scroll then jumped to the hidden popover's position and could activate an earlier step. The term is now read in its sentence, and the hint text follows it as an aside between short pauses, with its popover open next to the term.

## [0.2.0-beta.8] - 2026-10-17

### Added

- Read aloud: a compact Listen button next to the step position opens an audio row with pause/resume, stop, speed and voice settings, with opt-in automatic step advance. Narration highlights sentences and, where supported, words without changing the selection. Fields, requests and presentation mode pause playback. Alt+Shift+L controls playback outside fields. Voice, speed and automatic advance are remembered in localStorage without starting playback on return. No new dependencies.

- Intro meta line: `duration` (clock icon) and `level` (the series card's difficulty bars, or a gauge icon for other values) show next to "Updated" above the explanations when set, in single tutorials too; hidden in presentation mode. The card and the line share one level icon component.
- Step outline: `<Intro outline>` and `<Step outline>` (e.g. a mid-tutorial recap) show the step list in the code area, headed "Steps", with the same checks, current step and click-to-jump as the step index; larger in presentation mode, where it reads as an agenda slide. It replaces only the code, under the code panel's header (language switcher, tabs and ZIP stay; a tab click shows that code until the next step); tutorials without code show it in the media panel. The list takes up to 4 columns to fit the pane's height. An `<Intro>` with no `file`, `images` or `embed` shows it by default; frontmatter `outline: false` (per tutorial, or as the series default in `index.mdx`) keeps the previous behavior. Build errors: `outline` with a value, or combined with `file`, `region`, `images` or `embed`.
- Step index: the Back / Next position ("5 / 10", with a list icon) opens a list of the reachable steps, headed "Step 5 of 10", with a check on the steps before the current one and the current one marked. Clicking a step jumps to it; step keys move the real step while the list is open and the list follows; Esc, a click outside or the button close it. A native `popover` anchored above the button, a bottom sheet over a scrim on phones, with a short scale/fade and staggered entrance (none with reduced motion). Steps for other variants (`otherVariantSteps: notice`) are dimmed and name their variants; hidden ones are left out. Esc closes it before a maximized pane or presentation mode.

- Presentation mode: the header's "Step 5 of 10" ("Introduction" at the intro) is a button that opens the step index as a large centered list over a scrim, with the tutorial's title and a key hint; step keys move the real step while it is open, and leaving presentation mode closes it. Single-key shortcuts, only while presenting and never in fields: `O` (and `b` / `.`, which many clickers send from their "blank screen" button) opens and closes the index, `E` shows and hides the explanations. Alt+P (Option+P) enters and leaves presentation mode. A lone Alt press, outside fields, shows a floating strip with the keys of the current mode. In browser full screen, Chromium browsers lock Esc for the page (Keyboard Lock API), so Esc goes one level at a time there too (dialog, step index, maximized pane, presentation mode; holding Esc leaves full screen); Firefox and Safari keep taking the first Esc. Unit tests in `client/navigation.test.ts`; E2E in `e2e/presentation.spec.ts`.
- Docs: step index, step outline (`outline` on `<Intro>` and `<Step>`, frontmatter `outline`, build errors), presentation shortcuts and the Alt hint in the authoring guide, features, presenting guide, upgrade guide and README.

### Changed

- Explanations handle: "Hide explanations" fades in only while the pointer is on the splitter (short delay in, longer delay out) or on keyboard focus, and is always shown on touch screens. With the explanations hidden, a thin rail at the left edge replaces the floating handle, and the whole rail shows them again.
- Landing page: Read aloud joins the feature cards. The feature guide describes its controls and remembered preferences, and the architecture documents narration, highlighting and step-engine integration through the Outro.

- Progress bar: a 6px bar right under the header (it used to be Calcite's strip on the header's top edge) with one flush segment per visible step, colored seen, current or pending; full on the closing panel. It is a `role="progressbar"` with `aria-valuenow` and `aria-valuetext` ("Step 5 of 10", "Introduction", "Done") instead of a `calcite-progress` value. Not clickable.

### Fixed

- Narration reads the closing panel heading and author-written `<Outro>` when reached manually or through automatic advance. It stops after the closing prose, excluding action links and recommendations.

- Preview: form values now reach files the app loads itself, not only the scripts and stylesheets `index.html` links: imported modules (e.g. a shared `config.js`, through an import map to `data:` copies), files read with `fetch()`, and the project's other HTML pages (e.g. an OAuth `callback.html`), now loader pages at their own URL under `preview/` that run the tutorial's latest copy (code defaults when opened without it). Other HTML pages are embedded in the tutorial page even without a tab, so the ZIP keeps their real content.
- The closing slide's QR code could stay empty under `astro dev` (the slide showed only the URL): Vite found `qrcode-generator` at runtime, re-optimized and answered the lazy import with "504 Outdated Optimize Dep". The integration now pre-bundles the browser's lazy dependencies (`qrcode-generator`, `fflate`) at dev start. If the encoder still fails to load, the slide hides the empty box and keeps the URL, and the console says why. Unit test in `index.test.ts`; E2E in `e2e/series.spec.ts` (the QR code is now checked too).

## [0.2.0-beta.7] - 2026-10-16

### Added

- Ask about a selection: selecting text in the explanations (two words or more) or in the code panel (three characters or more) shows a floating toolbar with "Ask the author" (`feedbackUrl` with new `{context}`, `{selection}` and `{url}` placeholders; the closing panel fills them empty) and "Ask AI" (ChatGPT and Claude prefill links, or custom `{ label, url }` assistants with an optional `{prompt}`). The context carries the tutorial, the step, a link back with a text fragment and the selection (code: file, lines, secret values masked, cut at 500 characters); AI actions also copy the prompt and say so. Not shown on touch input or in presentation mode; Esc hides it. New frontmatter `ask` (list or `false`; series default in `index.mdx`), default `[author, chatgpt, claude]` (`author` only with a `feedbackUrl`; listed explicitly without one is a build error). Unit tests in `ask.test.ts`, `client/ask-values.test.ts` and `frontmatter.test.ts`; E2E in `e2e/ask.spec.ts`. Docs: authoring section, features section and landing highlight with a new `ask-oauth` screenshot (`site/scripts/screenshots.mjs`); the `oauth-pkce` example sets a `feedbackUrl` and an "Esri's Ask AI" custom assistant.
- Project website: a "Desktop and mobile" landing highlight showing the same tutorial step in an all-in-one monitor and a phone in front of it (`site/src/components/Devices.astro`, generic CSS frames without product logos), with a new `phone-oauth` screenshot; `site/scripts/screenshots.mjs` supports phone scenes (`device`) and zoomed crops (`crop`). README lists desktop and mobile support.
- Frontmatter `updated: YYYY-MM-DD` (last content update, set by hand): "Updated Oct 16, 2026" with a calendar icon on the series index card's meta line and as a small line above the explanations (single tutorials too; hidden in presentation mode). Quoted or as YAML's date; an invalid or impossible date is a build error. Custom index pages get `updated` on each `tutorials` entry. Unit tests in `frontmatter.test.ts`; E2E in `e2e/series.spec.ts`.
- Closing slide in presentation mode: past the last step the clicker opens the closing panel as a full-screen slide, with the `<Outro>`, the next tutorial and a QR code of the tutorial's URL as large as the screen allows (no reader actions). The QR URL is frontmatter `presentationUrl` (per tutorial or as the series default in `index.mdx`, `{slug}` filled in), else Astro `site` + the tutorial's path, else the page URL. PageUp returns to the last step; Esc leaves presentation mode on the panel. New dependency `qrcode-generator` 2.0.4 (MIT, no dependencies), loaded only in presentation mode. The virtual tutorial module now exports `site`. E2E in `e2e/presentation.spec.ts` and `e2e/series.spec.ts`.
- Closing panel after the last step. At the last step (and its last image) "Next" becomes "Finish", which scrolls to a panel at the end of the explanations: a check icon, "You've completed <title>", the author's `<Outro>` text and actions: next tutorial (series: frontmatter `next: <slug>`, else the next one in index order; `next: false` for none), "Download code", "Open preview" (with a Preview tab), "All tutorials" (series) and "Send feedback" (`feedbackUrl`, per tutorial or as the series default in `index.mdx`, with `{slug}` and `{title}` filled in). The position reads "Done" and the panel takes the active step's marking (the last step stays active for the code panel); Back and the step keys return to the last step; scrolling to the panel completes the tutorial too. Frontmatter `completion: false` removes it. New `<Outro>` component (no props, once, after the last step). Build errors for an unknown or self `next`; a warning for `next` outside a series. Behavior change: Next is no longer disabled at the last step of tutorials that keep the panel. Unit tests in `completion.test.ts`, `frontmatter.test.ts`, `navigation.test.ts` and `validate.test.ts`; E2E in `e2e/step-engine.spec.ts`, `e2e/series.spec.ts` and `e2e/variants-hide.spec.ts`.
- Phone layout. Below 40rem wide the page stacks: code on top, explanations below at full width with the Back / Next bar, no splitters, explanations handle or Present button. On phones in either orientation (below 40rem wide, or a touch screen below 30rem high and 60rem wide, so a desktop window at 200 % zoom keeps its panes) copy, download and ZIP are hidden and the Preview / Result pane keeps only its header; tapping its title opens it maximized and restores the layout. The tutorial header title is now our own block (logo + `h1`) instead of `calcite-navigation-logo`, with the same desktop look: it shrinks to the room the series home, sibling menu and actions leave and ends in an ellipsis, so they stay on screen with no page-level horizontal scroll at any width. On phones it has no logo and a smaller title, and the sibling menu becomes its second line ("REST API ⌄", aligned with the title); tapping the title opens the menu, headed by the full title when it is clipped; without siblings a clipped title opens in a popover. Calcite needs we could not meet are listed in `docs/dev/research/calcite-gaps.md`. Unit tests in `layout-values.test.ts`; E2E in `e2e/phone-layout.spec.ts` (390×844, 844×390 and 200 px) and `e2e/series.spec.ts`.
- Back / Next buttons in a bar pinned to the bottom of the explanations, with the position ("3 / 9"; "9 steps" at the intro). They move like the step keys (carousel images first; Back from the first step returns to the intro); Back is disabled at the intro and Next at the last step. Always shown, not an author option; hidden in presentation mode and with the explanations hidden. The explanations column is now `div.docs-column` (`main.docs` plus `nav.step-nav`). SPEC also plans a stacked layout for phones. Unit tests in `navigation.test.ts`; E2E in `e2e/step-engine.spec.ts` and `e2e/presentation.spec.ts`.

### Fixed

- Entering or leaving presentation mode (and leaving browser full screen) could switch to another step: the explanations change height (the Back / Next bar hides, the browser toolbar comes back), the center line moves and the step crossing it became active. The step engine now keeps the active step (or the closing panel) centered on height changes too, as it already did on width changes. E2E in `e2e/presentation.spec.ts`.
- A tutorial with a single code variant no longer shows a one-option variant switcher (one variant is no choice, as on series cards). E2E in `e2e/series.spec.ts` (`delta`).
- Presentation mode no longer leaves the ZIP count badge behind when it hides the download actions. E2E in `e2e/presentation.spec.ts`.

## [0.2.0-beta.6] - 2026-10-16

### Added

- `<VarField type="radio" layout="horizontal">` puts the radio buttons in a row (`vertical`, stacked, stays the default). `layout` on another type, or another value, is a build error. Documented in the authoring reference and SPEC. Unit tests in `validate.test.ts`; E2E in `e2e/vars.spec.ts` (the fixture's Key slot field is now horizontal).
- File switches between steps stand out: a step that shows another file than the one before it names that file in a chip on its heading row (following the active variant); when the step becomes active, the new file tab flashes the brand color, the code pane fades in before scrolling to the region (one movement at a time), and a polite live region announces "Showing <file>". No animation on deep-link restore or tab clicks; `prefers-reduced-motion` drops the slide and the scroll delay. Unit tests in `file-change-values.test.ts`; E2E in `e2e/step-engine.spec.ts` and `e2e/variants.spec.ts`.
- `<Intro file="…">`: the intro shows a file tab, with no focused lines, on load and each time the reader returns to it (without `file` the code panel keeps the current file, as before). Same resolution and validation as on `<Step>`; with variants every variant must have the file (the intro has no `only`). Not combined with `images` or `embed`; `region` stays a build error. The intro's file comes first in the step order of the tabs. The unknown-prop error now reads `(only preview, maximize, file, images, embed)`. Documented in the authoring reference, Features and SPEC. Unit tests in `validate.test.ts`; E2E in `e2e/intro-media.spec.ts` on the new `intro-file` tutorial of `fixtures/framework-fixture-media`.
- Tables in the explanations are styled: left-aligned semibold headers over a 2px rule, hairlines between rows, `sm` text, the first column as the row label, and outer edges aligned with the text. Long cell content wraps instead of widening the panel. E2E in `e2e/tutorial-page.spec.ts` (new table in the `callback` step of `fixtures/framework-fixture`).

### Changed

- Sibling tutorial menu: an outlined button showing the current label after a short divider, with even 16px gaps between title, divider and button; the visible "Tutorial for:" prefix is gone (the accessible name keeps it) and the menu's group title reads "Same tutorial for". Menu entries show each sibling's logo (its tutorial `logo`, else its first variant logo); when any sibling has one, the others keep an empty slot so labels line up. The button no longer keeps Calcite's focus ring after a mouse click; keyboard focus still shows it. E2E in `e2e/series.spec.ts`.

- The explanations no longer cap line length at 70ch: text and fields use the panel's width when the reader widens it. Consecutive `<VarField>`s are grouped at MDX compile time and laid out in as many columns as the panel fits (one column at the default split; a textarea takes the whole row). This also fixes the combobox being narrower than other fields. Unit tests in `var-field-groups.test.ts`; E2E in `e2e/tutorial-page.spec.ts`.

- Notes (blockquotes) in inactive steps are neutral gray; only the active step's notes keep the brand bar and tint, so a previous step's note no longer looks like the active step. Code blocks in the explanations follow the page's light/dark mode with the code panel's themes (`github-light-default`/`github-dark-default`) instead of a fixed dark block; a project with its own `markdown.shikiConfig` `theme`/`themes` keeps them. Unit tests in `highlight.test.ts`; E2E in `e2e/tutorial-page.spec.ts` (new step note in `fixtures/framework-fixture`).
- Scaffolder: the series index choice and the generated `index.mdx` call `<TutorialFilter />` a search bar (was "tag filter"), and the `index.mdx` text suggests `<TutorialFavorites />` for growing series.

### Fixed

- File and Result tabs no longer keep Calcite's focus ring after a mouse click (Calcite 5.1.2 draws it on `:focus`); keyboard focus still shows it. E2E in `e2e/tutorial-page.spec.ts`.
- The reveal toggle of a `secret` `<VarField>` shows its bottom border: its inner button (32px min height) no longer paints over it. E2E in `e2e/vars.spec.ts`.
- A boolean `<VarField>` (switch) in a row of fields lines up with its neighbor's input instead of its label. E2E in `e2e/vars.spec.ts`.

## [0.2.0-beta.5] - 2026-10-15

### Added

- Series index: favorites. `<TutorialFavorites />` (in `index.mdx` or a custom index page, from `interactive-code-scroll/series`) adds a star toggle to every card and a "Favorites" section with the reader's favorite tutorials in series order. Stored per browser and site (`localStorage`, namespaced by `base`); the search, tag and level filters apply to the section, which hides when no favorite is shown. Without JavaScript there is no toggle and no section. Opt-in, since a series with a few tutorials does not need it.
- Series index: optional tag families, `tagGroups` in `index.mdx` frontmatter or the `<TutorialFilter tagGroups>` prop on a custom index page (family name → tags, in display order). Validated at build: a tag in two families, an empty family and a tag no tutorial has are errors. The search bar uses them to group, color and match tags.
- Series index: `<TutorialFilter>` is a search bar. Text search over titles, descriptions, tags and levels (case- and accent-insensitive, every word must match; applied 150 ms after the last keystroke) with highlighted matches; tag suggestions while typing (`calcite-autocomplete`); tag toggles with live counts (what each tag would show added to the current search; tags with no result leave the line and are disabled in the panel), as many of the most used as fit on one line, and "+N more" for every tag grouped by family; a level dropdown; tags match OR within a family and AND across families; "N of M tutorials", "Clear filters", `/` to focus, and the state in the URL (`?q=…&tags=…&level=…`). Without JavaScript the bar is hidden. Unhydrated autocomplete, select and small buttons keep their hydrated size (E2E compares the page with scripts blocked).
- Series index: variant links. A tutorial with two or more variants has an "Available in" band at the card foot with a link to each variant (`?variant=<id>`; at most four, else three and "+N"); selecting a variant's tag in the filter marks its link and makes the title open that variant. The card's title link is stretched over the card (no nested links).
- Series index: tag logos. A `tagGroups` entry can be `{ name, logo }` (a file in `tutorials/images/` or an `https://` URL; a missing file is a build error). A card tag with a logo (from `tagGroups`, else from the variant with that label) shows it instead of the family dot, and variant links use it.
- Build warning for a `<summary>` that MDX renders inside a paragraph (no blank line before the `<details>` content), with its MDX `file:line`.
- Series index: card levels `Beginner`, `Intermediate` and `Advanced` (any case) show difficulty bars, one to three filled, instead of the same gauge icon for every level; other level values keep the gauge.

### Changed

- Series index: variant labels are tags of their tutorial (search, filter, counts, `<TutorialList tags>`), deduplicated case-insensitively in the `tagGroups` spelling.
- Series index: cards no longer show the tutorial logo or variant logos next to the title (the tutorial `logo` stays for the page header and favicon). The public `SeriesCard` drops `variantLogos` and gains `tagLogos` and `variants` (`{ id, label, href, logo }[]`); cards are an `<article>` whose title is the link (`.series-card-title` is now the `<a>`); `<TutorialFilter tagGroups>` entries on a custom index page take no logo.
- Series index: card tags are plain labels with a family color dot instead of chip-styled pills (they were never clickable: the whole card is a link).
- Series index: the header content (logo, theme action) lines up with the centered `.series-main` column (`--calcite-navigation-width: 72rem`); the bar background stays full width.
- Tutorials without frontmatter `files` (or a variant without `files`) order their file tabs by the steps: first each file in the order a `<Step>` first shows it, then the rest by path (was path order for every file). Check your tabs after upgrading; set `files` to keep a different order.

### Fixed

- Tutorial disclosure blocks (`<details>`): the first content element no longer touches the open summary (1rem gap, collapsing with blocks that have their own top margin), so authors no longer need an inline `margin-top`. The OAuth PKCE example gets the blank lines MDX needs around `<details>` content (it rendered `<p><summary>`).
- Tutorial and series pages no longer jump or show unstyled content while Calcite loads (CLS 0.188 → 0 on a tutorial, 0.046 → 0.0003 on a series index, slow 4G + 4× CPU). Calcite's `main.css` is imported in the page frontmatter (a render-blocking stylesheet, also in dev, where a `<script>` import arrived late through JS) and before our CSS; `tutorial.css` gives unhydrated components their hydrated size (navigation, actions, icons, inputs, chips) and removes dialogs, tooltips and popovers from the flow (the image dialog took 672 px and squeezed the layout). E2E in `layout.spec.ts` and `series.spec.ts` compare the geometry with scripts disabled against the hydrated page.

## [0.2.0-beta.4] - 2026-10-15

### Added

- `<Intro images={[…]}>` and `<Intro embed="…">`: the intro shows images or a page instead of code, with the same resolution and validation as on `<Step>` (`images/`, `embeds/` or `https://`, `?query#fragment` kept, not combined). Moving to a step swaps the media as between steps; an embed of the same page with another fragment moves in place. When the intro has no media and the tutorial has nothing else to show next to it (no code tabs, no Preview, no step with `output` or `request`), it shows the media of the first step that has some, so a tutorial without code no longer opens on an empty pane; entering that step keeps the media as shown. Tutorials with code, a Preview or a Result pane are unchanged. The unknown-prop error now reads `(only preview, maximize, images, embed)`. Media markup shared by both components in `components/StepMedia.astro`. Documented in the authoring reference (`<Intro>` props, a no-code example, the fallback, common build errors) and in Features. Unit tests in `validate.test.ts`; E2E in `e2e/intro-media.spec.ts` on the new `fixtures/framework-fixture-media` (:4407) and `e2e/tutorial-page.spec.ts` (no fallback next to code).

### Fixed

- An embed step after another with the very same URL (fragment included) no longer reassigns the iframe `src`, which reloaded a page without a fragment.

## [0.2.0-beta.3] - 2026-10-15

### Added

- `code/` listing honors `.gitignore`: files a tutorial's scripts write locally (`state.json`, `output.csv`, a `build/` folder) are no longer published in the Preview, the tabs or the ZIP. Rules come from `.gitignore` files in `code/` and its subfolders and in the folders above it up to the git repository root (only the tutorial folder outside a repository), with git semantics (negation, `dir/`, anchored, `**`), case-sensitive, through the `ignore` package (new runtime dependency). Generated folders stay excluded and the dot-path rule is unchanged; frontmatter `include` now also opts in gitignored paths, with a build warning per pattern. A `<Step file>` or `files` pattern that points only at gitignored files is a build error naming the `.gitignore`; the `include` "matches nothing" error now reads `matches no path in code/ starting with "." or gitignored`. Design note in `docs/dev/research/gitignore-file-listing.md`. Unit tests in `tutorial-files.test.ts` and `validate.test.ts`, build test in `test/build.test.ts`; the main fixture gains a gitignored `state.json` and a `.env.example` shipped through `include` (E2E ZIP listing and count updated).

- Logos on series cards and per code variant. A series index card shows the tutorial's `logo` next to its title (decorative, 2rem box), or, when the tutorial has none, each distinct variant logo labeled with the variant's name; cards without logos are unchanged. Variants accept an optional `logo` (a file in `images/` or an `https://` URL, like the tutorial `logo`), shown before the label in the switcher (segmented control, dropdown items and trigger); the page header shows the active variant's logo, else the tutorial's, and the favicon falls back to the first variant logo. Build errors at the `variants` line for a non-string or missing variant logo. `SeriesCard` gains `logo` and `variantLogos`. Unit tests in `frontmatter.test.ts` (`cardLogos()`) and `validate.test.ts`; E2E in `e2e/series.spec.ts` (the series fixture's alpha gets a tutorial logo, beta variant logos).

- JSON regions: `<Step file="package.json" region="/dependencies">` highlights a member of a JSON file by JSON Pointer (RFC 6901), since JSON has no comments for `#region`; the file under `code/` stays valid for npm and other tools. The highlight runs from the member's key line to the end of its value and follows the key when the file changes; a range `region="/name../scripts"` highlights sibling members from the first key through the last value, with no line numbers. Build errors at the `<Step>` for a missing pointer, a range that is not siblings in order, a non-`.json` file, invalid JSON or a pointer without `file`; with variants the pointer is checked in every covered variant. Marker regions are unchanged and may overlap pointer regions. Unit tests in `json-vars.test.ts`, `validate.test.ts` and `highlight.test.ts`; E2E in `e2e/json-regions.spec.ts` on the new `fixtures/framework-fixture-json-regions` (:4406). Documented in the authoring reference (JSON regions, common build errors).

- `<VarField type>`: `textarea`, `select`, `radio` and `combobox` (single choice with search) besides the default text input; the value still fills the marked literal. Choice fields take `options`, inline (strings, numbers or `{ value, label }`) or from a JSON file in the tutorial's new `field-options/` folder (not published, watched in dev). Number vars accept choices with number values. Build errors for an unknown type, missing or misplaced options, a code default that is not an option, and props that do not fit the field. Line breaks typed in a `textarea` show as `\n` in the code panel. Part of #3. Unit tests in `field-options.test.ts` and `validate.test.ts`; E2E in `e2e/vars.spec.ts` (the main fixture's `report.py` gains a select, a radio, a combobox and a textarea, with `field-options/portals.json`).

### Fixed

- A `@var` whose default is an empty string (`const referrers = ""; // @var referrers`) never updated in the code panel: `highlight()` dropped zero-width vars, so the token had no `data-var` (downloads were fine). Empty literals now get an empty `data-var` token with the colors of the string. Part of #3. Unit test in `highlight.test.ts`; E2E in `e2e/vars.spec.ts` (`report.py` in the main fixture gains an optional `referrer`).

### Added

- JSON vars: `<VarField json="config.json#/a/b">` makes a value of a JSON file under `code/` a var by JSON Pointer (RFC 6901), since JSON has no comments for `@var`. The file stays valid JSON; strings, numbers and booleans are supported (type and default from the JSON), and a static array targets one file per variant. Build errors at the `<VarField>` for a malformed target, a missing file or pointer, or an array, object or `null` value; a JSON file with a `// @var` comment gets "comments are not allowed". The MDX validation hands the targets to the page through the tutorial's frontmatter. Second part of #3. Unit tests in `json-vars.test.ts` and `validate.test.ts`; E2E in `e2e/vars.spec.ts`, `e2e/downloads.spec.ts` and `e2e/tutorial-page.spec.ts` (the main fixture gains `settings.json`, sharing `maxResults` and `verbose` with `report.py`).

- Number and boolean `@var`s: a line without a string literal marks its first number or boolean literal, and `@var name:number` (or `:boolean`, `:string`) picks a type on mixed lines. The value replaces the unquoted literal, so tutorial code no longer needs `Number(...)` workarounds; booleans keep each file's spelling (`true`, `True`, `TRUE`, `$true`), and a value that is not of the var's type writes the default. `<VarField>` renders a number input or a switch for them; `secret` on a non-string var and `placeholder` on a boolean one are build errors, and a var must have the same type in every file. In YAML, a quoted key is never the target. First part of #3. Unit tests in `markers.test.ts` and `validate.test.ts`; E2E in `e2e/vars.spec.ts` and `e2e/downloads.spec.ts` (`report.py` in the main fixture gains a number and a boolean var).

## [0.2.0-beta.2] - 2026-10-14

### Added

- Terminal recording of the project wizard (one REST tutorial with cURL, Python and Node.js, then `npm run dev`): `site/recordings/start.tape` renders `site/public/recordings/start.{gif,webm,mp4,png}` with VHS (`pnpm record`). The landing "Start in 30 seconds" section plays the video in place of the static terminal (muted loop while visible; poster and controls with reduced motion or without JavaScript); the root README embeds it as a GitHub video attachment (the GIF stays for npm READMEs). E2E in `e2e/site.spec.ts`.
- Landing showcase: the "Security and authentication for custom applications" tutorial (published by Raul Jimenez for the Esri European DevTech Summit 2026) replaces the in-repo OAuth PKCE example's card, with an author line; cards of published tutorials credit their author. `examples/oauth-pkce` stays (docs screenshots) and is still built under `showcase/oauth-pkce/`. The README Examples entry links the live tutorial and its source.
- Landing live demo: browser-style tabs switch between the REST geocoding showcase and the published "Security and authentication for custom applications" tutorial (Esri European DevTech Summit 2026); the address bar shows each tutorial's real URL as a link, "Open full screen" follows the tab, arrow keys move between tabs, phones get one screenshot per tab, and a link points to the showcase. `site/scripts/screenshots.mjs` accepts scenes with an absolute `url` and scene names as arguments (`summit-user-auth`). E2E in `e2e/site.spec.ts`.

- `<Intro preview="…" maximize="…">`: the Preview / Result pane state while the intro is shown, applied on load without a `#step` and each time the reader scrolls or steps back to the intro (without them the pane keeps its state, as before). Same validation as on `<Step>`; other props on `<Intro>` are build errors. Documented in the authoring reference. Unit tests in `validate.test.ts`, E2E in `e2e/series.spec.ts` (the `delta` tutorial of `fixtures/framework-fixture-series` gains an intro state and a captured output). Closes #2.

- Frontmatter `include`: globs relative to `code/` that publish paths starting with `.` (e.g. `.github/**`, `.vscode/launch.json`, `.gitignore`). A pattern that matches nothing is a build error. Documented under "Files left out of the tutorial" in the authoring reference.

### Fixed

- Files nested in folders starting with `.` (`code/.venv/…`, `code/.hidden/…`) and in generated folders (`node_modules/`, `__pycache__/`, Python virtual envs, tool caches) were published under `preview/`, added to the ZIP and given tabs. Any path with a segment starting with `.` is now left out (in `code/`, `images/`, `embeds/`, `output/` and `requests/`) unless `include` lists it, generated folders are pruned without being read (faster builds after `npm install` in `code/`, no dev reloads from them), and the build warns about each skipped `code/` folder starting with `.`. Unit tests in `tutorial-files.test.ts`, `frontmatter.test.ts` and `validate.test.ts`; build test in `test/build.test.ts`. Closes #1.
- A step's `preview=` now also sets the Result pane on load: the pane starts after the step engine and missed the first state (a deep link to a `preview="collapsed"` step showed it expanded). Covered by the same E2E.
- Landing page: it no longer jumps to the live demo on load (or when the theme changes). The demo iframe loads without its `#step` (native fragment scrolling in a same-origin iframe also scrolls the parent page) and applies the step after load through the tutorial's `hashchange` handler. E2E in `e2e/site.spec.ts`.

## [0.2.0-beta.1] - 2026-10-09

### Added

- `<Step embed="…">`: shows a page in an iframe instead of code, from the tutorial's new `embeds/` folder (published as is, also in dev; e.g. a Slidev deck's static build, `embed="oauth-slides/#/3"`) or an `https://` URL. Build errors for missing paths, non-`https` URLs and `embed` with `images`. The next fragment of the same page navigates in place; PageUp/PageDown inside a local embed move steps and Esc restores a maximized pane; a floating "Open in new tab" action covers sites that refuse framing. Documented in the authoring reference. Unit tests in `embed.test.ts` and `validate.test.ts`, E2E in `e2e/embed.spec.ts` (two embed steps added at the end of `fixtures/framework-fixture`, which excludes `embeds/` from `astro check`).
- Project website (`site/`): a landing page (dark by default, light/dark toggle shared with the tutorials) with a copyable `npm create` command, the REST geocoding tutorial embedded as a live demo (scaled desktop view; a screenshot link on phones), a start-in-30-seconds section, features with light/dark screenshots, audiences, a showcase (REST geocoding, OAuth PKCE, community submissions), a built-in-the-open section (AI agents, Stripe inspiration, beta) with links to issues, and the GitHub star count once it reaches 10. `publish-site.yml` publishes it to GitHub Pages with the showcase tutorials under `showcase/<name>/`; `pnpm site` runs it locally (a dev-only middleware serves the showcase folders' `index.html`, which `astro dev` does not do for `public/`). New logo. Screenshots are regenerated with `pnpm --filter site screenshots` and shared with the README. E2E in `e2e/site.spec.ts`.
- Docs site: Starlight (`@astrojs/starlight` 0.42.4, `site/` only) under `<base>docs/`, rendered from the root `docs/*.md` without copies (title and description from each file's heading, sibling `.md` links rewritten to docs routes, `docs/dev/` and other repository files linked on GitHub). Screenshot `<picture>` pairs in the docs follow the OS on GitHub and the page theme on the website. Sidebar: Quick start, Features, Authoring reference, Presenting, CLI, Deployment, Upgrade guide; `<base>docs/` opens the quick start. Code shows without font ligatures (`<!--` stays as typed). "On this page" opens subsections only under the section being read. Same look as the landing (shared tokens in `site/src/styles/tokens.css`, logo, dark by default) and the same `ics:theme` choice. The landing page and README Docs links point to it. E2E in `e2e/site.spec.ts`.
- `docs/presenting.md`: a guide for talks and workshops (deep links, theme and zoom for the room, offline fallback, secrets on screen, presentation mode, clickers, maximized panes, Esc levels), moved out of the authoring reference, which keeps the `maximize` step attribute and links to it.
- Light/dark screenshots in `docs/features.md` (one per feature area) and `docs/presenting.md`; `site/scripts/screenshots.mjs` adds three scenes (`reading-oauth`, `forms-oauth`, `result-rest-text`).
- `examples/rest-geocode`: a `<Hint>` explains error 498 (and gives the docs a real hint to show).
- `docs/quick-start.md`: from `npm create interactive-code-scroll` to a published first tutorial, as one linear page.
- Community files: `CONTRIBUTING.md` (setup, repository layout, PR rules, working with AI agents), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md` (private vulnerability reporting, scope notes on persisted field values), issue forms (bug report, feature request, showcase submission) and a pull request template.

### Changed

- Rewrote the authoring reference (`docs/authoring.md`, now "Authoring Reference") for learners and for lookups: it opens with "How a tutorial works" (the smallest tutorial: one step and one `index.html` region, MDX first, and why the Preview appears; then the terms used) and a "Choose your setup" table; sections follow the learning order (series sites and siblings moved to the end); the folder structure starts from the project wizard; frontmatter fields grouped by purpose (page, code and Preview, series index and siblings); a component index and uniform Values/Default tables; `<Step>` examples (including the `images={[…]}` syntax), kept out of the table of contents; a syntax highlighting table; a "Common build errors" table with the literal messages and their fixes; screenshots that highlight the part of the page each section and component is about (explanations, code panel, Preview, Result pane, `<Intro>`, `<Step>`, `<VarField>`, `<Hint>`: `area-*` scenes in `site/scripts/screenshots.mjs`); code examples name their file (`title=`); props and fields link to the section that explains them. "Tutorial Layout" is now "Folder Structure" (also in the core package README), reader-side details of the Result pane moved to Features, and the contributor preflight commands left the page (they live in `CONTRIBUTING.md`).
- Repository settings: description, topics, homepage (the project website), a `showcase` label, GitHub Pages from Actions and private vulnerability reporting.
- Rewrote the README as a mini landing page: tagline, badges (npm, CI, license, beta, Astro, stars), light/dark screenshots of real tutorials, a three-line quick start, a feature table, examples, a beta section that invites issues, and a transparency section (built with AI coding agents, inspired by Stripe's quickstarts, stack, not an official Esri product).
- Moved internal docs out of the repository root: `SPEC.md`, `PROJECT.md`, `TODO.md` and `docs/research/` now live in `docs/dev/`; `CLAUDE.md` and `AGENTS.md` stay at the root (agent tools load them from there) and point to the new paths. Moved the stable E2E fixtures (`framework-fixture*`) from `examples/` to `fixtures/`, so `examples/` only holds user-facing tutorials.

### Removed

- The getting-started tutorial (`examples/getting-started`) and its Pages workflow: a tutorial about writing tutorials was too recursive. `docs/quick-start.md` replaces it, and the project website (planned) embeds a real-topic tutorial instead. The `docs:dev` / `docs:build` scripts are gone.

## [0.2.0-beta.0] - 2026-09-30

First beta: code variants, the Result pane and `.http` runner, series sites, sibling tutorials, GitHub Pages workflows and the project wizard. Published under the `latest` dist-tag (alphas stay under `alpha`).

### Added

- Published `create-interactive-code-scroll` together with the core: one `v*` tag releases both packages at the same version (`publish-npm.yml` checks both versions against the tag). `pnpm test:pack` now also runs the packed scaffolder and builds the series it writes against the packed core.
- Added the `create-interactive-code-scroll` package (Phase 2 task 2.3): a wizard (`@clack/prompts`) that asks for the layout (one tutorial or a series with tutorial names and a default, `index.mdx` or custom Astro index), what each tutorial uses (one checkbox list grouped by kind: web app, REST API, script, native app, with runtime languages such as browser JavaScript and Node.js; kinds can be mixed; a series can use one list for all tutorials or one per tutorial), several languages as code variants or sibling tutorials, the package manager, a GitHub Pages workflow, `git init` and installing dependencies, then writes a minimal working project and prints the next steps. Every answer has a flag (`--yes` for defaults); without a terminal, missing answers name their flags. Existing files are never overwritten. Tests build every kind of generated project. The Pages workflow text now lives in the scaffolder's templates, and `docs/deployment.md` is checked against them.
- Added GitHub Pages workflows for author repos (Phase 2 task 2.4): `docs/deployment.md` has a copy-paste `.github/workflows/pages.yml` for npm and for pnpm that publishes a single tutorial or a series site, builds pull requests without deploying, uses per-job least-privilege permissions and takes `site`/`base` from `actions/configure-pages` (project site, user site or custom domain), overridable with repository variables `ICS_SITE` / `ICS_BASE`. A build test checks that every internal URL of the series fixture carries a project-site base and that both workflow flavors stay in sync.
- Added a CI workflow that runs unit tests, `astro check` and E2E on every push to `main`.

- Added sibling tutorials (Phase 2 task 2.5): tutorials of a series site with the same frontmatter `family` get a "Tutorial for: <label> ▾" menu of links in the header (labels from `familyLabel`, ordered by `order` then label; the prefix hides on narrow headers). Choosing a sibling opens it on the same step id, else its top, and carries the code variant when the sibling has it. `family` without `familyLabel` (or the reverse) and a label used twice in a family fail the build; a family of one and `family` outside a series warn. New fixture tutorial `delta` in `examples/framework-fixture-series`.

- Added `<VarField persist="tutorial">` (Phase 2 task 2.2): a persisted value that belongs to one tutorial of a series site (key `ics:var:<tutorial>:<name>`), while plain `persist` stays shared by the whole site. On a single-tutorial site both use the site key. Any other `persist` value fails the build. The series fixture covers both scopes across two tutorials.

- Added series sites to the CLI (Phase 2 task 2.1, last step): `--tutorials <dir>` serves or builds a series site, and without options the CLI uses `tutorials/` when there is no `tutorial/tutorial.mdx` and no root `tutorial.mdx` but at least one `tutorials/<name>/tutorial.mdx` (`_`/`.` folders ignored). `--tutorial` and `--tutorials` together are an error; `--tutorial tutorials/<name>` still serves one tutorial. The preflight banner lists the detected tutorials and `doctor` recommends `--tutorials`. `--index <file>` sets a custom index page (series only; must exist and be `.astro`); the pack smoke test builds that series through the packed CLI. `examples/framework-fixture-series` now runs through the CLI with auto-detection.

- Added custom series index pages (Phase 2 task 2.1): integration option `index: "<path>.astro"` replaces the index at `/` (needs `tutorials`; build error with `tutorials/index.mdx`, a missing file or another extension). New public module `interactive-code-scroll/series` exports `tutorials` (slug, href, title and metadata in index order), `TutorialList`, `TutorialFilter` and the `SeriesCard` type. The two components now bring their own styles (`series-list.css`) and filter script. The pack smoke test builds a series with a custom page from the packed tarball.

- Added the series index page (Phase 2 task 2.1): Calcite-styled cards with title, description, level, duration and tags, ordered by `order` then title; a tag filter (`<TutorialFilter />`, chips, counts tutorials once); optional `tutorials/index.mdx` with `title`, `description` (shown in the header), `logo` (from `tutorials/images/`), `theme`, free prose and `<TutorialList tags="…" level="…">` sections, validated at build (only those two components; unknown tags or levels fail the build). New tutorial frontmatter `description` (also the page's meta description), `tags`, `level`, `duration`, `order`. Tutorials in a series get an "All tutorials" link before the title. Dev revalidates the index when `tutorials/images/` changes.
- `logo` (tutorial and series index frontmatter) accepts an absolute `https://` URL besides a path in `images/`.

- Added series sites (Phase 2 task 2.1, first step): integration option `tutorials: "<dir>"` publishes every `<dir>/<slug>/tutorial.mdx` at `/<slug>/` (with its Preview, published code and captured outputs under that prefix) in one Astro build, plus a basic index page at `/`. Slugs must be lowercase URL segments; `_`/`.` folders are ignored and folders without `tutorial.mdx` are skipped with a warning. Stored Preview HTML is namespaced per tutorial; persisted vars stay shared across the site. New fixture `examples/framework-fixture-series` with its own E2E project.

- Fitted the Result pane and step keys for presentations: PageDown/PageUp (clicker keys) now move steps from any focus except multi-line text, including form fields, the JSON tree and the Result pane; the Body/Headers tabs and the "Run as" picker keep their arrow keys. At high zoom the Result header stays on one row ("Keep response", "Show captured", then "Run request" become icons with tooltips; the badge shows its full text as a tooltip), and a short Result pane scrolls request line, notices and body together so the body stays reachable. New "Presenting a tutorial" checklist in the authoring guide and Phase 1 notes in the upgrade guide.

- Added maximized panes: a maximize icon on the code panel, iframe Preview and Result pane headers fills the window with that pane (the carousel, with a floating restore action, on image steps); the icon or Esc restores the layout and its splitter sizes. One pane at a time, step keys keep working, the Preview iframe does not reload, and the state is not remembered. `<Step maximize="code|preview|none">` maximizes or restores when the step activates; `maximize="preview"` with `preview="collapsed"`, or without any pane to maximize, is a build error. Esc goes one level at a time (dialog, pane, presentation), also from inside the Preview.

- Added `examples/rest-geocode` (`pnpm rest`): a REST tutorial that geocodes an address with the ArcGIS REST API in cURL, Python and JavaScript (Node.js), with a GET step (token in the query) and a POST step (form body, token in the `X-Esri-Authorization` header), each running the request its code shows, captured outputs and an ArcGIS error rule with help for codes 400, 403, 498 and 499; covered by its own E2E project.
- Moved the playground's `geocode.http` to `requests/` and bound it to the Python request step, so it runs from the Result pane.
- E2E tests now block every external host by default (not only the Esri CDN); `mockService()` in `e2e/fixtures.ts` mocks a cross-origin service and its CORS preflight.

- Added service error explanations to the request runner: `requests/errors.json` declares where a response body holds an error object, its code and message (dot paths) plus a help table (text + link per code, fallback link); matching responses (HTTP 200 or not) get a red `Error <code> · HTTP <status>` badge and a notice with the code, message and help link. The build validates the file and reports errors by line.
- Added Body and Headers tabs to live responses: `image/*` bodies render as images, text over 200 KB is cut with a "Show all" action, and the Headers tab lists the headers the server exposes through CORS.

- Added the `.http` request runner to the Result pane: `<Step request="…">` shows a Run request button (never sent on step activation), a "Run as" picker when the step lists several requests (method labels, names when methods repeat), and the request line (wrapping long URLs) with `secret` values masked plus a "Show secrets" toggle that is never remembered. Values come from `<VarField>`s or file defaults, URL-encoded in the query string only; responses show status, time and a text-only body (JSON viewer when it parses); requests abort after 30 s, and timeouts or network/CORS failures fall back to the captured output with a notice. "Keep response" keeps a live response in memory until reload; "Show captured" discards it.
- Added `.http` requests under `requests/` (build side of the request runner): a parser for the supported VS Code REST Client / JetBrains subset (`###`, `# @name`, file variables, `METHOD URL` with `?`/`&` query lines, headers, body), build errors for unsupported features (request and system variables, `< file` bodies, scripts), undefined `{{x}}`, duplicate names and unknown `<Step request="…">` names, `request=` on web code, binary files in `requests/` and `code/…/requests/` ZIP clashes; request file variables feed `<VarField>` and the same-default rule; every ZIP includes `requests/` with form values applied, counted in its badge.
- Added the JSON viewer to the Result pane: captured `.json` output renders as a collapsible, text-only tree with colored tokens in light and dark, levels deeper than two collapsed with a key/item count, 100-entry pages with "Show more", tree keyboard navigation (arrows, Home/End, Enter/Space) that does not move steps, and number source text kept for large ids; invalid JSON falls back to plain text.
- Added colors to `.txt`/`.log` captured output: prompt lines (`$ cmd`, `> cmd`, `>>> cmd`, `PS C:\> cmd`) color the prompt and the command, and ANSI SGR codes (16 colors, bold, dim, italic, underline) become colored text; other escape sequences are removed. Rendered as text nodes only.
- Added the Result pane with captured output: for code that is not web (a variant or tutorial without `index.html`) it takes the Preview's place, with the same splitter and a collapsible header. `<Step output="name">` shows `output/<variant>/name` or `output/name` (JSON and text as text, `.txt`/`.log` in terminal style, images as images), steps without an output keep the nearest earlier result, outputs are published under `output/` and fetched when shown, and the build warns when an output looks like it holds a credential.
- Added Preview and downloads per code variant: web variants (with `index.html`) run the Preview from their own page at `preview/<dir>/index.html` and other variants hide it; the ZIP holds the active variant's folder as `<tutorial>-<variant>.zip`, and its badge counts that variant's files.
- Added code variants to the tutorial page: a language switcher before the file tabs (segmented control for up to four variants whose tabs fit, dropdown otherwise), `?variant=` deep links and a remembered choice, per-variant tabs, steps that focus the same region in each variant's file, and `only=` steps shown with a notice (`otherVariantSteps: notice`) or hidden (`hide`).
- Added `examples/framework-fixture-variants` and `examples/framework-fixture-variants-hide` with their own Playwright web servers.
- Added build validation for code variants (Phase 1, not rendered yet): `variants` frontmatter (`id`, `label`, `dir`, `entry`, per-variant `files`) and `otherVariantSteps` (`notice` | `hide`); all code must live in variant folders, region ids are unique within a variant, `<Step region>` without `file` resolves per variant, and `only="a b"` limits a step to some variants.
- Added a `files` frontmatter list (paths/globs) that chooses which `code/` files get tabs; other files, including binaries, are published under `preview/` and fetched into the ZIP, and the ZIP action shows a badge with the total file count; its tooltip says how many are not shown in tabs.
- Added binary file support in `code/`: detected by extension or NUL byte, never rendered, published and zipped byte for byte.
- Added `.http` file variables (`@name = value`) as form-editable variables, and `-- @var` comments in SQL and Lua files.
- Added `examples/multi-sdk-playground` (`pnpm playground`), a local tutorial with Python, Kotlin, C# and SQL steps for trying multi-SDK features by hand.
- Added syntax highlighting for Python, Kotlin, Gradle, Swift, Java, C#, XML/XAML, C++, QML, Dart, TOML, INI, SQL, Lua, PowerShell, `.http`, JSX/TSX, Vue and GeoJSON files, plus a `languages` frontmatter map to override the language per extension.
- Added native region markers scoped by file type: C# `#region` in `.cs`, `# region` in `.py`, and `-- #region` in `.sql`/`.lua`.
- Added shell/YAML-style `# #region` marker support for bash commands and MDX frontmatter examples.
- Added Markdown/MDX fenced-code handling so marker examples can be shown literally in authoring tutorials.
- Added public authoring, CLI, deployment and upgrade documentation for tutorial authors.
- Added a dogfooding getting-started tutorial built with InteractiveCodeScroll.
- Added a GitHub Pages workflow to publish the getting-started tutorial on pushes to the default branch, with configurable site and base URL variables.

### Changed

- Releases other than alphas publish under the npm `latest` dist-tag; install commands in the docs, the CLI hints and the getting-started tutorial drop `@alpha`.

- Specified the `create-interactive-code-scroll` scaffolder as a wizard (Phase 2 task 2.3, `SPEC.md` Scaffolder); ArcGIS starters and `interactive-code-scroll add` are separate TODOs.
- The getting-started Pages workflow takes `site`/`base` from `actions/configure-pages`; its overrides are now `ICS_SITE` / `ICS_BASE` (were `ICS_GETTING_STARTED_SITE` / `ICS_GETTING_STARTED_BASE`). Pages, checkout, Node and pnpm actions updated to their current majors.
- The explanations panel's top padding matches its side gutter (1.5rem instead of 2rem).
- In dev mode, adding, changing or deleting a file under `code/`, `images/`, `requests/` or `output/` now re-runs the MDX validation without touching `tutorial.mdx`, and the browser error overlay opens `tutorial.mdx` at the first failing line.
- `@var` values are now escaped for the file type and quote style (backslash, Kotlin/Dart/Groovy `$`, shell, PowerShell, SQL/YAML quote doubling, HTML/XML entities). Python f-strings, raw and triple-quoted strings and TOML literal strings are rejected at build time.
- A variable name used in several files must have the same default literal everywhere; the build fails otherwise (see `docs/upgrade.md`).
- Frontmatter is now validated together with MDX references at compile time: invalid fields, a missing `logo` image and Preview without `code/index.html` report `tutorial.mdx:line:column` at the offending key instead of failing later during page rendering.
- Expanded the root and package READMEs with quick-start guidance and links to tutorials built with InteractiveCodeScroll.
- Updated shared project context to document the public docs, getting-started tutorial and GitHub Pages deployment workflow.
- Reworked the getting-started dogfooding tutorial to teach the authoring setup flow with shell commands, MDX steps and tab-only Preview.
- Added a generated-result visual checkpoint to the getting-started tutorial instead of nesting a compiled tutorial inside Preview.
- Updated the OAuth PKCE example credential setup step with a seven-image ArcGIS portal walkthrough.

### Fixed

- Series links (index cards, "All tutorials", sibling menu) and the client `base` (Preview, outputs) no longer lose the base path when the build runs with a `BASE_URL` environment variable: the framework reads Astro's `base` instead of `import.meta.env.BASE_URL`.
- Resizing the explanations panel no longer switches the active step (and the URL hash) while its text reflows; the active step stays centered.

## [0.1.0-alpha.8] - 2026-09-28

### Fixed

- Fixed wrapped code lines so blank lines keep their line height and do not collapse focused regions.

## [0.1.0-alpha.7] - 2026-09-28

### Added

- Added styled Markdown blockquotes and an inline `<Hint>` MDX component for short rich clarifications.
- Added `codeWrap` frontmatter to optionally wrap long code lines in the code panel.
- Added polished tutorial markdown code blocks, disclosure blocks and active-step inline code contrast.
- Added risk-based preflight scripts and agent guidance to reduce validation overhead without weakening release quality.

## [0.1.0-alpha.6] - 2026-09-28

### Added

- Added a GitHub Actions workflow to publish the npm package from version tags via npm trusted publishing.
- Added an `<Intro>` MDX component for non-step tutorial introductions.
- Added `placeholder` support to `<VarField>` without changing the linked code default.
- Added package tarball smoke testing to the npm publish workflow.
- Added package repository metadata required for npm provenance verification.

### Changed

- Removed the intro block's horizontal padding so introduction content aligns with the step content column.

### Fixed

- Fixed the npm publish workflow by pinning the pnpm version required by `pnpm/action-setup`.

## [0.1.0-alpha.3] - 2026-09-27

### Added

- Code panels now show line numbers in a left gutter.

### Fixed

- Fixed extra vertical spacing between code lines after adding line numbers.

## [0.1.0-alpha.2] - 2026-09-27

### Added

- Added `interactive-code-scroll doctor` to report package manager, Astro resolution, project root and detected `tutorial.mdx` candidates.
- Added `interactive-code-scroll init-scripts`, with optional `--write`, to suggest or add package scripts without overwriting existing scripts.

### Changed

- Improved CLI help and missing-tutorial diagnostics with package-manager-aware commands, candidate detection and explicit npm script argument forwarding guidance.
- Documented npm/pnpm execution paths that avoid unreliable direct pnpm bin invocation in some consumer environments.

### Fixed

- CLI Astro lookup now walks parent directories, so running from a tutorial subfolder can still use Astro installed at the consuming project root.

## [0.1.0-alpha.1] - 2026-09-27

### Changed

- Improved CLI developer experience with a preflight banner, help examples, automatic root-level `tutorial.mdx` detection, and actionable missing-tutorial guidance.

### Fixed

- CLI Astro resolution now searches parent directories, so running from a tutorial subfolder with `--tutorial .` can use Astro installed in the parent project.

## [0.1.0-alpha.0] - 2026-09-26

### Added

- Package build pipeline for `interactive-code-scroll`: compiled `dist` output, packaged CLI entrypoints, `prepack`, and a tarball smoke test that installs the package in a temporary tutorial project.
- Generic `interactive-code-scroll` CLI with `dev`, `build` and `serve` commands for any tutorial project, backed by a generated Astro config and topic-agnostic options.
- Stable `examples/framework-fixture` tutorial for framework E2E coverage.
- Per-step Preview state: `<Step preview="expanded">` and `<Step preview="collapsed">` control the iframe when the step becomes active.
- Resizable Preview: a splitter between code and Preview (pointer and keyboard, height remembered).
- Image viewer: clicking a carousel image opens it full screen (`calcite-dialog`); step keys page the images inside it and leaving the step closes it.
- Optional `logo` frontmatter (a file in `images/`): header logo (`calcite-navigation-logo` thumbnail) and favicon.
- `@types/node` dev dependency (types were resolved from a stray `~/node_modules`; a fresh clone failed `pnpm check`).
- Project specification (`SPEC.md`).
- Shared AI agent context (`PROJECT.md`, `CLAUDE.md`, `AGENTS.md`).
- Task list (`TODO.md`) and changelog (`CHANGELOG.md`).
- Technical base spike: Code Hike and Astro prototypes of the same tutorial, shared marker parser and preview helpers, Playwright smoke tests, and findings now documented in `docs/research/technical-base-spike.md`. Decision: Astro + MDX + Shiki.

- Core package scaffold: pnpm workspace with `interactive-code-scroll` (Astro integration that adds MDX and injects the tutorial page, reading the author's `tutorial/tutorial.mdx` through a virtual module) and the `examples/oauth-pkce` project. Vitest unit tests and a Playwright E2E test.
- Marker parser (`markers.ts`): `#region` / `#endregion [id]` and `@var` in JS, CSS and HTML comments; nested regions; errors with file and line (unmatched, unclosed, mismatched, empty or duplicate regions, duplicate vars, var without literal); context-aware escaping (script string vs HTML attribute).
- Build-time rendering: `<Step>` and `<VarField>` components, Shiki dual-theme highlighting with `data-regions` / `data-var`, file tabs, `title` / `preview` frontmatter.
- Strict validation as a Sätteri mdast plugin: every broken step id, file, region, image or var, and every marker error in `code/`, fails the build with `file:line:column`; shown in the dev error overlay.
- Step engine (client): the step crossing the viewport center becomes active; arrows / PageUp / PageDown (presentation clickers) move with snapping, also from a focused carousel but not from fields; deep links `#step-id` (restored after Calcite hydration); file switching, region focus with gray-out and auto-scroll, image carousel panel, progress text and bar; file tabs.
- Step keys page through an image carousel before leaving the step (backwards entry starts at the last image); the carousel's own controls stay in sync.
- Preview: iframe and/or new tab per `preview` frontmatter (`both` by default), both loading a same-origin `preview/` page; ~500 ms debounce after form changes plus Run; collapsible iframe; PageUp/PageDown pressed inside the preview move the tutorial; build fails if `code/index.html` is missing while the preview is on.
- Layout: light/dark toggle (defaults to `prefers-color-scheme`, manual choice remembered, applied before first paint; code theme follows); resizable docs/code splitter (pointer and keyboard, width remembered); usable at high browser zoom (toolbar wraps, no page-level horizontal scroll).
- Downloads: copy the visible file to the clipboard, download it, or download the project as a ZIP (`fflate`, loaded on demand) under a folder named after the tutorial; form values (secrets included) applied, markers stripped.
- Presentation mode: browser full screen with a compact toolbar (progress, preview and exit stay; Esc exits); explanations can be hidden so code takes the full width while keys/clickers keep moving steps, and showing them again returns to the active step.
- Forms → variables: typing in a `<VarField>` swaps the `@var` token text in place (highlighting kept); an empty field restores the code default; `persist` stores values in `localStorage` (tolerating blocked storage); `secret` values are masked in field and code, with a reveal toggle.

### Changed

- Root and example dev/build/preview scripts now exercise the generic CLI against `examples/framework-fixture`.
- Clarified that InteractiveCodeScroll is a generic framework; OAuth/ArcGIS are example concerns only, and the next CLI work must stay topic-agnostic.
- Expanded `SPEC.md` with public documentation requirements: README, dogfooding getting-started tutorial, authoring/API reference, CLI reference and upgrade guide.
- Documented `examples/framework-fixture` as the required regression fixture for new framework behavior and matching E2E coverage.
- Documented the E2E strategy: avoid chasing OAuth tutorial editorial changes and add a stable fake tutorial fixture for framework behavior.
- The OAuth PKCE example sign-in button now becomes a sign-out action after authentication.
- Removed the basemap from the OAuth PKCE example so the tutorial focuses only on user authentication.
- Expanded the OAuth PKCE example tutorial into a complete walkthrough suitable as a CLI example, with an explicit OAuth popup callback URL and auth namespace.
- Moved the technical base spike findings to `docs/research/technical-base-spike.md`.
- Example tutorial: ArcGIS Maps SDK for JavaScript glyph as logo and favicon.
- The explanations toggle is a handle on the docs/code splitter (a rail at the left edge while they are hidden), no longer in the header.
- Steps no longer change background on hover (the pointer cursor is the hint).
- The blank room below the last step is just what it needs to reach the center line.
- Example tutorial: link to the original Esri tutorial, credential-type screenshot first in the developer credential carousel, and the demo app follows the page mode (`calcite-mode-auto`).
- Steps: clicking a step activates it; scrolling back to the top activates the first one; each step heading is numbered (the active one in brand color); the whole code region scrolls into view when it fits (no scroll when already visible) and key navigation shows tall steps from their start. The tutorial title is the page's h1 (header); the example MDX no longer repeats it.
- UI redesign on Calcite: `calcite-navigation` header (explanations toggle, title, present, theme, progress bar; "Step X of N" only while presenting); explanations scroll in their own panel (no page scroll, separated scrollbars); Calcite type scale (16 px text, 13 px code with the Calcite code font, 1.6/1.7 line heights), compact steps (no minimum height, no dimmed text; active step gets a subtle background and brand edge), numbered section headings, styled inline code, 70ch line length; icon-only `calcite-action`s with tooltips; file icons on tabs; thin splitter and scrollbars.
- Theme: `theme` frontmatter sets the tutorial's default mode (`auto` / `light` / `dark`; the viewer's toggle wins); code panel and Preview iframe follow the page mode (apps using `calcite-mode-auto` match). Code: GitHub default themes; outside the focused region the code turns uniformly gray, the region keeps its colors on a brand band.
- Preview: own header bar next to the iframe (collapse, Run, open in new tab); collapsing keeps the header.
- Image carousel fits and centers in the panel (never scrolls).
- `<VarField>`: Calcite `label-text` instead of a `calcite-label` wrapper; the secret reveal toggle is a `calcite-action` in the input's `action` slot, joined to the field.
- Every `code/` file is published at `preview/<path>` (markers stripped); the OAuth popup callback is now the tutorial's own `code/oauth-callback.html` (shown as a step in the example and included in downloads) instead of a built-in framework page.
- E2E tests block the whole Esri CDN by default (`network: true` to opt in).

- `SPEC.md`: carousel keyboard behavior (step keys page through images first).
- `SPEC.md`: Preview runs from a same-origin preview page (not `srcdoc`/blob); technical base recorded.

### Removed

- Hidden local agent/editor configuration directories and MCP config files from the repository.
- Spike prototype code (`spike/`), now ported; findings kept in `docs/research/technical-base-spike.md`.

### Fixed

- Packaged CLI execution under pnpm now follows bin symlinks correctly and resolves Astro from the consuming project before falling back to the workspace package.
- Text-only steps now clear any previously focused code region.
- Deep links and in-page `#step-id` links center the step (short steps used to land below the trigger line); on load the step stays centered while the layout settles (Calcite renders late online), until user input.

- Keys pressed before Calcite finished hydrating no longer get undone by the deep-link restore scroll; the scroll observer only confirms the target of a key-driven scroll (an interrupted smooth scroll could re-activate a passed step).

- Key-driven smooth scrolling no longer lets the scroll observer re-activate the steps it passes over (which reset a carousel to its first image).
