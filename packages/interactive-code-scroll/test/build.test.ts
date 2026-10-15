import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { expect, it, vi } from "vitest";
import { interactiveCodeScroll } from "../src/index.ts";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}/`, import.meta.url));

it("fails the Astro build with MDX file:line for every broken reference and frontmatter field", async () => {
  const run = build({
    root: fixture("broken"),
    outDir: mkdtempSync(join(tmpdir(), "ics-build-")),
    integrations: [interactiveCodeScroll()],
    logLevel: "silent",
  });
  await expect(run).rejects.toThrow(/tutorial\.mdx:3:1 frontmatter logo "missing\.svg" not found in images\//);
  await expect(run).rejects.toThrow(/tutorial\.mdx:6:1 <Step> region "nope" not found in code\/main\.js/);
  await expect(run).rejects.toThrow(/tutorial\.mdx:10:1 <VarField> no "@var missing" found in code\//);
  await expect(run).rejects.toThrow(/tutorial\.mdx:12:1 <Step> request "missing-request" not found in requests\//);
}, 60_000);

it("publishes captured outputs as is and warns about outputs that look like they hold a credential, and about a family outside a series", async () => {
  // Inside test/fixtures so the injected pages resolve the package dependencies; removed after the run.
  const root = mkdtempSync(fileURLToPath(new URL("./fixtures/result-", import.meta.url)));
  const outDir = join(root, "dist");
  try {
    const tutorial = join(root, "tutorial");
    mkdirSync(join(tutorial, "code"), { recursive: true });
    mkdirSync(join(tutorial, "output", "shots"), { recursive: true });
    writeFileSync(join(tutorial, "tutorial.mdx"), '---\ntitle: Result\npreview: off\nfamily: result\nfamilyLabel: Python\n---\n\n<Step id="run" file="main.py" output="run.json">\nText.\n</Step>\n');
    writeFileSync(join(tutorial, "code", "main.py"), 'TOKEN = "DEMO"  # @var token\n');
    writeFileSync(join(tutorial, "output", "run.json"), '{ "url": "https://x.test/?token=DEMO", "next": "https://x.test/?token=REAL123" }\n');
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    writeFileSync(join(tutorial, "output", "shots", "map.png"), png);

    const warnings: string[] = [];
    const write = process.stdout.write.bind(process.stdout);
    const capture = vi.spyOn(process.stdout, "write").mockImplementation((chunk, ...rest) => {
      warnings.push(String(chunk));
      return write(chunk, ...(rest as []));
    });
    try {
      await build({ root, outDir, integrations: [interactiveCodeScroll()], logLevel: "warn" });
    } finally {
      capture.mockRestore();
    }
    expect(readFileSync(join(outDir, "output", "shots", "map.png"))).toEqual(Buffer.from(png));
    expect(readFileSync(join(outDir, "output", "run.json"), "utf8")).toContain("REAL123");
    expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain('data-output="run.json"');
    const credential = warnings.filter((line) => line.includes("looks like it contains a credential"));
    expect(credential.join("")).toContain("output/run.json:1");
    expect(credential.join("")).not.toContain("REAL123");
    expect(warnings.join("")).toContain('tutorial.mdx:4:1 frontmatter "family" has no effect outside a series site');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

it("leaves out of the site and the ZIP data paths starting with \".\" (unless included) and generated folders", async () => {
  const root = mkdtempSync(fileURLToPath(new URL("./fixtures/hidden-", import.meta.url)));
  const outDir = join(root, "dist");
  try {
    const code = join(root, "tutorial", "code");
    const write = (path: string, text: string) => {
      mkdirSync(join(code, path, ".."), { recursive: true });
      writeFileSync(join(code, path), text);
    };
    mkdirSync(code, { recursive: true });
    // Its own repository root, so this repo's .gitignore (which lists .vscode/) does not apply.
    mkdirSync(join(root, ".git"));
    writeFileSync(
      join(root, "tutorial", "tutorial.mdx"),
      '---\ntitle: Hidden\npreview: iframe\ninclude: [".github/**"]\n---\n\n<Step id="page" file="index.html">\nText.\n</Step>\n',
    );
    write("index.html", "<p>hi</p>\n");
    write(".github/workflows/deploy.yml", "name: deploy-workflow\n");
    write(".hidden/nested/leak.mjs", 'console.log("hidden-leak")\n');
    write(".vscode/settings.json", '{ "vscode-leak": true }\n');
    write(".env", "SECRET=env-leak\n");
    write("node_modules/pkg/index.js", 'console.log("modules-leak")\n');
    write("__pycache__/main.cpython-312.pyc", "pycache-leak\n");
    write("venv/pyvenv.cfg", "home = /usr/bin\n");
    write("venv/lib/site.py", 'print("venv-leak")\n');

    const warnings: string[] = [];
    const out = process.stdout.write.bind(process.stdout);
    const capture = vi.spyOn(process.stdout, "write").mockImplementation((chunk, ...rest) => {
      warnings.push(String(chunk));
      return out(chunk, ...(rest as []));
    });
    try {
      await build({ root, outDir, integrations: [interactiveCodeScroll()], logLevel: "warn" });
    } finally {
      capture.mockRestore();
    }
    // The page embeds every published file (tabs, Preview and ZIP).
    const page = readFileSync(join(outDir, "index.html"), "utf8");
    expect(page).toContain("deploy-workflow");
    expect(readFileSync(join(outDir, "preview", ".github", "workflows", "deploy.yml"), "utf8")).toContain("deploy-workflow");
    for (const leak of ["hidden-leak", "vscode-leak", "env-leak", "modules-leak", "pycache-leak", "venv-leak"]) expect(page).not.toContain(leak);
    for (const path of [".hidden", ".vscode", ".env", "node_modules", "__pycache__", "venv"]) expect(existsSync(join(outDir, "preview", path))).toBe(false);
    const log = warnings.join("");
    expect(log).toContain('code/.hidden/ is not published (paths starting with "." are skipped); add ".hidden/**" to frontmatter "include" to publish it');
    expect(log).toContain("code/.vscode/ is not published");
    expect(log).not.toContain("code/.github/ is not published");
    expect(log).not.toContain("node_modules/ is not published");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

it("leaves gitignored code/ paths out of the site and the ZIP data unless included, and fails a step that points at one", async () => {
  const root = mkdtempSync(fileURLToPath(new URL("./fixtures/gitignore-", import.meta.url)));
  const outDir = join(root, "dist");
  try {
    const tutorial = join(root, "tutorial");
    const write = (path: string, text: string) => {
      mkdirSync(join(tutorial, path, ".."), { recursive: true });
      writeFileSync(join(tutorial, path), text);
    };
    const mdx = (include: string, step = "index.html") =>
      write("tutorial.mdx", `---\ntitle: Gitignore\npreview: iframe\ninclude: ${include}\n---\n\n<Step id="page" file="${step}">\nText.\n</Step>\n`);
    // Its own repository root: only the tutorial's .gitignore files apply, not this repo's.
    mkdirSync(join(root, ".git"));
    mdx('[".env.example", "sample/**"]');
    write(".gitignore", "code/output.csv\n");
    write("code/.gitignore", "# written by the scripts\n.env\nstate.json\nbuild/\nsample/\n");
    write("code/index.html", "<p>hi</p>\n");
    write("code/.env.example", "API_KEY=example-key\n");
    write("code/.env", "API_KEY=env-leak\n");
    write("code/state.json", '{ "item": "state-leak" }\n');
    write("code/output.csv", "parent-leak\n");
    write("code/build/app.js", 'console.log("build-leak")\n');
    write("code/sample/data.json", '{ "sample": "sample-included" }\n');

    const warnings: string[] = [];
    const out = process.stdout.write.bind(process.stdout);
    const capture = vi.spyOn(process.stdout, "write").mockImplementation((chunk, ...rest) => {
      warnings.push(String(chunk));
      return out(chunk, ...(rest as []));
    });
    try {
      await build({ root, outDir, integrations: [interactiveCodeScroll()], logLevel: "warn" });
    } finally {
      capture.mockRestore();
    }
    const page = readFileSync(join(outDir, "index.html"), "utf8");
    expect(page).toContain("example-key");
    expect(page).toContain("sample-included");
    for (const leak of ["env-leak", "state-leak", "parent-leak", "build-leak"]) expect(page).not.toContain(leak);
    for (const path of [".env", "state.json", "output.csv", "build"]) expect(existsSync(join(outDir, "preview", path))).toBe(false);
    expect(existsSync(join(outDir, "preview", "sample", "data.json"))).toBe(true);
    const log = warnings.join("");
    expect(log).toContain('frontmatter include "sample/**" publishes code/sample/data.json, which code/.gitignore excludes');
    expect(log).not.toContain('include ".env.example" publishes');

    mdx('[".env.example"]', "state.json");
    const run = build({ root, outDir, integrations: [interactiveCodeScroll()], logLevel: "silent" });
    await expect(run).rejects.toThrow(/tutorial\.mdx:7:1 <Step> file "state\.json" is gitignored \(by code\/\.gitignore\) and not published/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

it("renders a custom series index page with the public series module", async () => {
  const root = mkdtempSync(fileURLToPath(new URL("./fixtures/series-", import.meta.url)));
  const outDir = join(root, "dist");
  try {
    for (const [slug, frontmatter] of [
      ["alpha", "title: Alpha\norder: 2\ntags: [Web]"],
      ["beta", "title: Beta\norder: 1\nlevel: Beginner\ntags: [Python]"],
    ] as const) {
      mkdirSync(join(root, "tutorials", slug, "code"), { recursive: true });
      writeFileSync(join(root, "tutorials", slug, "tutorial.mdx"), `---\n${frontmatter}\npreview: off\n---\n\n# ${slug}\n`);
      writeFileSync(join(root, "tutorials", slug, "code", "main.py"), "print(1)\n");
    }
    // The published package maps `interactive-code-scroll/series` to this file (smoke-pack covers the specifier).
    writeFileSync(
      join(root, "home.astro"),
      [
        "---",
        'import { tutorials, TutorialFilter, TutorialList } from "../../../src/series-public.ts";',
        "---",
        "<html><body>",
        '<ol id="custom">{tutorials.map((t) => <li><a href={t.href}>{t.title}</a> {t.level}</li>)}</ol>',
        "<TutorialFilter />",
        '<TutorialList tags="Python" />',
        "</body></html>",
        "",
      ].join("\n"),
    );
    await build({ root, outDir, integrations: [interactiveCodeScroll({ tutorials: "tutorials", index: "home.astro" })], logLevel: "silent" });
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain('<ol id="custom"><li><a href="/beta/">Beta</a> Beginner</li><li><a href="/alpha/">Alpha</a> </li></ol>');
    expect(html).toContain('<calcite-chip-group id="series-filter"');
    expect(html.match(/class="series-card-title"[^>]*>([^<]+)</g)).toEqual([expect.stringContaining(">Beta<")]);
    expect(html).toMatch(/<link rel="stylesheet" href="[^"]+\.css"|<style>[^<]*\.series-card/);
    expect(html).toMatch(/<script type="module" src="[^"]+\.js"/);
    expect(readFileSync(join(outDir, "alpha", "index.html"), "utf8")).toContain("Alpha");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

it("fails a series build when two sibling tutorials share a familyLabel", async () => {
  const root = mkdtempSync(fileURLToPath(new URL("./fixtures/family-", import.meta.url)));
  try {
    for (const slug of ["map-js", "map-ts"]) {
      mkdirSync(join(root, "tutorials", slug, "code"), { recursive: true });
      writeFileSync(join(root, "tutorials", slug, "tutorial.mdx"), `---\ntitle: ${slug}\npreview: off\nfamily: map\nfamilyLabel: JavaScript\n---\n\n# ${slug}\n`);
      writeFileSync(join(root, "tutorials", slug, "code", "main.js"), "run();\n");
    }
    const run = build({ root, outDir: join(root, "dist"), integrations: [interactiveCodeScroll({ tutorials: "tutorials" })], logLevel: "silent" });
    await expect(run).rejects.toThrow('tutorials "map-js", "map-ts" use the same familyLabel "JavaScript" in family "map"');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);
