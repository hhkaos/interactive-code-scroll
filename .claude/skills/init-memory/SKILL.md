---
name: init-memory
description: Interview the user to generate AI agent context files (CLAUDE.md, AGENTS.md, copilot-instructions.md, Cursor rules, etc.), optionally with a shared PROJECT.md. Reads SPEC.md if present. Use when setting up AI assistant memory/context for a project.
---

Ask each group of questions one at a time — wait for the answer before moving to the next. If the user says "skip" or "not applicable", move on.

---


## Step 0 — Check for SPEC.md

Before asking anything else:

1. Use the Read tool to check if a `SPEC.md` file exists in the current working directory.

2. **If SPEC.md exists:**
   - Read it in full.
   - Use its content to pre-populate answers for as many questions in Step 1 as possible.
   - Tell the user: "I found SPEC.md and will use it to pre-fill the project context. I'll only ask about things that are missing or unclear from the spec."
   - During Step 1, skip any question already answered by the spec. For questions where the spec gives a partial answer, present what you found and ask the user to confirm or expand.

3. **If SPEC.md does not exist:**
   - Ask: "There's no SPEC.md in this project. A spec is the authoritative source for requirements and saves time when generating context files. Would you like to:
     a) Run `/init-spec` first to create one (recommended — it will make this interview much shorter)
     b) Continue without a spec (I'll ask all questions manually)
     c) Create a minimal SPEC.md stub now based on what you tell me during this interview"
   - If the user chooses (a): stop and tell them to run `/init-spec`, then re-run `/init-memory` after.
   - If the user chooses (c): after completing Step 1, write a minimal SPEC.md from the answers before writing the agent context file(s).
   - If the user chooses (b): proceed with all questions.

---

## Step 0b — Identify target agent(s)

Ask next:

> "Which AI coding assistant(s) does your team use in this project? Select all that apply:
> - Claude Code (Anthropic)
> - GitHub Copilot
> - Cursor
> - Windsurf
> - Gemini CLI
> - OpenAI Codex CLI / ChatGPT
> - Cline
> - Aider
> - Other (specify)"

Use the answer to determine:
- **Which files to write** (see file mapping below)
- **How to phrase the generated content** — some agents need explicit instructions to ask questions one by one and propose options; others (like Claude Code) have tool support for that

### File mapping per agent

| Agent | File(s) to write | Notes |
|---|---|---|
| Claude Code | `CLAUDE.md` | Root or `.claude/CLAUDE.md` |
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown, repo-scoped |
| Cursor | `.cursor/rules/<topic>.mdc` | One `.mdc` file per concern; frontmatter controls scope |
| Windsurf | `.windsurfrules` | Plain markdown |
| Gemini CLI | `GEMINI.md` | Root of repo |
| OpenAI Codex CLI | `AGENTS.md` | Root of repo |
| Cline | `.clinerules` | Plain markdown |
| Aider | `.aider.conf.yml` + conventions note | YAML config + context in chat |
| Other | Ask the user for the correct file name/location | |

## Step 0c — Choose output mode

Before asking, check:

1. Use the Read tool to look for a `PROJECT.md` file in the current working directory.

2. **If `PROJECT.md` already exists:**
   - Tell the user: "I found a `PROJECT.md` — this project already uses the shared context pattern. I'll write all agent context files as minimal files that reference `PROJECT.md`, and update `PROJECT.md` itself with any new information. Does that sound right, or would you prefer standalone files for each agent instead?"
   - Store the choice as **shared mode** or **standalone mode** based on the user's answer.

3. **If `PROJECT.md` does not exist:**
   - Ask: "How do you want the context files structured?
     - **a) Shared `PROJECT.md` + minimal agent files** _(recommended for multiple agents)_ — a single `PROJECT.md` holds all project context; each agent file just references it and adds only agent-specific behaviour rules. One place to update when the project evolves.
     - **b) Standalone file per agent** — each agent gets a full, self-contained context file. Simpler when only one agent is used, but content must be kept in sync if you add more agents later."
   - If only one agent was selected in Step 0b: suggest (b) but mention (a) as an option.
   - Store the choice as **shared mode** or **standalone mode** — it affects Step 2 and Step 3.

---

## Step 1 — Project information

Ask the following question groups in order:

1. **Project overview** — "What does this project do, who is it for, and what is the key technical approach or value proposition? (1–4 sentences)"

2. **Commands** — "What are the main commands? Include: install, dev server (with port), test, lint, build. Any pre-commit or pre-push hooks?"

3. **Stack** — "What is the tech stack? List language, bundler, frameworks, key libraries, and versions."

4. **Constraints** — "What does this project explicitly NOT do? (e.g. no backend, read-only, no auth in v1, public items only)"

5. **Architecture & file map** — "How is the project structured? Describe the top-level layout, key modules or apps and their roles, and any important files. A rough directory tree is helpful."

6. **Data flow** — "Can you describe the main data flow — from user action to output? Skip if obvious from the architecture."

7. **ArcGIS context (skip if not an ArcGIS project)** — "Is this an ArcGIS project? If yes:
   - Which ArcGIS API / SDK and version? (e.g. Maps SDK for JS 5.0, @arcgis/core v5, Python API 2.x)
   - ArcGIS Online or Enterprise? If Enterprise, which version?
   - Layers with domains, subtypes, or attribute rules — where to check? (REST endpoint, hosted, portal item)
   - Deployment environment: internet-connected, disconnected/air-gapped, or Kubernetes?
   - UI component rules: Calcite only? No inline CSS? Widget restrictions?
   - Explore-first preference: ask 'what exists for X?' before writing code for X?
   - Anything deprecated or off-limits? (e.g. no legacy widgets, no watchUtils, no inline styles, no AMD modules)"

8. **Key technical patterns** — "Any critical API patterns, import conventions, SDK quirks, or non-obvious behaviours I should know before touching the code?"

9. **What to avoid** — "Any explicit anti-patterns I must never use? (specific imports that don't exist, patterns that cause bugs, things learned the hard way)"

10. **Coding style** — "Any coding style rules? (language choice, TypeScript or not, import style, CSS co-location, comment policy, no over-engineering, etc.)"

11. **Behaviour rules** — "How should the AI assistant behave in this project? (e.g. update TODO.md after tasks, ask before destructive actions, propose doc updates after sessions, keep responses concise, ask before writing new code)"

12. **Deployment** — "How and where is the project deployed? (platform, URL structure, CI/CD trigger, base path config)"

13. **Git conventions** — "What git conventions does this project use? (commit style, AI vs human commit helpers, custom skills/commands, which docs to update when shipping)"

14. **Security rules** — "Files that must never be committed? Staging policy? (e.g. never git add -A)"

15. **Known issues / discovered differences** — "Any known bugs, API quirks, or behavioural differences worth tracking in a table? (e.g. feature X works in 2D but silently ignored in 3D)"

---

## Step 2 — Write the file(s)

### Shared mode (PROJECT.md + minimal agent files)

1. Write `PROJECT.md` first using the **PROJECT.md structure** in Step 3. This file contains all project context and is agent-agnostic.
2. For each agent selected, write a minimal file using the **Minimal agent file structure** in Step 3. These files only contain:
   - A one-line pointer to `PROJECT.md`
   - Agent-specific behaviour rules (Closing the loop, Ask before destructive actions, interaction instructions, etc.)
   - Nothing that duplicates what is already in `PROJECT.md`

### Standalone mode (one full file per agent)

Write one file per agent selected. The content is identical across agents but:

- **File name/location** follows the mapping in Step 0b
- **Preamble line** is adapted per agent (see variants below)
- **Interaction instructions** are added for agents that lack tool support for interactive questioning

### Preamble variants

| Agent | Opening line |
|---|---|
| Claude Code | `Project-level instructions for Claude Code. Read this at the start of every session.` |
| GitHub Copilot | `Instructions for GitHub Copilot in this repository.` |
| Cursor | _(frontmatter controls scope — see Cursor note below)_ |
| Windsurf | `Instructions for Windsurf AI in this repository.` |
| Gemini CLI | `Project-level instructions for Gemini CLI. Read this at the start of every session.` |
| OpenAI Codex CLI | `Project-level instructions for the AI agent. Read this at the start of every session.` |
| Cline | `Instructions for Cline in this repository.` |

**Cursor note**: Each `.mdc` file needs frontmatter:
```
---
description: [what this rule covers]
globs: [file patterns this applies to, or omit for always-on]
alwaysApply: true|false
---
```
Split content into multiple `.mdc` files by concern (e.g. `coding-style.mdc`, `arcgis-patterns.mdc`, `git-conventions.mdc`).

### Interaction instructions block (add for non-Claude agents)

For agents without native tool support for interactive questioning (Copilot, Cursor, Windsurf, Gemini CLI, Codex, Cline, Aider), add this block inside the Behaviour rules section:

```
### When you need information from me
- Ask one question at a time — never a list of questions at once.
- For each question, propose 2–4 likely answers as options I can confirm, correct, or replace.
- Wait for my answer before continuing.
- If you are about to write code for something that might already exist, ask first: "Does X already exist in this codebase?"
```

---

## Step 3 — Output structure

Never invent or assume details. Write in direct, imperative language.

### PROJECT.md structure (shared mode only)

Used when the user chose shared mode. Contains all project context — no agent-specific behaviour rules.

```
# [Project Name]

> [One-sentence description: what it does and who it is for.]

This file is the shared AI context for this project. It is read by all AI coding agents.
Agent-specific behaviour rules live in each agent's own file (CLAUDE.md, AGENTS.md, copilot-instructions.md, etc.).

---

## What this project is

[2–4 sentences: purpose, users, output, read-only vs interactive.]

---

## Commands

\`\`\`bash
[install]
[dev — include port]
[test]
[lint]
[build]
\`\`\`

---

## Stack

| Concern | Choice |
|---|---|
| Language | [value] |
| Bundler | [value] |
| [Other] | [value] |

---

## File map

\`\`\`
[Annotated directory tree.]
\`\`\`

---

## Architecture

[Modules/apps, roles, data persistence.]

### Data flow (if non-obvious)

[Step 1] → [Step 2] → [Step 3]

---

## Coding style

[User's coding style rules.]

---

## Constraints

- [What this project does NOT do]

---

## Key technical patterns

[API patterns, import conventions, SDK quirks — grouped by library/concern.]

---

## What to avoid

- [Anti-pattern 1]
- [Anti-pattern 2]

---

## Known issues / differences

| Feature | Context A | Context B | Notes |
|---|---|---|---|
| [feature] | [behaviour] | [behaviour] | [notes] |

---

## Deployment

[Platform, URLs, base path, CI/CD, build process.]

---

## Git conventions

[Conventional commits, AI/human commit helpers, custom skills/commands, docs to update when shipping, security/staging rules.]
```

---

### Minimal agent file structure (shared mode only)

Used for each agent file when the user chose shared mode. Contains only what is specific to that agent.

```
# [Project Name] — [Agent Name]

> [One-sentence description.]

[Preamble line — agent-specific]

Read `PROJECT.md` for full project context: stack, architecture, commands, coding style, git conventions, and security rules.

---

## Behaviour rules

[Only agent-specific behaviour rules. Do NOT repeat anything already in PROJECT.md.]

[Add the interaction instructions block for non-Claude agents.]

### Ask before destructive actions
Confirm before: deleting files, force-pushing, resetting git state, dropping packages.

### Keep responses concise
Prefer showing changed code over explaining it. Use markdown link syntax for file references.

---

## Closing the loop (always follow these — non-negotiable)

[Same closing the loop section — always written verbatim, in every agent file.]
```

---

### Standalone agent file structure (standalone mode only)

Use this structure for every file. Omit sections the user said are not applicable — **except "Closing the loop", which is always written verbatim**.

```
# [Project Name]

> [One-sentence description: what it does and who it is for.]

[Preamble line — agent-specific]

---

## What this project is

[2–4 sentences: purpose, users, output, read-only vs interactive.]

### Layout overview (UI projects only)

- [Top-level layout, panels, persistent UI state.]

---

## Behaviour rules (always follow these)

[Only include rules the user confirmed. Add the interaction instructions block for non-Claude agents.]

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
Add it to the **Known issues / differences** table in this file and ask the user to confirm the entry before closing.

### After completing a significant feature or milestone
Ask:
> "Should I update TODO.md, CHANGELOG.md, or the architecture section of this file to reflect what was built?"

### When something in this context file turns out to be wrong
Correct it immediately. Do not continue working around a known inaccuracy in the instructions.

---

## Coding style

[User's coding style rules.]

---

## Constraints

- [What this project does NOT do]

---

## Stack

| Concern | Choice |
|---|---|
| Language | [value] |
| Bundler | [value] |
| [Other] | [value] |

---

## Quick commands

\`\`\`bash
[install]
[dev — include port]
[test]
[lint]
[build]
\`\`\`

---

## File map

\`\`\`
[Annotated directory tree. Always include SPEC.md if it exists, annotated as "source of truth for requirements".]
\`\`\`

[If SPEC.md exists, add this note:]
> Requirements source of truth: see `SPEC.md`. This file (CLAUDE.md / agent context) covers **how to work** in the project — not what to build.

---

## Architecture

[Modules/apps, roles, data persistence.]

### Data Flow (if non-obvious)

[Step 1] → [Step 2] → [Step 3]

---

## ArcGIS context (only if ArcGIS project)

| Dimension | Value |
|---|---|
| API / SDK version | [value] |
| Product tier | [ArcGIS Online or Enterprise X.Y] |
| Deployment environment | [internet-connected / disconnected / Kubernetes] |
| Layer schema | [Where to check domains, subtypes, attribute rules] |
| UI rules | [e.g. Calcite only, no inline CSS] |
| Explore first | Before writing code for X, ask "what already exists for X?" and request existing code as a reference pattern. |
| Off-limits | [deprecated APIs, legacy widgets, banned patterns] |

---

## Key technical patterns

[API patterns, import conventions, SDK quirks — grouped by library/concern.]

---

## What to avoid

- [Anti-pattern 1]
- [Anti-pattern 2]

---

## Known issues / differences

| Feature | Context A | Context B | Notes |
|---|---|---|---|
| [feature] | [behaviour] | [behaviour] | [notes] |

---

## Deployment

[Platform, URLs, base path, CI/CD, build process.]

---

## Git conventions

[Conventional commits, AI/human commit helpers, custom skills/commands, docs to update when shipping, security/staging rules.]
```

---

After writing all files, list the paths written and ask the user if they want to adjust or expand any section.

In shared mode, remind the user:
> "Keep `PROJECT.md` as your single source of truth for project context. When the project evolves (new stack, architecture change, new gotcha), update `PROJECT.md` — not the individual agent files."
