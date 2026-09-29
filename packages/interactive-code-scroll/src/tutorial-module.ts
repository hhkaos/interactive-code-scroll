import { join, sep } from "node:path";
import { readTutorialFiles } from "./tutorial-files.ts";

interface ModuleGraph {
  getModulesByFile(file: string): Set<unknown> | undefined;
  getModuleById(id: string): unknown;
}

/** Minimal Vite plugin shape (vite is not a direct dependency). */
export interface TutorialModulePlugin {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
  configureServer(server: { watcher: { add(paths: string[]): unknown } }): void;
  hotUpdate(this: { environment: { moduleGraph: ModuleGraph } }, update: { file: string; modules: unknown[] }): unknown[] | undefined;
}

export const TUTORIAL_MODULE_ID = "virtual:interactive-code-scroll/tutorial";
const RESOLVED_ID = `\0${TUTORIAL_MODULE_ID}`;

/** Folders the MDX validation reads besides `tutorial.mdx`. */
export const WATCHED_FOLDERS = ["code", "images", "requests", "output"];

/**
 * Exposes the author's tutorial folder to the injected page: the MDX content and
 * frontmatter, the code sources and the image URLs.
 */
export function tutorialModule(tutorialDir: string): TutorialModulePlugin {
  return {
    name: "interactive-code-scroll:tutorial",
    resolveId(id) {
      return id === TUTORIAL_MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const tutorial = readTutorialFiles(tutorialDir);
      const imports = tutorial.images.map(
        (image, i) => `import image${i} from ${JSON.stringify(`${join(tutorial.imagesDir, image)}?url`)};`,
      );
      return [
        `export { Content, frontmatter } from ${JSON.stringify(tutorial.mdxPath)};`,
        ...imports,
        `export const files = ${JSON.stringify(tutorial.files)};`,
        `export const binaries = ${JSON.stringify(tutorial.binaries)};`,
        `export const codeDir = ${JSON.stringify(tutorial.codeDir)};`,
        `export const outputs = ${JSON.stringify(tutorial.outputs)};`,
        `export const outputDir = ${JSON.stringify(tutorial.outputDir)};`,
        `export const images = {${tutorial.images.map((image, i) => `${JSON.stringify(image)}: image${i}`).join(", ")}};`,
      ].join("\n");
    },
    // Validation runs inside the MDX compile, so a change in a watched folder must also update
    // tutorial.mdx; Astro's HMR then drops it from the SSR runner and the next request recompiles it.
    configureServer(server) {
      server.watcher.add(WATCHED_FOLDERS.map((folder) => join(tutorialDir, folder)));
    },
    hotUpdate({ file, modules }) {
      if (!WATCHED_FOLDERS.some((folder) => file.startsWith(join(tutorialDir, folder) + sep))) return undefined;
      const graph = this.environment.moduleGraph;
      const tutorial = [...(graph.getModulesByFile(join(tutorialDir, "tutorial.mdx")) ?? []), graph.getModuleById(RESOLVED_ID)];
      return [...new Set([...modules, ...tutorial.filter(Boolean)])];
    },
  };
}
