import { extensionOf } from "./file-types.ts";

export interface Region {
  id: string;
  /** 1-based, inclusive, in the cleaned code. */
  fromLine: number;
  toLine: number;
}

export interface VarRef {
  name: string;
  /** 1-based line in the cleaned code. */
  line: number;
  /** 0-based column range of the literal content (quotes excluded). */
  fromColumn: number;
  toColumn: number;
  defaultValue: string;
  /** `""` for an unquoted value (`.http` file variables). */
  quote: '"' | "'" | "";
  /** How runtime values are escaped, from the file type, the quote and the marker comment. */
  escape: EscapeKind;
}

/**
 * - `backslash`: `\\`, the quote, `\n`, `\r` (JS/TS, JSON, Python, Swift, C#, Java, C++, YAML/TOML double quotes…)
 * - `backslash-dollar`: `backslash` plus `\$` (Kotlin, Dart, Groovy/Gradle string templates)
 * - `shell-double` / `shell-single`: POSIX shell quoting
 * - `powershell-double`: backtick escapes; single-quoted PowerShell uses `doubling`
 * - `doubling`: the quote is doubled (SQL, YAML and PowerShell single quotes)
 * - `markup`: HTML/XML attribute entities (marker in an `<!-- -->` comment)
 * - `raw`: inserted as is, line breaks removed (`.http` file variables)
 */
export type EscapeKind =
  | "backslash"
  | "backslash-dollar"
  | "shell-double"
  | "shell-single"
  | "powershell-double"
  | "doubling"
  | "markup"
  | "raw";

export interface ParsedSource {
  code: string;
  regions: Region[];
  vars: VarRef[];
}

export class MarkerError extends Error {
  constructor(
    message: string,
    readonly file: string | undefined,
    /** 1-based line in the original source. */
    readonly line: number,
  ) {
    super(`${file ?? "<source>"}:${line}: ${message}`);
    this.name = "MarkerError";
  }
}

const REGION_START = /^\s*(?:#|\/\/|\/\*|<!--)\s*#region\s+([\w-]+)\s*(?:\*\/|-->)?\s*$/;
const REGION_END = /^\s*(?:#|\/\/|\/\*|<!--)\s*#endregion(?:\s+([\w-]+))?\s*(?:\*\/|-->)?\s*$/;
const DASH_REGION = [/^\s*--\s*#region\s+([\w-]+)\s*$/, /^\s*--\s*#endregion(?:\s+([\w-]+))?\s*$/] as const;
/**
 * Native region styles, only in their own file types so existing comments elsewhere
 * (e.g. a bare `#region` line in a shell script) never change meaning.
 */
const NATIVE_REGION: Record<string, readonly [RegExp, RegExp]> = {
  cs: [/^\s*#region\s+([\w-]+)\s*$/, /^\s*#endregion(?:\s+([\w-]+))?\s*$/],
  py: [/^\s*#\s+region\s+([\w-]+)\s*$/, /^\s*#\s+endregion(?:\s+([\w-]+))?\s*$/],
  sql: DASH_REGION,
  lua: DASH_REGION,
};
const VAR_COMMENT = /\s*(#|\/\/|\/\*|<!--)\s*@var\s+([\w-]+)\s*(?:\*\/|-->)?\s*$/;
/** SQL and Lua comments; only in those files, where `--` cannot be an operator before `@var`. */
const DASH_VAR_COMMENT = /\s*(--)\s*@var\s+([\w-]+)\s*$/;
const STRING_LITERAL = /(["'])((?:\\.|(?!\1).)*)\1/;
/** `.http` file variable: `@name = value`. */
const HTTP_VARIABLE = /^(\s*@([\w-]+)\s*=\s*)(.*?)\s*$/;

const DOLLAR_TEMPLATES = new Set(["kt", "kts", "dart", "gradle", "groovy"]);
const SHELLS = new Set(["sh", "bash", "zsh"]);

/** The escaper for a literal, or a reason it cannot be edited safely. */
function escapeFor(ext: string, quote: '"' | "'", comment: string, prefix: string, rest: string): EscapeKind | string {
  if (comment === "<!--") return "markup";
  if (ext === "py") {
    if (/[rRfF]/.test(prefix)) return "Python f-strings and raw strings cannot hold an @var value; use a plain string";
    if (rest.startsWith(quote.repeat(3))) return "Python triple-quoted strings cannot hold an @var value; use a plain string";
  }
  if (ext === "toml" && quote === "'") return "TOML literal strings ('...') cannot escape an @var value; use double quotes";
  if (SHELLS.has(ext)) return quote === '"' ? "shell-double" : "shell-single";
  if (ext === "ps1") return quote === '"' ? "powershell-double" : "doubling";
  if (ext === "sql") return "doubling";
  if ((ext === "yaml" || ext === "yml") && quote === "'") return "doubling";
  if (DOLLAR_TEMPLATES.has(ext)) return "backslash-dollar";
  return "backslash";
}

/** Strips `#region` / `@var` markers and records where they pointed. */
export function parseSource(source: string, file?: string): ParsedSource {
  const out: string[] = [];
  const regions: Region[] = [];
  const vars: VarRef[] = [];
  const open: { id: string; fromLine: number; sourceLine: number }[] = [];
  const markdownLike = file === undefined ? false : /\.(?:md|mdx)$/i.test(file);
  const ext = file === undefined ? "" : extensionOf(file);
  const native = NATIVE_REGION[ext];
  let fenced = false;
  const fail = (message: string, sourceLine: number): never => {
    throw new MarkerError(message, file, sourceLine);
  };

  source.split("\n").forEach((raw, index) => {
    const sourceLine = index + 1;

    if (markdownLike && /^\s*(?:```|~~~)/.test(raw)) {
      fenced = !fenced;
      out.push(raw);
      return;
    }
    if (fenced) {
      out.push(raw);
      return;
    }

    const start = REGION_START.exec(raw) ?? native?.[0].exec(raw);
    if (start) {
      const id = start[1]!;
      if (open.some((r) => r.id === id) || regions.some((r) => r.id === id)) fail(`duplicate #region "${id}"`, sourceLine);
      open.push({ id, fromLine: out.length + 1, sourceLine });
      return;
    }

    const end = REGION_END.exec(raw) ?? native?.[1].exec(raw);
    if (end) {
      const region = open.pop() ?? fail("#endregion without a matching #region", sourceLine);
      if (end[1] && end[1] !== region.id) fail(`#endregion "${end[1]}" closes #region "${region.id}"`, sourceLine);
      if (out.length < region.fromLine) fail(`#region "${region.id}" is empty`, sourceLine);
      regions.push({ id: region.id, fromLine: region.fromLine, toLine: out.length });
      return;
    }

    let line = raw;
    const addVar = (name: string, ref: Omit<VarRef, "name" | "line">) => {
      if (vars.some((v) => v.name === name)) fail(`duplicate @var "${name}"`, sourceLine);
      vars.push({ name, line: out.length + 1, ...ref });
    };

    const httpVariable = ext === "http" ? HTTP_VARIABLE.exec(line) : null;
    if (httpVariable) {
      const fromColumn = httpVariable[1]!.length;
      addVar(httpVariable[2]!, {
        fromColumn,
        toColumn: fromColumn + httpVariable[3]!.length,
        defaultValue: httpVariable[3]!,
        quote: "",
        escape: "raw",
      });
      out.push(line);
      return;
    }

    const varComment = VAR_COMMENT.exec(line) ?? (ext === "sql" || ext === "lua" ? DASH_VAR_COMMENT.exec(line) : null);
    if (varComment) {
      const name = varComment[2]!;
      line = line.slice(0, varComment.index);
      const literal = STRING_LITERAL.exec(line) ?? fail(`@var ${name} has no string literal on its line`, sourceLine);
      const quote = literal[1] as '"' | "'";
      const prefix = /[A-Za-z]*$/.exec(line.slice(0, literal.index))![0];
      const escape = escapeFor(ext, quote, varComment[1]!, prefix, line.slice(literal.index));
      if (!isEscapeKind(escape)) fail(`@var ${name}: ${escape}`, sourceLine);
      const fromColumn = literal.index + 1;
      addVar(name, {
        fromColumn,
        toColumn: fromColumn + literal[2]!.length,
        defaultValue: literal[2]!,
        quote,
        escape: escape as EscapeKind,
      });
    }
    out.push(line);
  });

  if (open.length > 0) fail(`unclosed #region "${open.at(-1)!.id}"`, open.at(-1)!.sourceLine);
  return { code: out.join("\n"), regions, vars };
}

/** Replaces each `@var` literal with its runtime value (default when missing), escaped for its file type and quote. */
export function applyVars(parsed: ParsedSource, values: Readonly<Record<string, string>>): string {
  const lines = parsed.code.split("\n");
  // Right-to-left so earlier columns on the same line stay valid.
  const sorted = [...parsed.vars].sort((a, b) => b.line - a.line || b.fromColumn - a.fromColumn);
  for (const v of sorted) {
    const value = values[v.name] ?? v.defaultValue;
    const line = lines[v.line - 1]!;
    lines[v.line - 1] = line.slice(0, v.fromColumn) + escapeLiteral(value, v) + line.slice(v.toColumn);
  }
  return lines.join("\n");
}

const ESCAPE_KINDS: readonly string[] = [
  "backslash",
  "backslash-dollar",
  "shell-double",
  "shell-single",
  "powershell-double",
  "doubling",
  "markup",
  "raw",
] satisfies EscapeKind[];

function isEscapeKind(value: string): value is EscapeKind {
  return ESCAPE_KINDS.includes(value);
}

export function escapeLiteral(value: string, { quote, escape }: Pick<VarRef, "quote" | "escape">): string {
  switch (escape) {
    case "markup":
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replaceAll(quote, quote === '"' ? "&quot;" : "&#39;");
    case "raw":
      return value.replace(/[\r\n]+/g, " ");
    case "doubling":
      return value.replaceAll(quote, quote + quote);
    case "shell-single":
      return value.replaceAll("'", "'\\''");
    case "shell-double":
      return value.replace(/[\\"$`]/g, "\\$&");
    case "powershell-double":
      return value.replace(/[`"$]/g, "`$&");
    case "backslash":
    case "backslash-dollar": {
      const escaped = value
        .replace(/\\/g, "\\\\")
        .replaceAll(quote, `\\${quote}`)
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
      return escape === "backslash-dollar" ? escaped.replace(/\$/g, "\\$") : escaped;
    }
  }
}
