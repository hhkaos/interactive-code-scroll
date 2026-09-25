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
  quote: '"' | "'";
  /** `html` when the marker is an HTML comment: the literal is an attribute value. */
  context: "html" | "script";
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

const REGION_START = /^\s*(?:\/\/|\/\*|<!--)\s*#region\s+([\w-]+)\s*(?:\*\/|-->)?\s*$/;
const REGION_END = /^\s*(?:\/\/|\/\*|<!--)\s*#endregion(?:\s+([\w-]+))?\s*(?:\*\/|-->)?\s*$/;
const VAR_COMMENT = /\s*(\/\/|\/\*|<!--)\s*@var\s+([\w-]+)\s*(?:\*\/|-->)?\s*$/;
const STRING_LITERAL = /(["'])((?:\\.|(?!\1).)*)\1/;

/** Strips `#region` / `@var` markers and records where they pointed. */
export function parseSource(source: string, file?: string): ParsedSource {
  const out: string[] = [];
  const regions: Region[] = [];
  const vars: VarRef[] = [];
  const open: { id: string; fromLine: number; sourceLine: number }[] = [];
  const fail = (message: string, sourceLine: number): never => {
    throw new MarkerError(message, file, sourceLine);
  };

  source.split("\n").forEach((raw, index) => {
    const sourceLine = index + 1;

    const start = REGION_START.exec(raw);
    if (start) {
      const id = start[1]!;
      if (open.some((r) => r.id === id) || regions.some((r) => r.id === id)) fail(`duplicate #region "${id}"`, sourceLine);
      open.push({ id, fromLine: out.length + 1, sourceLine });
      return;
    }

    const end = REGION_END.exec(raw);
    if (end) {
      const region = open.pop() ?? fail("#endregion without a matching #region", sourceLine);
      if (end[1] && end[1] !== region.id) fail(`#endregion "${end[1]}" closes #region "${region.id}"`, sourceLine);
      if (out.length < region.fromLine) fail(`#region "${region.id}" is empty`, sourceLine);
      regions.push({ id: region.id, fromLine: region.fromLine, toLine: out.length });
      return;
    }

    let line = raw;
    const varComment = VAR_COMMENT.exec(line);
    if (varComment) {
      const name = varComment[2]!;
      line = line.slice(0, varComment.index);
      const literal = STRING_LITERAL.exec(line) ?? fail(`@var ${name} has no string literal on its line`, sourceLine);
      if (vars.some((v) => v.name === name)) fail(`duplicate @var "${name}"`, sourceLine);
      const fromColumn = literal.index + 1;
      vars.push({
        name,
        line: out.length + 1,
        fromColumn,
        toColumn: fromColumn + literal[2]!.length,
        defaultValue: literal[2]!,
        quote: literal[1] as VarRef["quote"],
        context: varComment[1] === "<!--" ? "html" : "script",
      });
    }
    out.push(line);
  });

  if (open.length > 0) fail(`unclosed #region "${open.at(-1)!.id}"`, open.at(-1)!.sourceLine);
  return { code: out.join("\n"), regions, vars };
}

/** Replaces each `@var` literal with its runtime value (default when missing), escaped for its context. */
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

export function escapeLiteral(value: string, { quote, context }: Pick<VarRef, "quote" | "context">): string {
  if (context === "html") {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replaceAll(quote, quote === '"' ? "&quot;" : "&#39;");
  }
  return value
    .replace(/\\/g, "\\\\")
    .replaceAll(quote, `\\${quote}`)
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}
