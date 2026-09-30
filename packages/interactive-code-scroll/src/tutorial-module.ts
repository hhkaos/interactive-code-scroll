import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { SERIES_IMAGES, SERIES_INDEX } from "./series.ts";
import { listFiles, readTutorialFiles } from "./tutorial-files.ts";

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
 * and frontmatter, the code sources, captured outputs, requests and image URLs. `seriesDir` is set
 * when the site publishes several tutorials under `/<slug>/`; its optional `index.mdx` and
 * `images/` feed the index page.
 */
/** `base` is read when the module loads: Astro's final `config.base`, never `import.meta.env.BASE_URL`, which a `BASE_URL` environment variable overrides at build time. */
export function tutorialModule(sources: readonly TutorialSource[], seriesDir?: string, base: () => string = () => "/"): TutorialModulePlugin {
  const series = seriesDir !== undefined;
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
      const indexMdx = seriesDir === undefined ? undefined : join(seriesDir, SERIES_INDEX);
      const hasIndex = indexMdx !== undefined && existsSync(indexMdx);
      if (hasIndex) lines.push(`import * as seriesIndexMdx from ${JSON.stringify(indexMdx)};`);
      const indexImages = seriesDir === undefined ? [] : listFiles(join(seriesDir, SERIES_IMAGES));
      indexImages.forEach((image, i) => lines.push(`import seriesImage${i} from ${JSON.stringify(`${join(seriesDir!, SERIES_IMAGES, image)}?url`)};`));
      return [
        ...lines,
        `export const series = ${series};`,
        `export const base = ${JSON.stringify(base())};`,
        `export const tutorials = [${entries.join(",\n")}];`,
        `export const seriesIndex = ${hasIndex ? "{ Content: seriesIndexMdx.Content, frontmatter: seriesIndexMdx.frontmatter }" : "undefined"};`,
        `export const seriesImages = {${indexImages.map((image, i) => `${JSON.stringify(image)}: seriesImage${i}`).join(", ")}};`,
      ].join("\n");
    },
    // Validation runs inside the MDX compile, so a change in a watched folder must also update
    // its tutorial.mdx; Astro's HMR then drops it from the SSR runner and the next request recompiles it.
    // The series index validates its logo against the series folder's images/ the same way.
    configureServer(server) {
      const index = seriesDir === undefined ? [] : [join(seriesDir, SERIES_IMAGES)];
      server.watcher.add([...sources.flatMap(({ dir }) => WATCHED_FOLDERS.map((folder) => join(dir, folder))), ...index]);
    },
    hotUpdate({ file, modules }) {
      const source = owner(file);
      const indexImage = seriesDir !== undefined && file.startsWith(join(seriesDir, SERIES_IMAGES) + sep);
      if (!source && !indexImage) return undefined;
      const mdx = source ? join(source.dir, "tutorial.mdx") : join(seriesDir!, SERIES_INDEX);
      const graph = this.environment.moduleGraph;
      const affected = [...(graph.getModulesByFile(mdx) ?? []), graph.getModuleById(RESOLVED_ID)];
      return [...new Set([...modules, ...affected.filter(Boolean)])];
    },
  };
}
