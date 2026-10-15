import { extensionOf } from "./file-types.ts";

/** `*` and `?` stay within a path segment; `**` crosses segments (`a/**` includes `a/b/c`). */
export function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]!;
    if (char === "*" && pattern[i + 1] === "*") {
      const slash = pattern[i + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

/** Frontmatter key the MDX validation fills with the `code/` paths steps show, in first-reference order. */
export const STEP_FILES_KEY = "interactiveCodeScrollStepFiles";

export function stepFilesOf(frontmatter: Readonly<Record<string, unknown>>): string[] {
  return (frontmatter[STEP_FILES_KEY] as string[] | undefined) ?? [];
}

export interface VisibleFiles {
  /** Text files that get a tab, in pattern order (then path order within a pattern). */
  visible: string[];
  /** Patterns that match no text file. */
  unmatched: string[];
}

/** Without patterns every text file is visible: the ones steps show in `stepOrder`, then the rest in path order. */
export function selectVisible(textPaths: readonly string[], patterns: readonly string[] | undefined, stepOrder: readonly string[] = []): VisibleFiles {
  const sorted = [...textPaths].sort();
  if (patterns === undefined) {
    const first = [...new Set(stepOrder)].filter((path) => textPaths.includes(path));
    return { visible: [...first, ...sorted.filter((path) => !first.includes(path))], unmatched: [] };
  }
  const visible: string[] = [];
  const unmatched: string[] = [];
  for (const pattern of patterns) {
    const regex = globToRegExp(pattern);
    const matches = sorted.filter((path) => regex.test(path));
    if (matches.length === 0) unmatched.push(pattern);
    for (const path of matches) if (!visible.includes(path)) visible.push(path);
  }
  return { visible, unmatched };
}

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "bmp", "tif", "tiff", "psd",
  "pdf", "zip", "jar", "aar", "gz", "tgz", "bz2", "xz", "7z", "rar",
  "woff", "woff2", "ttf", "otf", "eot",
  "mp3", "wav", "ogg", "mp4", "webm", "mov",
  "wasm", "class", "so", "dylib", "dll", "exe", "bin", "keystore", "jks",
  "mmpk", "mspk", "vtpk", "tpk", "tpkx", "gdb", "geodatabase", "sqlite", "db",
]);

/** Known binary extension, or a NUL byte in the first 8 KB. */
export function isBinary(path: string, bytes: Uint8Array): boolean {
  if (BINARY_EXTENSIONS.has(extensionOf(path))) return true;
  return bytes.subarray(0, 8192).includes(0);
}
