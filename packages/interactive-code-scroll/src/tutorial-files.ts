import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "astro/markdown";
import { globToRegExp, isBinary } from "./visible-files.ts";
import { OPTIONS_DIR } from "./field-options.ts";

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
  /** Paths under `code/` with a segment starting with `.`, included or not (frontmatter `include` opts them in). */
  hiddenCode: string[];
  /** Folders under `code/` starting with `.` none of whose files is included: a build warning names them. */
  skippedCodeDirs: string[];
  /** Image paths relative to `images/`, with forward slashes. */
  images: string[];
  embedsDir: string;
  /** Files under `embeds/` (paths relative to it): pages a step shows with `embed=`, published as is. */
  embeds: string[];
  outputDir: string;
  /** Captured output paths relative to `output/`, with forward slashes. */
  outputs: string[];
  requestsDir: string;
  /** Files under `requests/` (paths relative to it): `.http` sources of the runner plus supporting files. */
  requests: SourceFile[];
  /** Binary files under `requests/` (paths relative to it): not allowed, reported by validation. */
  requestBinaries: string[];
  /** Files under `field-options/` (paths relative to it): JSON option lists for `<VarField options>`, never published. */
  fieldOptions: SourceFile[];
}

/**
 * Folders that tools create in place (dependencies, caches, version control): never read, never
 * published, and `include` cannot opt them in. A folder holding `pyvenv.cfg` is a Python virtual env.
 */
const GENERATED_DIRS = new Set([
  ".git", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".gradle", ".idea",
  ".next", ".nuxt", ".svelte-kit", ".astro", ".cache", ".parcel-cache", ".turbo",
]);

/** `path` (relative to `root`, forward slashes) lies inside a generated folder. */
export function inGeneratedDir(root: string, path: string): boolean {
  const segments = path.split("/").slice(0, -1);
  return segments.some((segment, i) => GENERATED_DIRS.has(segment) || existsSync(join(root, ...segments.slice(0, i + 1), "pyvenv.cfg")));
}

const isHidden = (path: string) => path.split("/").some((segment) => segment.startsWith("."));

/** Every file under `dir` (relative, forward slashes, sorted), without descending into generated folders. */
function walk(dir: string): string[] {
  const out: string[] = [];
  const visit = (rel: string) => {
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!GENERATED_DIRS.has(entry.name) && !existsSync(join(dir, path, "pyvenv.cfg"))) visit(path);
      } else if (entry.isFile() || (entry.isSymbolicLink() && statSync(join(dir, path)).isFile())) {
        out.push(path);
      }
    }
  };
  if (existsSync(dir)) visit("");
  return out.sort();
}

/** Files under `dir`, leaving out paths with a segment starting with `.` and generated folders. */
export function listFiles(dir: string): string[] {
  return walk(dir).filter((path) => !isHidden(path));
}

/** `code/`: like `listFiles`, plus the hidden paths that an `include` glob matches. */
export function listCode(dir: string, include: readonly string[]): { paths: string[]; hidden: string[]; skippedDirs: string[] } {
  const all = walk(dir);
  const patterns = include.map(globToRegExp);
  const hidden = all.filter(isHidden);
  const included = new Set(hidden.filter((path) => patterns.some((pattern) => pattern.test(path))));
  // First dot folder of each hidden file → whether any of its files is included (dotfiles are not reported).
  const folders = new Map<string, boolean>();
  for (const path of hidden) {
    const segments = path.split("/");
    const index = segments.findIndex((segment) => segment.startsWith("."));
    if (index === segments.length - 1) continue;
    const folder = segments.slice(0, index + 1).join("/");
    folders.set(folder, (folders.get(folder) ?? false) || included.has(path));
  }
  return {
    paths: all.filter((path) => !isHidden(path) || included.has(path)),
    hidden,
    skippedDirs: [...folders].filter(([, anyIncluded]) => !anyIncluded).map(([folder]) => folder),
  };
}

/** Frontmatter `include` of `tutorial.mdx`, read before the MDX compile (validation reports bad values). */
function includeOf(mdxPath: string): string[] {
  if (!existsSync(mdxPath)) return [];
  try {
    const value = parseFrontmatter(readFileSync(mdxPath, "utf8")).frontmatter.include;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function readFolder(dir: string, paths: readonly string[] = listFiles(dir)): { files: SourceFile[]; binaries: string[] } {
  const files: SourceFile[] = [];
  const binaries: string[] = [];
  for (const path of paths) {
    const bytes = readFileSync(join(dir, path));
    if (isBinary(path, bytes)) binaries.push(path);
    else files.push({ path, source: bytes.toString("utf8") });
  }
  return { files, binaries };
}

/** Reads a tutorial folder: `tutorial.mdx`, `code/**`, `images/**`, `embeds/**`, `output/**` and `requests/**`. */
export function readTutorialFiles(tutorialDir: string): TutorialFiles {
  const codeDir = join(tutorialDir, "code");
  const imagesDir = join(tutorialDir, "images");
  const embedsDir = join(tutorialDir, "embeds");
  const outputDir = join(tutorialDir, "output");
  const requestsDir = join(tutorialDir, "requests");
  const mdxPath = join(tutorialDir, "tutorial.mdx");
  const codeListing = listCode(codeDir, includeOf(mdxPath));
  const code = readFolder(codeDir, codeListing.paths);
  const requests = readFolder(requestsDir);
  const fieldOptions = readFolder(join(tutorialDir, OPTIONS_DIR));
  return {
    mdxPath,
    codeDir,
    imagesDir,
    files: code.files,
    binaries: code.binaries,
    hiddenCode: codeListing.hidden,
    skippedCodeDirs: codeListing.skippedDirs,
    images: listFiles(imagesDir),
    embedsDir,
    embeds: listFiles(embedsDir),
    outputDir,
    outputs: listFiles(outputDir),
    requestsDir,
    requests: requests.files,
    requestBinaries: requests.binaries,
    fieldOptions: fieldOptions.files,
  };
}
