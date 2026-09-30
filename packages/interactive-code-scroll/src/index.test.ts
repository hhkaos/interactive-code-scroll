import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { AstroConfig, AstroIntegration } from "astro";
import { describe, expect, it, vi } from "vitest";
import { interactiveCodeScroll } from "./index.ts";
import { TUTORIAL_MODULE_ID, tutorialModule } from "./tutorial-module.ts";

type SetupHook = NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>;

function runSetup(root: string, options?: Parameters<typeof interactiveCodeScroll>[0]) {
  const updateConfig = vi.fn();
  const injectRoute = vi.fn();
  const setup = interactiveCodeScroll(options).hooks["astro:config:setup"] as SetupHook;
  const config = { root: pathToFileURL(`${root}/`), markdown: {} } as AstroConfig;
  void setup({ config, updateConfig, injectRoute } as unknown as Parameters<SetupHook>[0]);
  return { updateConfig, injectRoute };
}

function projectWithTutorial(folder = "tutorial"): string {
  const root = mkdtempSync(join(tmpdir(), "ics-"));
  mkdirSync(join(root, folder), { recursive: true });
  writeFileSync(join(root, folder, "tutorial.mdx"), "# Hello\n");
  return root;
}

describe("interactiveCodeScroll", () => {
  it("injects the tutorial page at /", () => {
    const { injectRoute } = runSetup(projectWithTutorial());
    expect(injectRoute).toHaveBeenCalledWith(expect.objectContaining({ pattern: "/" }));
  });

  it("adds MDX and the tutorial module", () => {
    const { updateConfig } = runSetup(projectWithTutorial());
    const config = updateConfig.mock.calls[0]![0];
    expect(config.integrations.map((i: AstroIntegration) => i.name)).toContain("@astrojs/mdx");
    expect(config.vite.plugins.map((p: { name: string }) => p.name)).toContain("interactive-code-scroll:tutorial");
  });

  it("supports a custom tutorial folder", () => {
    const { injectRoute } = runSetup(projectWithTutorial("docs/oauth"), { tutorial: "docs/oauth" });
    expect(injectRoute).toHaveBeenCalled();
  });

  it("fails with a clear error when tutorial.mdx is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-"));
    expect(() => runSetup(root)).toThrow(/tutorial not found at .*tutorial\.mdx/);
  });

  it("injects an index and every tutorial route under /<slug>/ for a series", () => {
    const root = projectWithTutorial("tutorials/alpha");
    mkdirSync(join(root, "tutorials", "beta"));
    writeFileSync(join(root, "tutorials", "beta", "tutorial.mdx"), "# Beta\n");
    const { injectRoute, updateConfig } = runSetup(root, { tutorials: "tutorials" });
    const patterns = injectRoute.mock.calls.map(([route]) => route.pattern);
    expect(patterns).toEqual(["/", "/[tutorial]", "/[tutorial]/preview", "/[tutorial]/preview/[...file]", "/[tutorial]/output/[...file]"]);
    expect(injectRoute.mock.calls[0]![0].entrypoint.href).toMatch(/pages\/series-index\.astro$/);
    const plugin = updateConfig.mock.calls[0]![0].vite.plugins[0] as ReturnType<typeof tutorialModule>;
    const code = plugin.load(plugin.resolveId(TUTORIAL_MODULE_ID)!)!;
    expect(code).toContain("export const series = true;");
    expect(code).toContain('slug: "alpha"');
    expect(code).toContain('slug: "beta"');
    expect(code).toContain("export const seriesIndex = undefined;");
  });

  it("exposes a series' index.mdx and its images", () => {
    const root = projectWithTutorial("tutorials/alpha");
    mkdirSync(join(root, "tutorials", "images"));
    writeFileSync(join(root, "tutorials", "index.mdx"), "# Index\n");
    writeFileSync(join(root, "tutorials", "images", "logo.svg"), "<svg/>");
    const seriesDir = join(root, "tutorials");
    const plugin = tutorialModule([{ slug: "alpha", dir: join(seriesDir, "alpha") }], seriesDir);
    const code = plugin.load(plugin.resolveId(TUTORIAL_MODULE_ID)!)!;
    expect(code).toContain(`import * as seriesIndexMdx from ${JSON.stringify(join(seriesDir, "index.mdx"))};`);
    expect(code).toContain("export const seriesIndex = { Content: seriesIndexMdx.Content, frontmatter: seriesIndexMdx.frontmatter };");
    expect(code).toContain(`import seriesImage0 from ${JSON.stringify(join(seriesDir, "images", "logo.svg") + "?url")};`);
    expect(code).toContain('export const seriesImages = {"logo.svg": seriesImage0};');

    const add = vi.fn();
    plugin.configureServer({ watcher: { add } });
    expect(add.mock.calls[0]![0]).toContain(join(seriesDir, "images"));
    const indexMdx = { id: "index" };
    const virtual = { id: "virtual" };
    const environment = {
      moduleGraph: {
        getModulesByFile: (file: string) => (file === join(seriesDir, "index.mdx") ? new Set([indexMdx]) : undefined),
        getModuleById: (id: string) => (id === `\0${TUTORIAL_MODULE_ID}` ? virtual : undefined),
      },
    };
    expect(plugin.hotUpdate.call({ environment }, { file: join(seriesDir, "images", "new.svg"), modules: [] })).toEqual([indexMdx, virtual]);
  });

  it("replaces the series index with a custom index page", () => {
    const root = projectWithTutorial("tutorials/alpha");
    writeFileSync(join(root, "home.astro"), "<h1>Home</h1>\n");
    const { injectRoute } = runSetup(root, { tutorials: "tutorials", index: "home.astro" });
    expect(injectRoute.mock.calls[0]![0]).toEqual({ pattern: "/", entrypoint: pathToFileURL(join(root, "home.astro")) });
  });

  it("rejects an index page that is not usable", () => {
    const root = projectWithTutorial("tutorials/alpha");
    writeFileSync(join(root, "home.md"), "# Home\n");
    expect(() => runSetup(root, { tutorials: "tutorials", index: "missing.astro" })).toThrow(/index page not found at .*missing\.astro/);
    expect(() => runSetup(root, { tutorials: "tutorials", index: "home.md" })).toThrow(/"index" must be an \.astro page, got "home\.md"/);
    expect(() => runSetup(projectWithTutorial(), { index: "home.astro" })).toThrow(/"index" .* needs "tutorials"/);
    writeFileSync(join(root, "home.astro"), "<h1>Home</h1>\n");
    writeFileSync(join(root, "tutorials", "index.mdx"), "# Index\n");
    expect(() => runSetup(root, { tutorials: "tutorials", index: "home.astro" })).toThrow(/index\.mdx is not used with a custom "index" page/);
  });

  it("rejects tutorial and tutorials together", () => {
    expect(() => runSetup(projectWithTutorial(), { tutorial: "tutorial", tutorials: "tutorials" })).toThrow(/either "tutorial".*or "tutorials"/);
  });
});

describe("tutorialModule", () => {
  it("exposes content, frontmatter, code sources and image URLs", () => {
    const root = projectWithTutorial();
    mkdirSync(join(root, "tutorial", "code", "js"), { recursive: true });
    mkdirSync(join(root, "tutorial", "images"));
    writeFileSync(join(root, "tutorial", "code", "js", "main.js"), 'const a = "1";\n');
    writeFileSync(join(root, "tutorial", "images", "shot.png"), "");
    const plugin = tutorialModule([{ slug: "", dir: join(root, "tutorial") }]);

    const code = plugin.load(plugin.resolveId(TUTORIAL_MODULE_ID)!)!;
    expect(code).toContain(`import * as mdx0 from ${JSON.stringify(join(root, "tutorial", "tutorial.mdx"))};`);
    expect(code).toContain("export const series = false;");
    expect(code).toContain('slug: "",\nContent: mdx0.Content,\nfrontmatter: mdx0.frontmatter,');
    expect(code).toContain('files: [{"path":"js/main.js","source":"const a = \\"1\\";\\n"}],');
    expect(code).toContain(`import image0_0 from ${JSON.stringify(join(root, "tutorial", "images", "shot.png") + "?url")};`);
    expect(code).toContain('images: {"shot.png": image0_0},');
    expect(plugin.resolveId("other")).toBeUndefined();
    expect(plugin.load("other")).toBeUndefined();
  });

  it("re-validates the owning tutorial.mdx in dev when a watched folder changes", () => {
    const root = projectWithTutorial("tutorials/alpha");
    const alpha = join(root, "tutorials", "alpha");
    const beta = join(root, "tutorials", "beta");
    const plugin = tutorialModule([
      { slug: "alpha", dir: alpha },
      { slug: "beta", dir: beta },
    ]);
    const add = vi.fn();
    plugin.configureServer({ watcher: { add } });
    const folders = ["code", "images", "requests", "output"];
    expect(add).toHaveBeenCalledWith([...folders.map((folder) => join(alpha, folder)), ...folders.map((folder) => join(beta, folder))]);

    const alphaMdx = { id: "alpha" };
    const betaMdx = { id: "beta" };
    const virtual = { id: "virtual" };
    const changed = { id: "changed" };
    const byFile = new Map([
      [join(alpha, "tutorial.mdx"), new Set([alphaMdx])],
      [join(beta, "tutorial.mdx"), new Set([betaMdx])],
    ]);
    const environment = {
      moduleGraph: {
        getModulesByFile: (file: string) => byFile.get(file),
        getModuleById: (id: string) => (id === `\0${TUTORIAL_MODULE_ID}` ? virtual : undefined),
      },
    };
    const update = (file: string, modules: unknown[] = []) => plugin.hotUpdate.call({ environment }, { file, modules });
    expect(update(join(alpha, "images", "new.png"))).toEqual([alphaMdx, virtual]);
    expect(update(join(beta, "code", "main.js"), [changed, betaMdx])).toEqual([changed, betaMdx, virtual]);
    expect(update(join(alpha, "notes.md"))).toBeUndefined();
    expect(update(join(alpha, "code-old", "main.js"))).toBeUndefined();
  });
});
