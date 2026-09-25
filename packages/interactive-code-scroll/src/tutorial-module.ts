import { join } from "node:path";
import { readTutorialFiles } from "./tutorial-files.ts";

/** Minimal Vite plugin shape (vite is not a direct dependency). */
export interface TutorialModulePlugin {
  name: string;
  resolveId(id: string): string | undefined;
  load(this: { addWatchFile(id: string): void }, id: string): string | undefined;
}

export const TUTORIAL_MODULE_ID = "virtual:interactive-code-scroll/tutorial";
const RESOLVED_ID = `\0${TUTORIAL_MODULE_ID}`;

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
      for (const file of tutorial.files) this.addWatchFile(join(tutorial.codeDir, file.path));
      const imports = tutorial.images.map(
        (image, i) => `import image${i} from ${JSON.stringify(`${join(tutorial.imagesDir, image)}?url`)};`,
      );
      return [
        `export { Content, frontmatter } from ${JSON.stringify(tutorial.mdxPath)};`,
        ...imports,
        `export const files = ${JSON.stringify(tutorial.files)};`,
        `export const images = {${tutorial.images.map((image, i) => `${JSON.stringify(image)}: image${i}`).join(", ")}};`,
      ].join("\n");
    },
  };
}
