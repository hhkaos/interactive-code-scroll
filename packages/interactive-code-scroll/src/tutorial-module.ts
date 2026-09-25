/** Minimal Vite plugin shape (vite is not a direct dependency). */
export interface TutorialModulePlugin {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
}

export const TUTORIAL_MODULE_ID = "virtual:interactive-code-scroll/tutorial";
const RESOLVED_ID = `\0${TUTORIAL_MODULE_ID}`;

/** Exposes the author's `tutorial.mdx` to the injected page, wherever the tutorial folder lives. */
export function tutorialModule(mdxPath: string): TutorialModulePlugin {
  return {
    name: "interactive-code-scroll:tutorial",
    resolveId(id) {
      return id === TUTORIAL_MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? `export { Content } from ${JSON.stringify(mdxPath)};` : undefined;
    },
  };
}
