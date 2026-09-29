import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { isBinary } from "./visible-files.ts";

export interface SourceFile {
  /** Path relative to `code/`, with forward slashes. */
  path: string;
  source: string;
}

export interface TutorialFiles {
  mdxPath: string;
  codeDir: string;
  imagesDir: string;
  /** Text files under `code/`. */
  files: SourceFile[];
  /** Binary files under `code/` (paths relative to it): published and zipped byte for byte, never rendered. */
  binaries: string[];
  /** Image paths relative to `images/`, with forward slashes. */
  images: string[];
  outputDir: string;
  /** Captured output paths relative to `output/`, with forward slashes. */
  outputs: string[];
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => !basename(path).startsWith(".") && statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"))
    .sort();
}

/** Reads a tutorial folder: `tutorial.mdx`, `code/**`, `images/**` and `output/**`. */
export function readTutorialFiles(tutorialDir: string): TutorialFiles {
  const codeDir = join(tutorialDir, "code");
  const imagesDir = join(tutorialDir, "images");
  const outputDir = join(tutorialDir, "output");
  const files: SourceFile[] = [];
  const binaries: string[] = [];
  for (const path of listFiles(codeDir)) {
    const bytes = readFileSync(join(codeDir, path));
    if (isBinary(path, bytes)) binaries.push(path);
    else files.push({ path, source: bytes.toString("utf8") });
  }
  return {
    mdxPath: join(tutorialDir, "tutorial.mdx"),
    codeDir,
    imagesDir,
    files,
    binaries,
    images: listFiles(imagesDir),
    outputDir,
    outputs: listFiles(outputDir),
  };
}
