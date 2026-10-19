# TODO

## UI polish & improvements to triage

- Add at the end: Built with InteractiveCodeScroll attribution (that can be hidden in the frontmatter)
- When there is only one image embedded, it shouldn't display hide the bullet from the carousel
- `exclude:` (alternative to include)
- Enhance the frontmatter to support: og:image, etc
- is `outline` compatible? with panel shown?
- InteractiveCodeScroll site: The NavBar in the header is not visible in the mobile view making it more difficult to get to the docs.
- New enhanncement ideas:
    - Support videos (mp4, youtube, etc) in addition to images and embeds
    - Should we provide a better sync between sidebar explanations and carousels or embed presentations (arrows?) Integration with Sli.dev works well, but I'm looking also for ways to do it with slides from google drive for example where I can create images to my liking and updating the very easily (positioning elements, etc).
    - Enhancement to evaluate: allow to author to highglight a DOM element in the preview with a border color (or similar)
    - Fields (Vars)
        - Framework Fixture Tutorial, step 4 (`config`): the textarea `<VarField type="textarea">` leaves too little bottom margin.
    - Show authors in the cards/tutorials?
    - Review Google Codelabs navigation patterns (e.g. https://codelabs.developers.google.com/codelabs/the-lit-path?hl=en#5) and decide which to adopt or adapt: like add & update time left (to finish) on each step "XX mins remaining". The tool serves both as a tutorial and as a presentation, so check each idea against both uses (e.g. hide or collapse them in presentation mode) and against what the page already has (step navigation, progress). And also works on mobile
- Sidebar:
    - Embed steps: the "Open in new tab" action (`.embed-open`) floats over the embedded page. Show it in a strip (bar) or next to the step title? instead, so it does not cover the page.? or hide in presentation mode and leave the shortcut?

## LLMs and coding agents (#4)

_Three audiences: the author's coding agent, the reader's LLM, an in-browser agent. Update `SPEC.md` before implementing each item._

- [ ] Agent skills, next: `ics skills install [--agent …]` (copy `dist/skills/` to the agent's folder), scaffolder prompt + `AGENTS.md` + a `check` script in generated `package.json`, `ics-migrate`, pedagogy skills (`tutorial-design`, `tutorial-review`, `talk-to-tutorial`; seed: `docs/dev/research/resources-for-skills/`), evals (fixed tasks such as "add a step with a VarField": build passes, regions match).
- [ ] Ask AI toolbar (`ask.ts`): include the tutorial `.md` URL and current step as context in the prompt.
- [ ] WebMCP spike behind a frontmatter flag: read-only/navigation tools (`goToStep`, `getCurrentStep`, `getStepCode`, `setVar`). Check browser support status first.
- [ ] When the skills and Ask AI items are done (WebMCP not needed): update the project website and docs. Markdown for LLMs + agent skills are a killer feature for authors/speakers who want to try the tool without reading the docs: mention them clearly at the top of the landing page (together), then details in features, and in the rest of the docs how to get started with an agent and which skills are included.

## Step index and outline (SPEC: Step navigation, Step outline, Presentation mode; decision 2026-10-16)

Approved mockup v3: https://claude.ai/artifact/XgJaeCjnw3cDHbxaTj8KSg (private). Remaining (manual):
- Check `b` / `.` (step index) with a real clicker.

---

## Backlog

_Derived from `SPEC.md`. Finished tasks move to `CHANGELOG.md`._

- [ ] Check native narration on real desktop, Android and iOS voices in both listening modes, including presentation Hide/Show: word-boundary availability, resume position, online voices and playback after a tab is backgrounded. Automated speech tests use a deterministic engine and do not validate voice quality or device behavior.
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
