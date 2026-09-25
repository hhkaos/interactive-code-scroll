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
  const config = { root: pathToFileURL(`${root}/`) } as AstroConfig;
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
  it("re-exports Content from the tutorial MDX", () => {
    const plugin = tutorialModule("/abs/tutorial/tutorial.mdx");
    const resolved = plugin.resolveId(TUTORIAL_MODULE_ID)!;
    expect(plugin.load(resolved)).toBe('export { Content } from "/abs/tutorial/tutorial.mdx";');
    expect(plugin.resolveId("other")).toBeUndefined();
  });
});
