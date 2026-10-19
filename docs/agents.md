# Coding Agents

Build tutorials with Claude Code, GitHub Copilot or another coding agent, without learning the tool first: the package ships skills that teach your agent how InteractiveCodeScroll works, a validation command it can read, and a Markdown version of every tutorial for your readers' AI assistants.

## Start with an agent

New project: pick your agents in the wizard, or pass them as a flag.

```sh
npm create interactive-code-scroll@latest my-talk -- --agents claude
```

Existing project: copy the skills into your agent's folder.

```sh
npx interactive-code-scroll skills install --agent claude   # or copilot, agents, all
```

Your project then has:

- The skills in your agent's folder (`.claude/skills/`, `.github/skills/` or `.agents/skills/`), copied from the installed version of the package.
- `AGENTS.md` (and a `CLAUDE.md` that imports it, for Claude Code): where the tutorial is, which skills to use and the validation loop.
- `npm run check`: the build's validation in about a second, which the agent runs after each change.
- `npm run skills`: installs the skills again, for example after upgrading the package.

Open the project in your agent and ask for what you want.

## Skills included

| Skill | What your agent learns |
|---|---|
| `ics-authoring` | How a tutorial is made: folders, `<Step>` and the other components, frontmatter, regions and `@var` markers, the Preview and Result pane, code variants, series sites and the CLI. |
| `ics-verify` | The validation loop: `check --json`, fix each problem with its known fix, repeat, then `build`. |
| `ics-tutorial-design` | Planning before writing: audience, goal, the finished app and one idea per step, kept in `TUTORIAL-PLAN.md` as its memory between sessions. |
| `ics-tutorial-review` | Reviewing a draft as a first-time reader and as an editor, with findings per step (blocker, major, minor) and concrete fixes. |
| `ics-talk` | Preparing a tutorial for a talk: timing per step, slides as steps, results shown big, offline fallbacks, the presentation keys and a rehearsal checklist. |
| `ics-migrate` | Converting a blog post, codelab, README walkthrough or sample repository into a tutorial, and upgrading to a new version of the package. |

Skills use the open [Agent Skills](https://agentskills.io) format: the agent reads each skill's short description up front and loads the rest only when a task needs it, so they cost little context until used.

## What to ask

| You want to | Ask, for example |
|---|---|
| Start from an idea | "Plan a 10-minute demo that shows how to search places with this API, for developers new to it." |
| Bring existing content | "Turn `blog/geocoding.md` into a tutorial with cURL and Python variants." |
| Write the next step | "Write the next planned step: the sign-in call, with a field for the client ID." |
| Check your work | "Review the tutorial before my talk and list what to fix." |
| Get ready to present | "Prepare this tutorial for a 15-minute talk: timing, big results and a fallback for every request." |
| Upgrade | "Upgrade the tutorial to the latest interactive-code-scroll and fix what changed." |

The skills tell the agent to agree on a plan with you first and to write one step at a time, checking each one, so you stay in charge of the story.

## The validation loop

Agents learn fastest from errors. [`interactive-code-scroll check --json`](cli.md#check-without-building) runs every validation the build runs, in about a second, and prints each problem with its file, line and column:

```json
{ "severity": "error", "file": "tutorial/tutorial.mdx", "line": 12, "column": 1, "message": "<Step> region \"config\" not found in code/main.js" }
```

The `ics-verify` skill maps every message to its fix and finishes with a full `build`. What `check` cannot see (how the page looks, whether the Preview app works) needs a look in the dev server.

## Markdown for your readers' AI

Readers use AI assistants too. Every tutorial publishes a plain [Markdown version](authoring.md#markdown-for-llms) (`tutorial.md`, one per code variant) with the prose, each step's code and the final project, and the site lists them in `llms.txt`. The [Ask AI](authoring.md#asking-about-a-selection) action links it, so the assistant can read the whole tutorial, not only the selected lines.

## Supported agents

| `--agent` | Folder | Agents |
|---|---|---|
| `claude` | `.claude/skills/` | Claude Code |
| `copilot` | `.github/skills/` | GitHub Copilot |
| `agents` | `.agents/skills/` | Agents that read this generic folder, such as VS Code's agent mode |

For other agents, check where they read project skills and copy the folders from `node_modules/interactive-code-scroll/dist/skills/`. Commit the skill folders so everyone working on the tutorial gets them, and run `npm run skills` (or `skills install`) after upgrading.
