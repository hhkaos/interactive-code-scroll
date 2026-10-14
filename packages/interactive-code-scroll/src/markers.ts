import { extensionOf } from "./file-types.ts";
import { jsonRegionId, locateJsonMember, locateJsonValue, type JsonVar } from "./json-vars.ts";

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
  /** 0-based column range of the literal content (quotes excluded; a boolean's `$` prefix excluded). */
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
 * - `number` / `boolean`: an unquoted number or boolean literal, see {@link typedValue}
 */
export type EscapeKind =
  | "backslash"
  | "backslash-dollar"
  | "shell-double"
  | "shell-single"
  | "powershell-double"
  | "doubling"
  | "markup"
  | "raw"
  | "number"
  | "boolean";

/** What a var holds; `number` and `boolean` vars replace unquoted literals. */
export type VarKind = "string" | "number" | "boolean";

export function varKind({ escape }: Pick<VarRef, "escape">): VarKind {
  return escape === "number" || escape === "boolean" ? escape : "string";
}

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
const VAR_COMMENT = /\s*(#|\/\/|\/\*|<!--)\s*@var\s+([\w-]+)(?::(\w+))?\s*(?:\*\/|-->)?\s*$/;
/** SQL and Lua comments; only in those files, where `--` cannot be an operator before `@var`. */
const DASH_VAR_COMMENT = /\s*(--)\s*@var\s+([\w-]+)(?::(\w+))?\s*$/;
const STRING_LITERALS = /(["'])((?:\\.|(?!\1).)*)\1/g;
const NUMBER_LITERAL = /(?<![\w.$])-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w.])/;
/** `$true` is PowerShell; the `$` stays outside the var. */
const BOOLEAN_LITERAL = /(?<![\w$])\$?(true|false|True|False|TRUE|FALSE)(?!\w)/;
const VAR_TYPES: readonly string[] = ["string", "number", "boolean"] satisfies VarKind[];
/** Files where a quoted key (`"name": "value"`) is never the var. */
const QUOTED_KEYS = new Set(["yaml", "yml"]);
/** `.http` file variable: `@name = value`. */
export const HTTP_VARIABLE = /^(\s*@([\w-]+)\s*=\s*)(.*?)\s*$/;

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

/**
 * Strips `#region` / `@var` markers and records where they pointed. `jsonVars` are the values of a
 * `.json` file that `<VarField json>` targets by pointer (JSON has no comments for `@var`);
 * `jsonRegions` are the pointers that `<Step region="/…">` highlights (no comments for `#region`).
 */
export function parseSource(
  source: string,
  file?: string,
  jsonVars: readonly JsonVar[] = [],
  jsonRegions: readonly string[] = [],
): ParsedSource {
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
      const type = varComment[3];
      if (type !== undefined && !VAR_TYPES.includes(type)) fail(`@var ${name}: unknown type "${type}"; use string, number or boolean`, sourceLine);
      line = line.slice(0, varComment.index);
      const literals = [...line.matchAll(STRING_LITERALS)].filter(
        (m) => !QUOTED_KEYS.has(ext) || !/^\s*:(?:\s|$)/.test(line.slice(m.index + m[0].length)),
      );
      if (type !== "string" && (type !== undefined || literals.length === 0)) {
        // Strings are masked so a number or boolean inside one is never the var.
        const masked = [...line.matchAll(STRING_LITERALS)].reduce((text, m) => text.slice(0, m.index) + " ".repeat(m[0].length) + text.slice(m.index + m[0].length), line);
        const typed = typedLiteral(masked, type as VarKind | undefined);
        if (!typed) fail(`@var ${name} has no ${type === undefined ? "string, number or boolean" : type} literal on its line`, sourceLine);
        const { kind, fromColumn, text } = typed!;
        addVar(name, { fromColumn, toColumn: fromColumn + text.length, defaultValue: text, quote: "", escape: kind });
        out.push(line);
        return;
      }
      const literal = literals[0] ?? fail(`@var ${name} has no string literal on its line`, sourceLine);
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
  const code = out.join("\n");
  for (const { name, pointer } of jsonVars) {
    const span = locateJsonValue(code, pointer);
    if (typeof span === "string") fail(`<VarField json> ${name}: ${span}`, 1);
    const { kind, start, end } = span as Exclude<typeof span, string>;
    const before = code.slice(0, start).split("\n");
    const line = before.length;
    if (kind !== "string" && kind !== "number" && kind !== "boolean") {
      fail(`<VarField json> ${name}: "${pointer}" is ${kind === "null" ? "null" : `an ${kind}`}; only strings, numbers and booleans can be vars`, line);
    }
    if (vars.some((v) => v.name === name)) fail(`duplicate @var "${name}"`, line);
    const fromColumn = before.at(-1)!.length;
    const defaultValue = code.slice(start, end);
    vars.push(
      kind === "string"
        ? { name, line, fromColumn, toColumn: fromColumn + defaultValue.length, defaultValue, quote: '"', escape: "backslash" }
        : { name, line, fromColumn, toColumn: fromColumn + defaultValue.length, defaultValue, quote: "", escape: kind as "number" | "boolean" },
    );
  }
  const lineAt = (offset: number) => code.slice(0, offset).split("\n").length;
  for (const pointer of new Set(jsonRegions)) {
    const span = locateJsonMember(code, pointer);
    if (typeof span === "string") fail(`region "${pointer}": ${span}`, 1);
    const { start, end } = span as Exclude<typeof span, string>;
    regions.push({ id: jsonRegionId(pointer), fromLine: lineAt(start), toLine: lineAt(end) });
  }
  return { code, regions, vars };
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
  "number",
  "boolean",
] satisfies EscapeKind[];

/** First number or boolean literal of `kind` (either, when `undefined`) in a line whose strings are masked. */
function typedLiteral(line: string, kind: VarKind | undefined): { kind: "number" | "boolean"; fromColumn: number; text: string } | undefined {
  const number = kind === "boolean" ? null : NUMBER_LITERAL.exec(line);
  const boolean = kind === "number" ? null : BOOLEAN_LITERAL.exec(line);
  if (number && (!boolean || number.index < boolean.index)) return { kind: "number", fromColumn: number.index, text: number[0] };
  if (boolean) return { kind: "boolean", fromColumn: boolean.index + boolean[0].length - boolean[1]!.length, text: boolean[1]! };
  return undefined;
}

const NUMBER_VALUE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * The literal a typed var shows for a form value: a number as typed, a boolean in the spelling of
 * the code's literal (`true`, `True`, `TRUE`). Anything else falls back to `literal`, so the code
 * never breaks. String values are returned as is.
 */
export function typedValue(value: string, kind: VarKind, literal: string): string {
  const trimmed = value.trim();
  if (kind === "number") return NUMBER_VALUE.test(trimmed) ? trimmed : literal;
  if (kind === "boolean") {
    const lower = trimmed.toLowerCase();
    if (lower !== "true" && lower !== "false") return literal;
    if (literal === literal.toUpperCase()) return lower.toUpperCase();
    return literal[0] === "T" || literal[0] === "F" ? lower[0]!.toUpperCase() + lower.slice(1) : lower;
  }
  return value;
}

/** A var's default as the form holds it: booleans in lower case, so `True` and `true` are the same default. */
export function formValue(v: Pick<VarRef, "escape" | "defaultValue">): string {
  return v.escape === "boolean" ? v.defaultValue.toLowerCase() : v.defaultValue;
}

function isEscapeKind(value: string): value is EscapeKind {
  return ESCAPE_KINDS.includes(value);
}

export function escapeLiteral(value: string, { quote, escape, defaultValue }: Pick<VarRef, "quote" | "escape" | "defaultValue">): string {
  switch (escape) {
    case "number":
    case "boolean":
      return typedValue(value, escape, defaultValue);
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
