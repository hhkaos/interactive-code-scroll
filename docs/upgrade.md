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
npm install -D interactive-code-scroll@alpha astro@7.3.5
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

Before v1, breaking changes may happen in alpha releases. Each breaking change should include:

- a changelog entry,
- a migration note here,
- an actionable validation error when possible,
- a fixture/E2E case when the behavior is observable through a tutorial.

### Unreleased: one default per variable name

A variable name used in several files must now have the same default literal everywhere. Before, the form field silently took the first file's default. The build now fails with `@var "name" must have the same default in every file: …` listing each file and value.

Fix it by using the same demo value in every file, or by giving the variables different names.

### Unreleased: literals that cannot be escaped

`@var` on a Python f-string, raw string or triple-quoted string, or on a TOML literal string (`'...'`), is now a build error because typed values could break the code. Switch the literal to a plain string.
