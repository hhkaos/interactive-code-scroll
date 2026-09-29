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

/** Folder of a tutorial and its URL segment (`""` for a single-tutorial site at `/`). */
export interface TutorialSource {
  slug: string;
  dir: string;
}

/**
 * Exposes the author's tutorial folders to the injected pages: for each tutorial, the MDX content
 * and frontmatter, the code sources, captured outputs, requests and image URLs. `series` is true
 * when the site publishes several tutorials under `/<slug>/`.
 */
export function tutorialModule(sources: readonly TutorialSource[], series = false): TutorialModulePlugin {
  const owner = (file: string) =>
    sources.find(({ dir }) => WATCHED_FOLDERS.some((folder) => file.startsWith(join(dir, folder) + sep)));
  return {
    name: "interactive-code-scroll:tutorial",
    resolveId(id) {
      return id === TUTORIAL_MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const lines: string[] = [];
      const entries = sources.map(({ slug, dir }, t) => {
        const tutorial = readTutorialFiles(dir);
        lines.push(`import * as mdx${t} from ${JSON.stringify(tutorial.mdxPath)};`);
        tutorial.images.forEach((image, i) =>
          lines.push(`import image${t}_${i} from ${JSON.stringify(`${join(tutorial.imagesDir, image)}?url`)};`),
        );
        return [
          "{",
          `slug: ${JSON.stringify(slug)},`,
          `Content: mdx${t}.Content,`,
          `frontmatter: mdx${t}.frontmatter,`,
          `files: ${JSON.stringify(tutorial.files)},`,
          `binaries: ${JSON.stringify(tutorial.binaries)},`,
          `codeDir: ${JSON.stringify(tutorial.codeDir)},`,
          `outputs: ${JSON.stringify(tutorial.outputs)},`,
          `outputDir: ${JSON.stringify(tutorial.outputDir)},`,
          `requests: ${JSON.stringify(tutorial.requests)},`,
          `images: {${tutorial.images.map((image, i) => `${JSON.stringify(image)}: image${t}_${i}`).join(", ")}},`,
          "}",
        ].join("\n");
      });
      return [...lines, `export const series = ${series};`, `export const tutorials = [${entries.join(",\n")}];`].join("\n");
    },
    // Validation runs inside the MDX compile, so a change in a watched folder must also update
    // its tutorial.mdx; Astro's HMR then drops it from the SSR runner and the next request recompiles it.
    configureServer(server) {
      server.watcher.add(sources.flatMap(({ dir }) => WATCHED_FOLDERS.map((folder) => join(dir, folder))));
    },
    hotUpdate({ file, modules }) {
      const source = owner(file);
      if (!source) return undefined;
      const graph = this.environment.moduleGraph;
      const tutorial = [...(graph.getModulesByFile(join(source.dir, "tutorial.mdx")) ?? []), graph.getModuleById(RESOLVED_ID)];
      return [...new Set([...modules, ...tutorial.filter(Boolean)])];
    },
  };
}
