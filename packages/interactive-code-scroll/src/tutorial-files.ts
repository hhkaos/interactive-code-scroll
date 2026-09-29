import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { isBinary } from "./visible-files.ts";

export interface SourceFile {
  /** Path relative to its folder (`code/` or `requests/`), with forward slashes. */
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
  requestsDir: string;
  /** Files under `requests/` (paths relative to it): `.http` sources of the runner plus supporting files. */
  requests: SourceFile[];
  /** Binary files under `requests/` (paths relative to it): not allowed, reported by validation. */
  requestBinaries: string[];
}

export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => !basename(path).startsWith(".") && statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"))
    .sort();
}

function readFolder(dir: string): { files: SourceFile[]; binaries: string[] } {
  const files: SourceFile[] = [];
  const binaries: string[] = [];
  for (const path of listFiles(dir)) {
    const bytes = readFileSync(join(dir, path));
    if (isBinary(path, bytes)) binaries.push(path);
    else files.push({ path, source: bytes.toString("utf8") });
  }
  return { files, binaries };
}

/** Reads a tutorial folder: `tutorial.mdx`, `code/**`, `images/**`, `output/**` and `requests/**`. */
export function readTutorialFiles(tutorialDir: string): TutorialFiles {
  const codeDir = join(tutorialDir, "code");
  const imagesDir = join(tutorialDir, "images");
  const outputDir = join(tutorialDir, "output");
  const requestsDir = join(tutorialDir, "requests");
  const code = readFolder(codeDir);
  const requests = readFolder(requestsDir);
  return {
    mdxPath: join(tutorialDir, "tutorial.mdx"),
    codeDir,
    imagesDir,
    files: code.files,
    binaries: code.binaries,
    images: listFiles(imagesDir),
    outputDir,
    outputs: listFiles(outputDir),
    requestsDir,
    requests: requests.files,
    requestBinaries: requests.binaries,
  };
}
