# Upgrade Guide

InteractiveCodeScroll is still pre-v1. Keep upgrades deliberate and test each tutorial after changing versions.

## Recommended Upgrade Flow

1. Read `CHANGELOG.md`.
2. Update `interactive-code-scroll` and `astro` together when the release notes ask for it.
3. Run `interactive-code-scroll doctor`.
4. Run the tutorial in dev mode and fix validation errors.
5. Build the tutorial.
6. Check Preview, downloads and any provider-specific flows.

```sh
npm install -D interactive-code-scroll astro@7.3.5
npm exec -- interactive-code-scroll doctor
npm exec -- interactive-code-scroll dev
npm exec -- interactive-code-scroll build
```

## Authoring Changes To Watch

- Frontmatter fields: new validation may reject misspelled or unsupported values.
- MDX components: props are intentionally small and explicit.
- Markers: malformed regions and duplicate variables fail the build.
- Preview: `code/index.html` is required when Preview is enabled.
- CLI arguments: package scripts must forward options after `--`.

## Breaking Changes

Before v1, breaking changes may happen in alpha and beta releases. Each breaking change should include:

- a changelog entry,
- a migration note here,
- an actionable validation error when possible,
- a fixture/E2E case when the behavior is observable through a tutorial.

### 0.2.0-beta.0: `latest` dist-tag

Releases are no longer published only under `@alpha`: `npm install -D interactive-code-scroll` and `npm create interactive-code-scroll@latest` get this version. Projects pinned to `interactive-code-scroll@alpha` keep the last alpha until they change the specifier:

```sh
npm install -D interactive-code-scroll@latest astro@7.3.5
```

### 0.2.0-beta.0: one default per variable name

A variable name used in several files must now have the same default literal everywhere. Before, the form field silently took the first file's default. The build now fails with `@var "name" must have the same default in every file: …` listing each file and value.

Fix it by using the same demo value in every file, or by giving the variables different names.

### 0.2.0-beta.0: clicker keys from fields and the Result pane

PageDown/PageUp now move steps even while the focus is in a form field, the JSON tree or the Result pane (only multi-line text keeps them), so presentation clickers work after typing a value. Arrow keys are unchanged in fields and the JSON tree, and the Result pane's Body/Headers tabs and "Run as" picker now keep their arrow keys too. No tutorial changes are needed.

### 0.2.0-beta.0: results and requests (multi-SDK Phase 1)

New optional folders and props: `output/` with `<Step output="…">`, `requests/` (`.http` files and `errors.json`) with `<Step request="…">`, `variants` in the frontmatter, `<Step only="…">` and `otherVariantSteps`. Existing tutorials build unchanged unless they hit one of these new build errors:

- `output=` or `request=` on a step that only web code shows (web code has the Preview).
- A `code/requests/` folder (or `code/<variant dir>/requests/`) in a tutorial with `requests/`: both would land in the ZIP as `requests/`. Rename the code folder.
- With `variants`, every file under `code/` must be in exactly one variant folder, and the top-level `files:` moves into each variant.

See [Result Pane](authoring.md#result-pane), [HTTP Requests](authoring.md#http-requests) and [Code Variants](authoring.md#code-variants).

### 0.2.0-beta.0: literals that cannot be escaped

`@var` on a Python f-string, raw string or triple-quoted string, or on a TOML literal string (`'...'`), is now a build error because typed values could break the code. Switch the literal to a plain string.
