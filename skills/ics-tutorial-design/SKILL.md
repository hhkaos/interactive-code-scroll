---
name: ics-tutorial-design
description: Plan an InteractiveCodeScroll tutorial or talk demo before writing it - audience, goal, the finished app, and one idea per step - and keep the plan in TUTORIAL-PLAN.md as the memory between sessions. Use when the user wants to start a new tutorial, turn an idea or a talk segment into steps, or asks how to structure or pace a code walkthrough.
license: Apache-2.0
metadata:
  package: interactive-code-scroll
---

# Designing a tutorial

Good tutorials are decided before they are written. This skill turns an idea into a plan the author agrees with, then into steps, one at a time. Write the steps themselves with `ics-authoring`; check them with `ics-verify`.

## 1. Interview (one question at a time)

Ask, and wait for each answer. Offer a recommendation when the author hesitates.

1. **Audience**: who reads or watches it? What do they already know (language, SDK, the problem domain)? What do they *not* know?
2. **Goal**: one sentence: "After this tutorial, you can …". If it needs "and", consider two tutorials.
3. **Format**: self-paced reading, a workshop, or a talk demo (then: slot length and how much of it is this demo).
4. **The finished app**: what runs at the end? Does an implementation already exist to copy patterns and real API calls from?
5. **Setup**: web app (live Preview), script, REST API, native app; one language or several (variants, or sibling tutorials when the prose differs).
6. **Prerequisites**: accounts, keys, installs. Which values must readers enter themselves (they become `<VarField>`s with `@var` defaults such as `YOUR_CLIENT_ID`)?
7. **Focus**: which API or concept do the highlighted regions teach? What is plumbing (layout, CSS, boilerplate) that should stay out of the steps?

## 2. Write the plan

Create `TUTORIAL-PLAN.md` next to `tutorial.mdx` (or at the project root for a series), and confirm it before writing any step:

```markdown
# <Tutorial title>

- Audience: …
- Goal: After this tutorial, you can …
- Format: talk demo, 12 min (about 30–60 s per step)
- Finished app: … (reference implementation: <path or repo>)
- Prerequisites: …
- Reader values: clientId (VarField, secret, persist) …
- Focus: … (not: CSS, layout)

## Conventions

- Prose: English, short sentences, `##` headings in the imperative ("Sign in", "Search groups").
- Key terms in bold the first time.
- Code: comments explain why; one region per idea; no mocks in the Preview.

## Steps

| id | Idea (one per step) | File / region | Media | Status |
|---|---|---|---|---|
| need | Why this matters | — | image | planned |
| sign-in | `beginOAuth2` opens the sign-in | main.js `sign-in` | | planned |

## Decisions

- 2026-10-19: … (why)
```

Statuses: `planned`, `code`, `text`, `done`. Update the table when a step changes, and record decisions with their reason. This file is the memory between sessions: read it first when you come back, and ask before adding a new convention to it.

## 3. Principles for the steps

- **One idea per step.** A step explains one call, one concept or one change. If its explanation needs two headings, split it.
- **The code grows; the steps point at it.** `code/` is the final project; each step highlights the smallest region that shows its idea. The first steps show the setup the rest builds on.
- **Real, working results.** The Preview or the Result pane shows what the step does, against the real service when possible (captured `output/` as the fallback). No mocks that readers would mistake for the real thing.
- **Readers act early.** A first visible result within the first few steps keeps them going.
- **Context before code.** Open with an `<Intro>` (what we build, prerequisites) or an image/slide step for the "why"; recap halfway with `<Step outline>` in long tutorials.
- **Secrets are variables.** Anything personal is a `@var` with an obvious placeholder default and a `<VarField secret persist>`.
- **Talks**: 30–60 s per step on screen, one sentence the speaker says per step, `view`/`maximize` to show results big (see `ics-talk`).
- **Close the loop.** An `<Outro>` with what readers learned and where to go next.

## 4. Write step by step

Write one step (code region + prose), run `ics-verify`, show it to the author, update the plan's status, then the next one. Do not write code for future steps ahead of time unless the author asks: the plan changes as steps get real.
