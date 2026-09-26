# InteractiveCodeScroll

Interactive, scroll-driven code tutorials and live-coding talks from MDX.

Write your tutorial in MDX, annotate your source code, and get a static site with docs and code side by side: scrolling (or a presentation clicker) highlights the relevant code, switches files and shows images; forms update the code live; readers can preview, copy and download the result.

> Status: early design. See [SPEC.md](SPEC.md) for requirements and [TODO.md](TODO.md) for what's next.

## CLI

Existing tutorial projects can run the generic CLI from their project root:

```sh
pnpm interactive-code-scroll dev
pnpm interactive-code-scroll build
pnpm interactive-code-scroll serve
```

The commands default to a `tutorial/` folder containing `tutorial.mdx`, `code/` and `images/`.
Use `--tutorial <dir>` for a different folder and pass Astro deployment options such as
`--base`, `--site`, `--port`, `--host` or `--outDir` as needed.

The CLI is tutorial-agnostic. Provider-specific guidance, such as OAuth redirect URI help, is outside
the core flow unless a project opts into it explicitly.

## Package Smoke Test

Before publishing, verify the package as an external project would consume it:

```sh
pnpm test:pack
```

This builds the package, creates a tarball with `pnpm pack`, installs it into a temporary tutorial
project, runs `interactive-code-scroll build`, and checks that the static site was produced.

## License

[Apache-2.0](LICENSE)
