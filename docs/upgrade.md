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

No breaking changes are documented yet.
