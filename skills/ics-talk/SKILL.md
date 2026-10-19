---
name: ics-talk
description: Prepare an InteractiveCodeScroll tutorial for a live talk, workshop or screen share - script and timing per step, slides embedded as steps, results made big, offline fallbacks, presentation mode keys and a rehearsal checklist. Use when the user is a speaker turning a talk or demo into a tutorial, or preparing to present one.
license: Apache-2.0
metadata:
  package: interactive-code-scroll
---

# Preparing a tutorial for a talk

The same tutorial serves the talk and the readers afterwards: the speaker presents it full screen with a clicker; the audience opens it later from the closing slide's QR code. Plan with `ics-tutorial-design`, write with `ics-authoring`, check with `ics-verify`.

## 1. Script and timing

- Start from the talk outline: which part is this demo, how many minutes?
- Budget 30–60 s per step on screen; a 10-minute demo is about 12–18 steps.
- For each step, write the one sentence the speaker says. It becomes the step's first line of prose, so readers get the same message later.
- Keep a step table with timing in `TUTORIAL-PLAN.md` and mark which steps can be skipped if time runs short.

## 2. Make the screen work for the room

- **Slides inside the flow**: context and diagrams as steps with `embed` (a Slidev deck in `embeds/` with `routerMode: hash`, built with `npx slidev build --base ./ --out ../tutorial/embeds/<deck>`) or `images={[…]}`. Consecutive steps on the same deck with another `#/n` move in place without reloading.
- **Show results big**: `maximize="panel"` on the step that shows a result, `maximize="none"` on the next; or `panelHeight={50}` with `view="preview"` / `view="console"` / `view="result"`.
- **Focus**: highlight small regions; the speaker can press `H` to show the whole file without the emphasis.
- **Readable code**: `codeWrap: true` for long lines; test at the zoom you will use (Ctrl/Cmd + "+").
- **Closing slide**: an `<Outro>` with the takeaway; set `presentationUrl` (or Astro `site`) so the QR code opens the published copy, not `localhost`.

## 3. Plan for things going wrong

- Every request step has a captured `output=`: when the network or CORS fails, the pane falls back to it.
- Build and run locally with `serve` (works offline except external Preview/API calls).
- Present from a browser profile without real credentials: persisted fields keep what was typed. Secret fields stay masked.
- Keep deep links per section: `#step-id`, and `?variant=python#step-id` for a language.

## 4. Presentation mode (tell the speaker)

| Key | Does |
|---|---|
| Alt+P (Option+P) | Enter / leave presentation mode (full screen) |
| PageDown / PageUp, arrows | Next / previous step (clickers send PageDown/PageUp); images and decks page first |
| `O`, `b`, `.` | Step index (clickers' "blank screen" button often sends `b` or `.`) |
| `E` | Hide / show the explanations |
| `1`–`4` | Collapse / 35% / 50% / 75% lower pane |
| `5` / `0` | Maximize the pane / the code |
| `H` | Region emphasis off / on |
| Alt alone | Shows the available keys |
| Esc | Back out one level (Chrome/Edge keep Esc for the page in full screen) |

## 5. Rehearsal checklist

- [ ] `ics-verify` passes; `build` and `serve` work on the presenting laptop.
- [ ] Clicker tested: next/previous and the "blank" button.
- [ ] Theme chosen for the room (light usually reads better on projectors), zoom set.
- [ ] Every live call tested on the venue network; captured outputs present.
- [ ] Browser profile without personal credentials; fields filled with demo values.
- [ ] Timing per section measured in a full run-through; skip candidates marked.
- [ ] QR code on the closing slide opens the published URL.
