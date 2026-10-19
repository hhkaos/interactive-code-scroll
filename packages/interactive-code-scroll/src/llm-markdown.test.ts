import { describe, expect, it } from "vitest";
import { readTutorialConfig } from "./frontmatter.ts";
import { llmsTxt, markdownNames, markdownVariant, tutorialMarkdown, type MarkdownInput } from "./llm-markdown.ts";
import { markdownParts } from "./llm-parts.ts";

const MAIN = [
  "// #region config",
  'const clientId = "YOUR_CLIENT_ID"; // @var clientId',
  "// #endregion config",
  "",
  "function start() {",
  "  // #region run",
  "  console.log(`Client ${clientId}`);",
  "  // #endregion run",
  "}",
  "",
].join("\n");

function markdown(mdx: string, overrides: Partial<MarkdownInput> = {}): string {
  const frontmatter = overrides.frontmatter ?? { title: "Sign in", description: "Use OAuth." };
  return tutorialMarkdown({
    parts: markdownParts(mdx),
    config: readTutorialConfig(frontmatter as Record<string, unknown>),
    frontmatter,
    files: [{ path: "main.js", source: MAIN }],
    pageUrl: "https://example.com/sign-in/",
    url: (path) => (path.startsWith("/") ? `https://example.com${path}` : `https://example.com/sign-in/${path}`),
    images: { "flow.png": "/_astro/flow.abc.png", "icon.svg": "data:image/svg+xml;base64,PHN2Zz4=" },
    ...overrides,
  });
}

describe("tutorialMarkdown", () => {
  it("writes the header, the prose and each step's region with defaults applied and markers stripped", () => {
    const md = markdown(`---
title: Sign in
---

<Intro>

## Before you start

You need an account.

</Intro>

<Step id="config" file="main.js" region="config">

## Configure

Set your client ID.

</Step>

<Step id="run" file="main.js" region="run">

## Run

</Step>
`);
    expect(md).toBe(`# Sign in

> Use OAuth.

Interactive version: https://example.com/sign-in/

## Before you start

You need an account.

## Configure

Set your client ID.

\`\`\`javascript title="code/main.js" region="config"
const clientId = "YOUR_CLIENT_ID";
\`\`\`

## Run

\`\`\`javascript title="code/main.js" region="run"
console.log(\`Client \${clientId}\`);
\`\`\`

## Final code

### code/main.js

\`\`\`javascript title="code/main.js"
const clientId = "YOUR_CLIENT_ID";

function start() {
  console.log(\`Client \${clientId}\`);
}
\`\`\`
`);
  });

  it("turns fields, hints and media into Markdown, keeps other HTML and drops comments", () => {
    const md = markdown(`<Step id="a" images={["flow.png", "icon.svg"]} embed="slides/#/2">

## Fields

{/* author note */}

Read the <Hint id="cid" label="client ID">It identifies your app.</Hint> first.

<VarField name="clientId" label="Client ID" secret />
<VarField name="portal" label="Portal" />

<details>
<summary>More</summary>

Extra.

</details>

</Step>
`);
    expect(md).toContain("Read the client ID (It identifies your app.) first.");
    expect(md).toContain("- **Client ID** (`clientId`)\n- **Portal** (`portal`)");
    expect(md).toContain("<details>\n<summary>More</summary>\n\nExtra.\n\n</details>");
    expect(md).toContain("![flow.png](https://example.com/_astro/flow.abc.png)\n\n*Image: icon.svg*\n\n[Embedded page](https://example.com/sign-in/embeds/slides/#/2)");
    expect(md).not.toContain("author note");
  });

  it("shows the whole file for a step without a region and nothing for an outline step", () => {
    const md = markdown(`<Step id="all" file="main.js">

## All

</Step>

<Step id="recap" outline>

## Recap

</Step>
`);
    const [steps] = md.split("## Final code");
    expect(steps).toContain('```javascript title="code/main.js"\nconst clientId');
    expect(steps!.split("## Recap")[1]!.trim()).toBe("");
  });

  it("keeps only the variant's steps and code, and links the other variants", () => {
    const frontmatter = {
      title: "Sign in",
      variants: [
        { id: "js", label: "JavaScript", dir: "js", entry: "main.js" },
        { id: "python", label: "Python", dir: "python", entry: "main.py" },
      ],
    };
    const files = [
      { path: "js/main.js", source: "// #region config\nconst id = 1;\n// #endregion config\n" },
      { path: "python/main.py", source: "# #region config\nid = 1\n# #endregion config\n" },
    ];
    const mdx = `<Step id="config" region="config">

## Configure

</Step>

<Step id="npm" only="js">

## Install with npm

</Step>
`;
    const config = readTutorialConfig(frontmatter);
    const python = markdown(mdx, { frontmatter, files, variant: markdownVariant(config.variants, "tutorial.python") });
    expect(python).toContain("Interactive version: https://example.com/sign-in/?variant=python");
    expect(python).toContain("Code variant: Python. Other variants: [JavaScript](https://example.com/sign-in/tutorial.js.md).");
    expect(python).toContain('```python title="code/python/main.py" region="config"\nid = 1\n```');
    expect(python).not.toContain("Install with npm");
    expect(python).not.toContain("js/main.js");
    const js = markdown(mdx, { frontmatter, files, variant: markdownVariant(config.variants, "tutorial") });
    expect(js).toContain("Install with npm");
    expect(js).toContain('title="code/js/main.js" region="config"');
  });

  it("keeps the prose intact around components after multibyte characters", () => {
    const md = markdown(`Configuración rápida 🚀 con <Hint id="h" label="señal">Ñandú.</Hint> y más.

<Step id="config" file="main.js" region="config">

## Configurar ✅

Texto después.

</Step>
`);
    expect(md).toContain("Configuración rápida 🚀 con señal (Ñandú.) y más.\n\n## Configurar ✅\n\nTexto después.\n\n```javascript");
  });

  it("fences code that holds triple backticks with a longer fence", () => {
    const md = markdown(`<Step id="doc" file="notes.md">

## Notes

</Step>
`, { files: [{ path: "notes.md", source: "Example:\n\n```sh\nls\n```\n" }] });
    expect(md).toContain('````markdown title="code/notes.md"\nExample:\n\n```sh\nls\n```\n````');
  });
});

describe("markdownNames", () => {
  it("publishes tutorial.md plus one file per variant", () => {
    expect(markdownNames(undefined)).toEqual(["tutorial"]);
    expect(markdownNames([{ id: "js", label: "JS", dir: "js", entry: "main.js" }])).toEqual(["tutorial", "tutorial.js"]);
  });
});

describe("llmsTxt", () => {
  it("lists each tutorial's Markdown, with variant files when there are several", () => {
    expect(
      llmsTxt("Tutorials", "Learn things.", [
        { title: "Sign in", description: "Use OAuth.", href: "/sign-in/tutorial.md" },
        {
          title: "Geocode",
          href: "/geocode/tutorial.md",
          variants: [
            { label: "JS", href: "/geocode/tutorial.js.md" },
            { label: "Python", href: "/geocode/tutorial.python.md" },
          ],
        },
      ]),
    ).toBe(`# Tutorials

> Learn things.

## Tutorials

- [Sign in](/sign-in/tutorial.md): Use OAuth.
- [Geocode](/geocode/tutorial.md)
- [Geocode (JS)](/geocode/tutorial.js.md)
- [Geocode (Python)](/geocode/tutorial.python.md)
`);
  });
});
