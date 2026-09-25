---
name: review-spec
description: Read SPEC.md and run an in-depth interview challenging its assumptions (implementation, UI/UX, tradeoffs, concerns), then update SPEC.md with the answers. Use when the user wants to review, refine, or stress-test an existing spec.
---

Review the project's `SPEC.md` by interviewing me in depth.

Before starting:
- Read `SPEC.md` from the project root in full. If it does not exist, tell me: "No SPEC.md found — run `/init-spec` first." and stop.

## Interview

- Interview me in detail about literally anything: technical implementation, UI & UX, concerns, tradeoffs, edge cases, security, performance, etc.
- Make sure the questions are not obvious — don't ask what the spec already answers clearly.
- Challenge me with the current specification: point out gaps, contradictions, and risky assumptions.
- Propose improvement suggestions that would make the spec more useful, and check each one with me before adopting it.
- Ask one question at a time and wait for my answer before continuing. Where useful, offer 2–4 likely answers as options.
- Keep going until the important areas are covered or I say to stop.

## Output

After all questions, update `SPEC.md` with my answers:
- Keep the existing structure; add or edit sections as needed.
- Only record what I confirmed — never invent details.
- Move resolved items out of "Open questions" and add any new open questions that came up.

Then summarize what changed in `SPEC.md`.
