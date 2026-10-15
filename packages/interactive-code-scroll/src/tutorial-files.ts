import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseFrontmatter } from "astro/markdown";
import ignore, { type Ignore } from "ignore";
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
  /** Paths under `code/` that a `.gitignore` excludes, included or not (frontmatter `include` opts them in). */
  ignoredCode: IgnoredPath[];
  /** Folders under `code/` starting with `.` none of whose files is included (unless all are gitignored): a build warning names them. */
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

export interface IgnoredPath {
  /** Path relative to `code/`. */
  path: string;
  /** The `.gitignore` that decided it, relative to the tutorial folder (`code/.gitignore`, `.gitignore`, `../.gitignore`). */
  by: string;
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

/** The `.gitignore` rules of one folder; `rel` maps a `code/` path to a path relative to that folder (`undefined` outside it). */
interface GitignoreRules {
  ignore: Ignore;
  by: string;
  rel: (path: string) => string | undefined;
}

function readGitignore(folder: string, codeDir: string, rel: GitignoreRules["rel"]): GitignoreRules | undefined {
  const file = join(folder, ".gitignore");
  if (!existsSync(file)) return undefined;
  // Case-sensitive, like git on Linux CI, so a local macOS build publishes the same files.
  const rules = ignore({ ignorecase: false }).add(readFileSync(file, "utf8"));
  return { ignore: rules, by: relative(dirname(codeDir), file).split(sep).join("/"), rel };
}

/**
 * Folders above a tutorial's `code/` whose `.gitignore` applies to it, outermost first: up to the root of
 * the git repository that holds the tutorial (what git commits is what CI builds), or only the tutorial
 * folder outside a repository. `.git/info/exclude` and global excludes are machine-local and never read.
 */
export function gitignoreParents(tutorialDir: string): string[] {
  const chain: string[] = [];
  for (let dir = resolve(tutorialDir); ; dir = dirname(dir)) {
    chain.unshift(dir);
    if (existsSync(join(dir, ".git"))) return chain;
    if (dirname(dir) === dir) return [resolve(tutorialDir)];
  }
}

/**
 * Every file under `dir` (relative, forward slashes, sorted), without descending into generated folders,
 * with the `.gitignore` that excludes it, if any. Folder rules come from `parents` (absolute, outermost first)
 * and from `.gitignore` files inside `dir`; the deepest file with a matching rule decides, and nothing
 * inside an ignored folder comes back (git semantics). Without `gitignore`, no path is ignored.
 */
function walk(dir: string, parents: readonly string[] = [], gitignore = false): Map<string, string | undefined> {
  const out = new Map<string, string | undefined>();
  const rules: GitignoreRules[] = [];
  if (gitignore) {
    for (const parent of parents) {
      const prefix = relative(parent, dir).split(sep).join("/");
      const found = readGitignore(parent, dir, (path) => `${prefix}/${path}`);
      // A tutorial inside an ignored folder (a generated test project, a scratch copy) is not under version
      // control: that file's rules say nothing about its code/.
      if (found && !found.ignore.ignores(`${prefix}/`)) rules.push(found);
    }
  }
  const ignoredBy = (path: string, isDir: boolean, scope: readonly GitignoreRules[]) => {
    let by: string | undefined;
    for (const { ignore: rules, by: file, rel } of scope) {
      const local = rel(path);
      if (local === undefined) continue;
      const result = rules.test(isDir ? `${local}/` : local);
      if (result.ignored) by = file;
      else if (result.unignored) by = undefined;
    }
    return by;
  };
  const visit = (rel: string, scope: readonly GitignoreRules[], ignoredDir: string | undefined) => {
    const own = gitignore && ignoredDir === undefined
      ? readGitignore(join(dir, rel), dir, (path) => (rel === "" ? path : path.startsWith(`${rel}/`) ? path.slice(rel.length + 1) : undefined))
      : undefined;
    const local = own ? [...scope, own] : scope;
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!GENERATED_DIRS.has(entry.name) && !existsSync(join(dir, path, "pyvenv.cfg"))) visit(path, local, ignoredDir ?? ignoredBy(path, true, local));
      } else if (entry.isFile() || (entry.isSymbolicLink() && statSync(join(dir, path)).isFile())) {
        out.set(path, ignoredDir ?? ignoredBy(path, false, local));
      }
    }
  };
  if (existsSync(dir)) visit("", rules, undefined);
  return new Map([...out].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Files under `dir`, leaving out paths with a segment starting with `.` and generated folders. */
export function listFiles(dir: string): string[] {
  return [...walk(dir).keys()].filter((path) => !isHidden(path));
}

export interface CodeListing {
  /** Published paths. */
  paths: string[];
  /** Paths with a segment starting with `.`, included or not. */
  hidden: string[];
  /** Gitignored paths, included or not. */
  ignored: IgnoredPath[];
  /** Dot folders none of whose files is included, unless .gitignore excludes them all. */
  skippedDirs: string[];
}

/**
 * `code/`: like `listFiles`, also leaving out what its `.gitignore` files exclude (inside `dir` and in
 * `parents`, see `gitignoreParents()`), plus the hidden or gitignored paths that an `include` glob matches.
 */
export function listCode(dir: string, include: readonly string[], parents: readonly string[] = []): CodeListing {
  const all = walk(dir, parents, true);
  const patterns = include.map(globToRegExp);
  const ignored = [...all].flatMap(([path, by]) => (by === undefined ? [] : [{ path, by }]));
  const left = (path: string) => isHidden(path) || all.get(path) !== undefined;
  const included = new Set([...all.keys()].filter((path) => left(path) && patterns.some((pattern) => pattern.test(path))));
  const hidden = [...all.keys()].filter(isHidden);
  // First dot folder of each hidden file → whether it is accounted for: one of its files is included, or
  // .gitignore excludes them all (dotfiles are not reported).
  const folders = new Map<string, { included: boolean; ignored: boolean }>();
  for (const path of hidden) {
    const segments = path.split("/");
    const index = segments.findIndex((segment) => segment.startsWith("."));
    if (index === segments.length - 1) continue;
    const folder = segments.slice(0, index + 1).join("/");
    const state = folders.get(folder) ?? { included: false, ignored: true };
    folders.set(folder, { included: state.included || included.has(path), ignored: state.ignored && all.get(path) !== undefined });
  }
  return {
    paths: [...all.keys()].filter((path) => !left(path) || included.has(path)),
    hidden,
    ignored,
    skippedDirs: [...folders].filter(([, state]) => !state.included && !state.ignored).map(([folder]) => folder),
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
  const codeListing = listCode(codeDir, includeOf(mdxPath), gitignoreParents(tutorialDir));
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
    ignoredCode: codeListing.ignored,
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
