# InteractiveCodeScroll — Claude Code

> A framework for building guided, interactive code tutorials by writing MDX and annotating source code.

Project-level instructions for Claude Code. Read this at the start of every session.

Read `PROJECT.md` for full project context: stack, architecture, commands, coding style, git conventions, and security rules. Requirements: `SPEC.md`. Pending tasks: `TODO.md`. Done: `CHANGELOG.md`.

---

## Behaviour rules

### Language
Everything written to the repo is in English: code, comments, docs, commit messages, UI text. Conversation with the user may be in Spanish.

### SPEC.md is authoritative
If a request contradicts `SPEC.md`, flag it before implementing.

### Dependencies
Ask before adding any package. Justify the choice and version (recent, stable, secure).

### Tests with every feature
Every feature ships with tests: unit (Vitest) and/or E2E (Playwright).

### Commits, TODO.md and CHANGELOG.md
- After implementing and testing a feature (or meaningful sub-step), commit it (Conventional Commits, English).
- In the same commit: remove the finished task from `TODO.md` (pending only) and add it to `CHANGELOG.md` under `## [Unreleased]`.
- Never commit with failing tests; report the failure instead.
- Run test commands on their own and check their exit status before committing; never chain a commit after a pipeline that can mask failures (e.g. `| grep`).

### Recommendations
When a decision is open, recommend one option and explain the trade-offs; let the user confirm.

### ArcGIS
Explore first: before writing code for X, ask what already exists. Query the Esri MCP server (`mcp-for-esri-developers`, configured in `.mcp.json`) before assuming ArcGIS APIs.

### Ask before destructive actions
Confirm before: deleting files, force-pushing, resetting git state, dropping packages.

### Keep responses concise
Prefer showing changed code over explaining it. Use markdown link syntax for file references.

---

## Closing the loop (always follow these — non-negotiable)

These rules apply in every session regardless of other settings.

### After fixing a bug or correcting wrong AI behaviour
Once a problem is resolved, ask:
> "Should I update any context file to prevent this mistake in future sessions? (CLAUDE.md, SPEC.md, AGENTS.md, known issues table, what-to-avoid list)"

Do not assume the answer is no. The goal is to make each mistake a one-time event.

### After any specification change
If requirements, scope, constraints, or data models changed during the session, ask:
> "SPEC.md may be out of date — want me to update it with what changed?"

Never let the spec drift silently from what was agreed in conversation.

### After discovering a new API quirk, gotcha, or non-obvious behaviour
Add it to the **Known issues / differences** table in `PROJECT.md` and ask the user to confirm the entry before closing.

### After completing a significant feature or milestone
Ask:
> "Should I update the architecture section of PROJECT.md to reflect what was built?" (TODO.md and CHANGELOG.md are updated with every commit.)

### When something in this context file turns out to be wrong
Correct it immediately. Do not continue working around a known inaccuracy in the instructions.
