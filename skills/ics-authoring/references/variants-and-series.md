# Code variants, series sites and siblings

## Code variants: same steps, several languages

Use variants when the prose and steps are shared and only the code changes (a REST call as cURL, Python and Node.js). Each variant is a folder under `code/`; with `variants`, every code file must be in a variant folder.

```text
tutorial/
  tutorial.mdx
  code/
    python/request.py
    python/requirements.txt
    curl/request.sh
    node/index.mjs
```

```yaml
variants:
  - { id: python, label: Python, dir: python, entry: request.py, files: ["request.py", "requirements.txt"] }
  - { id: curl, label: cURL, dir: curl, entry: request.sh }
  - { id: node, label: Node.js, dir: node, entry: index.mjs, logo: nodejs.svg }
```

| Key | Notes |
|---|---|
| `id` | Required; lowercase letters, digits, `-`. Used in `?variant=id` links and `only=`. |
| `label` | Required; shown in the language switcher; also a tag in a series. |
| `dir` | Required; folder relative to `code/`; folders must not overlap. |
| `entry` | Required; file shown first, relative to `dir`. |
| `files` | Optional globs relative to `dir` (top-level `files` is not allowed with variants). |
| `logo` | Optional; file in `images/` or `https://` URL. |

Steps across variants:

- Same region id in every variant; `region` alone finds each variant's file.
- `file` is relative to the variant folder and must exist in every covered variant.
- A region missing in a variant fails unless the step sets `only="python curl"`.
- `otherVariantSteps: notice` (default) keeps `only` steps in place with a "This step applies to …" notice; `hide` removes them for other variants.
- One `@var` name fills every variant (same default everywhere).
- Web variants (with `index.html`) get the Preview; others the Result pane. `output/<variant id>/name` overrides `output/name`.
- The ZIP holds the active variant only.

## Series sites: several tutorials, one site

```text
tutorials/
  display-map/       # /display-map/
    tutorial.mdx
    code/
  geocode/           # /geocode/
    tutorial.mdx
    code/
  _drafts/           # ignored
  images/            # index logo and tag logos; never a tutorial
  index.mdx          # optional index page
```

- The CLI detects `tutorials/` when there is no single tutorial; otherwise `--tutorials <dir>`. In `astro.config.mjs`: `interactiveCodeScroll({ tutorials: "tutorials" })`.
- Folder names are URLs: lowercase letters, digits, `-`. Folders starting with `_` or `.` are ignored.
- The index lists every tutorial as a card (title, `description`, `level`, `duration`, `updated`, `tags`, variant links), ordered by `order` then title, with a search bar.
- `persist` field values are shared across the site; `persist="tutorial"` keeps one per tutorial.

`tutorials/index.mdx` customizes the index (fields in frontmatter.md):

```mdx
---
title: ArcGIS tutorials
tagGroups:
  Language: [JavaScript, Python]
---

Start with the REST tutorials.

<TutorialFilter />

<TutorialFavorites />

## Web apps

<TutorialList tags="JavaScript, Web" />
```

Custom index page (full control): an `.astro` file outside `src/pages/`, passed with `--index src/series-home.astro` (or the `index` integration option), importing `tutorials`, `TutorialList`, `TutorialFilter`, `TutorialFavorites` from `interactive-code-scroll/series`. It cannot coexist with `tutorials/index.mdx`. Include `<meta charset="utf-8" />`.

## Sibling tutorials: different prose per language

When the explanations differ (JavaScript SDK vs Python API), write one tutorial per language in a series and link them:

```yaml
# tutorials/display-map-js/tutorial.mdx
family: display-map
familyLabel: JavaScript
```

```yaml
# tutorials/display-map-python/tutorial.mdx
family: display-map
familyLabel: Python
```

- The header gets a menu to switch; matching step `id`s keep the reader's place.
- `family` and `familyLabel` go together; labels unique per family. A family of one, or `family` outside a series, only warns.
- Do not name a sibling after a language that is already a code variant of another sibling.
