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
});

describe("tutorialModule", () => {
  it("exposes content, frontmatter, code sources and image URLs", () => {
    const root = projectWithTutorial();
    mkdirSync(join(root, "tutorial", "code", "js"), { recursive: true });
    mkdirSync(join(root, "tutorial", "images"));
    writeFileSync(join(root, "tutorial", "code", "js", "main.js"), 'const a = "1";\n');
    writeFileSync(join(root, "tutorial", "images", "shot.png"), "");
    const plugin = tutorialModule(join(root, "tutorial"));

    const code = plugin.load(plugin.resolveId(TUTORIAL_MODULE_ID)!)!;
    expect(code).toContain(`export { Content, frontmatter } from ${JSON.stringify(join(root, "tutorial", "tutorial.mdx"))};`);
    expect(code).toContain('export const files = [{"path":"js/main.js","source":"const a = \\"1\\";\\n"}];');
    expect(code).toContain(`import image0 from ${JSON.stringify(join(root, "tutorial", "images", "shot.png") + "?url")};`);
    expect(code).toContain('export const images = {"images/shot.png": image0};'.replace("images/", ""));
    expect(plugin.resolveId("other")).toBeUndefined();
    expect(plugin.load("other")).toBeUndefined();
  });

  it("re-validates tutorial.mdx in dev when a watched folder changes", () => {
    const tutorialDir = join(projectWithTutorial(), "tutorial");
    const plugin = tutorialModule(tutorialDir);
    const add = vi.fn();
    plugin.configureServer({ watcher: { add } });
    expect(add).toHaveBeenCalledWith(["code", "images", "requests", "output"].map((folder) => join(tutorialDir, folder)));

    const mdx = { id: "mdx" };
    const virtual = { id: "virtual" };
    const changed = { id: "changed" };
    const environment = {
      moduleGraph: {
        getModulesByFile: (file: string) => (file === join(tutorialDir, "tutorial.mdx") ? new Set([mdx]) : undefined),
        getModuleById: (id: string) => (id === `\0${TUTORIAL_MODULE_ID}` ? virtual : undefined),
      },
    };
    const update = (file: string, modules: unknown[] = []) => plugin.hotUpdate.call({ environment }, { file, modules });
    expect(update(join(tutorialDir, "images", "new.png"))).toEqual([mdx, virtual]);
    expect(update(join(tutorialDir, "code", "main.js"), [changed, mdx])).toEqual([changed, mdx, virtual]);
    expect(update(join(tutorialDir, "notes.md"))).toBeUndefined();
    expect(update(join(tutorialDir, "code-old", "main.js"))).toBeUndefined();
  });
});
