---
name: init-spec
description: Interview the user one question at a time to create a SPEC.md (problem, features, flows, scope, data model, constraints, success criteria). Use when the user wants to start or write a project specification.
---

Interview me to create a `SPEC.md` for this project.

Before starting:
- Check if `SPEC.md` already exists. If it does, warn me: "A SPEC.md already exists — running `/review-spec` is usually better here. Continue and overwrite, or stop?"

Ask each question one at a time. Wait for my answer before moving to the next. If I say "skip" or "don't know yet", write it as `_TBD_` and move on.

---


## Questions

1. **What is it?** — In 1–3 sentences: what does this project do, and who is it for?
2. **The problem** — What problem does it solve? What do users do today without it?
3. **Core features** — What are the 3–5 things it must do in v1? List only what's essential.
4. **Key user flows** — Walk me through 1–2 main user flows from start to finish. What does the user do, see, and get?
5. **Out of scope** — What does this explicitly NOT do in v1? (auth, payments, mobile, admin, etc.)
6. **Data model** — What are the main entities or data types? Key relationships between them?
7. **Tech constraints** — Any decisions already made? (stack, hosting, must-use or must-avoid libraries)
8. **Success criteria** — How will you know v1 is done? What does a successful first release look like?
9. **Open questions** — What's still unclear or undecided?

---

## Output

Write `SPEC.md` to the project root using this structure. Omit sections the user skipped — replace with `_TBD_`. Never invent or assume details.

```markdown
# [Project Name]

> [One-sentence description.]

---

## Problem

[What problem this solves and what users do without it.]

---

## What this is

[2–4 sentences: purpose, users, output.]

---

## Core features (v1)

- [Feature 1]
- [Feature 2]
- [Feature 3]

---

## Key user flows

### [Flow name]

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Out of scope (v1)

- [Thing 1]
- [Thing 2]

---

## Data model

| Entity | Key fields | Notes |
|---|---|---|
| [Entity] | [fields] | [notes] |

---

## Tech constraints

- [Constraint or decision 1]

---

## Success criteria

- [Criterion 1]
- [Criterion 2]

---

## Open questions

- [ ] [Question 1]
- [ ] [Question 2]
```

After writing, tell me:

> "`SPEC.md` created. Suggested next steps:
> - `/review-spec` — go deeper, challenge assumptions, surface gaps
> - `/init-memory` — generate AI context files (reads this spec automatically)"
