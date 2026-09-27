# InteractiveCodeScroll

Build guided, interactive code tutorials from MDX and annotated source code.

## CLI

Run these commands from an existing tutorial project:

```sh
pnpm interactive-code-scroll dev
pnpm interactive-code-scroll build
pnpm interactive-code-scroll serve
```

By default, the CLI expects a `tutorial/` folder with `tutorial.mdx`, `code/` and `images/`.
Use `--tutorial <dir>` to select another tutorial folder.

Provider-specific helpers, such as OAuth redirect URI guidance, are outside the core flow unless a
project opts into them explicitly.
