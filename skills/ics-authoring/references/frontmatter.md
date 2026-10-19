# Frontmatter

YAML at the top of `tutorial.mdx`. Only `title` matters to start; every other field has a default. Errors point at the key's line.

```yaml
---
title: Build a checkout page
subtitle: Connect your app to a hosted payment form
description: Accept a payment with a hosted checkout form.
preview: both
tags: [JavaScript, Payments]
level: Beginner
duration: 15 min
---
```

## Page

| Field | Values | Default | Notes |
|---|---|---|---|
| `title` | string | `Tutorial` | Page and header title. Do not repeat it as `#` in the MDX. |
| `subtitle` | string | none | Smaller line under the title in the header. |
| `description` | string | none | One sentence: meta description, series card text, `llms.txt` summary. |
| `theme` | `auto`, `light`, `dark` | `auto` | Author default; readers can switch. |
| `logo` | file in `images/` or `https://` URL | none | Header logo and favicon. Square SVG or PNG ≥ 512 px. |
| `outline` | boolean | `true` (or the series `index.mdx` value) | `false`: an `<Intro>` without media keeps the code panel instead of the step list. |
| `completion` | boolean | `true` | Closing panel after the last step; `false` removes it (then `<Outro>` is an error). |
| `presentationUrl` | `http(s)://` URL | series value, else Astro `site` + path | QR code target of the closing slide. `{slug}` is replaced. |
| `feedbackUrl` | `https://` or `mailto:` URL | series value | "Send feedback" and "Ask the author". Placeholders: `{slug}`, `{title}`, `{context}`, `{selection}`, `{url}`. |
| `ask` | list of `author`, `chatgpt`, `claude`, `{ label, url }`, or `false` | `[author, chatgpt, claude]` | Selection toolbar actions. `author` needs `feedbackUrl`. Custom `url` must be `https://`; `{prompt}` is replaced. |
| `llms` | boolean | `true` | `false`: no `tutorial.md` and no `llms.txt` entry. |

## Code and Preview

| Field | Values | Default | Notes |
|---|---|---|---|
| `files` | list of paths/globs relative to `code/` | all text files (step order first) | Which files get tabs, in order. `*`/`?` stay in a folder, `**` crosses. Not with `variants` (set `files` per variant). |
| `include` | list of paths/globs | none | Publish paths starting with `.` or gitignored, e.g. `[".github/**", ".env.example"]`. A pattern matching nothing is an error. |
| `codeWrap` | boolean | `false` | Wrap long lines. |
| `languages` | map extension → Shiki language or `text` | none | e.g. `{ qmd: markdown }`. |
| `preview` | `off`, `iframe`, `tab`, `both` | `both` | Web code Preview: embedded, new-tab button, or both. `off` needs no `index.html`. |
| `console` | boolean | `false` | Preview / Console tabs with captured logs. Needs `preview: iframe` or `both` and web code. |
| `variants` | list of `{ id, label, dir, entry, files?, logo? }` | none | Code variants (see variants-and-series.md). |
| `otherVariantSteps` | `notice`, `hide` | `notice` | How `only=` steps look to readers of another variant. |

## Series index and siblings

Used by series sites. `description`, `updated`, `duration` and `level` also show on single tutorials (above the explanations).

| Field | Values | Notes |
|---|---|---|
| `tags` | list of strings (no commas) | Card tags and filter values. Variant labels are added automatically. |
| `level` | string | `Beginner`, `Intermediate`, `Advanced` get 1–3 bars. |
| `duration` | string | e.g. `20 min`. |
| `updated` | date `YYYY-MM-DD` | Last content review. Impossible dates fail. |
| `order` | number | Index position, lower first; then by title. |
| `family` | string | Links sibling tutorials; needs `familyLabel`. |
| `familyLabel` | string | This tutorial's name in the sibling menu (unique in the family). |
| `next` | tutorial slug, or `false` | "Next tutorial" in the closing panel; default the next in index order. |

## `tutorials/index.mdx` (series index page)

Only these keys are allowed; the body is prose plus `<TutorialFilter />`, `<TutorialFavorites />`, `<TutorialList />`.

| Field | Values | Default | Notes |
|---|---|---|---|
| `title` | string | `Tutorials` | Header and page title. |
| `description` | string | none | Under the title; meta description. |
| `logo` | file in `tutorials/images/` or `https://` URL | none | |
| `theme` | `auto`, `light`, `dark` | `auto` | |
| `tagGroups` | family name → list of tags or `{ name, logo }` | none | Filter families (same family: any matches; different families: all must match) and tag logos. A tag in two families, an empty family or a tag no tutorial has fail. |
| `feedbackUrl` | URL | none | Default for every tutorial. |
| `ask` | as above | default list | Default for every tutorial. |
| `presentationUrl` | URL with `{slug}` | none | Default for every tutorial. |
| `outline` | boolean | `true` | Default for every tutorial. |

```yaml
---
title: ArcGIS tutorials
description: Build apps with ArcGIS, from REST to native SDKs.
tagGroups:
  Language:
    - { name: JavaScript, logo: javascript.svg }
    - { name: Python, logo: python.svg }
  Auth: [OAuth, API keys]
---
```
