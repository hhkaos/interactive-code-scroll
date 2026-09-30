# create-interactive-code-scroll

Create an [InteractiveCodeScroll](https://github.com/hhkaos/interactive-code-scroll) tutorial project.

```sh
npm create interactive-code-scroll@alpha my-tutorial
# or
pnpm create interactive-code-scroll@alpha my-tutorial
```

The wizard asks what to create — one tutorial or a series with an index page, what it teaches (web app, REST API, script or native app), its languages (as code variants or one tutorial per language), the package manager, a GitHub Pages workflow, `git init` and installing dependencies — then writes a small working example and prints the next steps.

Every question has an option, so the same project can be created without a terminal:

```sh
npm create interactive-code-scroll@alpha docs -- --layout series --tutorials intro,advanced \
  --type rest --langs curl,python --languages-as variants --index mdx --pm npm --pages --yes
```

Run with `--help` for every option. See the [CLI reference](https://github.com/hhkaos/interactive-code-scroll/blob/main/docs/cli.md).
