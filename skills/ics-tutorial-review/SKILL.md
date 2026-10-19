---
name: ics-tutorial-review
description: Review an InteractiveCodeScroll tutorial as an editor and a first-time reader - structure, pacing, step size, prose, code regions, secrets, media and accessibility - and report findings per step without rewriting it. Use when the user asks to review, critique, proofread or polish a tutorial, or before publishing or presenting one.
license: Apache-2.0
metadata:
  package: interactive-code-scroll
---

# Reviewing a tutorial

Read `tutorial.mdx`, the code it points at and, when it exists, `TUTORIAL-PLAN.md` (the agreed audience and goal). Run `ics-verify` first: broken references are not review findings, they are bugs to fix.

Review as two people, then report. Do not edit the tutorial unless the author asks; propose concrete changes instead.

## As a first-time reader

Walk the steps in order, knowing only what the stated audience knows.

- Can you say, after the intro, what you will build and what you need?
- Does every step answer "what changes, and why"? Is there a step where you would get lost or skip ahead?
- Are terms explained before they are used? Is anything assumed that the audience does not know?
- Do you see a working result early, and after each meaningful change (Preview, Result pane, outputs)?
- Is there a recap in a long tutorial, and an `<Outro>` that says what you learned and where to go next?

## As an editor

| Area | Check |
|---|---|
| Structure | One idea per step; no step that only says "now we continue"; step order matches the code's dependencies. |
| Headings | Every step has a short `##` heading (it is its title in the step index and outline); imperative or descriptive; no `#` repeating the title. |
| Regions | Each highlights the smallest block that shows the idea; no step highlighting a whole long file without reason; boilerplate is not the focus. |
| Prose | Short sentences; consistent terms; key terms in bold the first time; no "simply", "just", "obviously"; code identifiers in backticks. |
| Code | Comments explain why, not what; real API calls; no dead code; runs without the tool (markers are comments). |
| Secrets | Personal values are `@var` with placeholder defaults (`YOUR_API_KEY`) and `<VarField secret>`; nothing real in `code/` or `output/`. |
| Fields | Each `<VarField>` sits in the step that uses it, with a clear `label`; `persist` where readers would retype it. |
| Media | Images have descriptive file names (they are the alt text in the Markdown export); embeds work offline (`embeds/`) or have a fallback. |
| Pane | `view`, `collapsed`, `panelHeight`, `maximize` make the result visible when the step talks about it, and restore the layout after. |
| Hints | `<Hint>` only for short side notes; essential content in prose. |
| Variants | Every variant reads correctly; `only=` steps make sense for readers of other variants. |
| Talk use | Each step fits 30–60 s on screen; results are readable from the back row (`maximize`, `panelHeight`); `presentationUrl` set when presenting from localhost. |

## Report

Write the findings (to the chat, or to `REVIEW.md` when asked) in this shape, most important first:

```markdown
# Review: <title>

Summary: 2–3 sentences: does it meet its goal for its audience? The three changes with the most impact.

## Findings

### <step id or "Intro"/"Outro"/"Global"> · <blocker | major | minor> · <area>
What is wrong, for whom, and a concrete fix (the sentence to write, the region to shrink, the step to split).
```

Blockers: a reader cannot finish (wrong order, missing prerequisite, broken result, exposed secret). Major: confusing or misleading. Minor: polish.
