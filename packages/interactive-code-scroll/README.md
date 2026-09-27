# InteractiveCodeScroll

Build guided, interactive code tutorials from MDX and annotated source code.

## CLI

Run these commands from an existing tutorial project:

```sh
npm exec -- interactive-code-scroll dev
npm exec -- interactive-code-scroll build
npm exec -- interactive-code-scroll serve
```

By default, the CLI expects a `tutorial/` folder with `tutorial.mdx`, `code/` and `images/`.
Use `--tutorial <dir>` to select another tutorial folder.

If your tutorial files live at the project root, use:

```sh
npm exec -- interactive-code-scroll dev --tutorial .
```

For pnpm projects, use `pnpm exec interactive-code-scroll dev --tutorial .` or add scripts:

```sh
pnpm exec interactive-code-scroll init-scripts --write
pnpm run dev -- --tutorial .
```

Use `interactive-code-scroll doctor` to inspect the detected root, package manager, Astro binary and
`tutorial.mdx` candidates.

Provider-specific helpers, such as OAuth redirect URI guidance, are outside the core flow unless a
project opts into them explicitly.
