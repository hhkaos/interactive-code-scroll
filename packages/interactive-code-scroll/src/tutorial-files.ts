import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, sep } from "node:path";

export interface SourceFile {
  /** Path relative to `code/`, with forward slashes. */
  path: string;
  source: string;
}

export interface TutorialFiles {
  mdxPath: string;
  codeDir: string;
  imagesDir: string;
  files: SourceFile[];
  /** Image paths relative to `images/`, with forward slashes. */
  images: string[];
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => !basename(path).startsWith(".") && statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"))
    .sort();
}

/** Reads a tutorial folder: `tutorial.mdx`, `code/**` and `images/**`. */
export function readTutorialFiles(tutorialDir: string): TutorialFiles {
  const codeDir = join(tutorialDir, "code");
  const imagesDir = join(tutorialDir, "images");
  return {
    mdxPath: join(tutorialDir, "tutorial.mdx"),
    codeDir,
    imagesDir,
    files: listFiles(codeDir).map((path) => ({ path, source: readFileSync(join(codeDir, path), "utf8") })),
    images: listFiles(imagesDir),
  };
}
