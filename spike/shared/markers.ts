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
}

export interface ParsedSource {
  code: string;
  regions: Region[];
  vars: VarRef[];
}

const REGION_START = /^\s*(?:\/\/|\/\*|<!--)\s*#region\s+([\w-]+)\s*(?:\*\/|-->)?\s*$/;
const REGION_END = /^\s*(?:\/\/|\/\*|<!--)\s*#endregion\b.*$/;
const VAR_COMMENT = /\s*(?:\/\/|\/\*|<!--)\s*@var\s+([\w-]+)\s*(?:\*\/|-->)?\s*$/;
const STRING_LITERAL = /(["'])((?:\\.|(?!\1).)*)\1/;

/** Strips `#region` / `@var` markers and records where they pointed. */
export function parseSource(source: string): ParsedSource {
  const out: string[] = [];
  const regions: Region[] = [];
  const vars: VarRef[] = [];
  const open: { id: string; fromLine: number }[] = [];

  for (const raw of source.split("\n")) {
    const start = REGION_START.exec(raw);
    if (start) {
      open.push({ id: start[1]!, fromLine: out.length + 1 });
      continue;
    }
    if (REGION_END.test(raw)) {
      const region = open.pop();
      if (!region) throw new Error(`#endregion without #region at line ${out.length + 1}`);
      regions.push({ ...region, toLine: out.length });
      continue;
    }

    let line = raw;
    const varComment = VAR_COMMENT.exec(line);
    if (varComment) {
      line = line.slice(0, varComment.index);
      const literal = STRING_LITERAL.exec(line);
      if (!literal) throw new Error(`@var ${varComment[1]} has no string literal`);
      const fromColumn = literal.index + 1;
      vars.push({
        name: varComment[1]!,
        line: out.length + 1,
        fromColumn,
        toColumn: fromColumn + literal[2]!.length,
        defaultValue: literal[2]!,
      });
    }
    out.push(line);
  }

  if (open.length > 0) throw new Error(`Unclosed #region ${open.map((r) => r.id).join(", ")}`);
  return { code: out.join("\n"), regions, vars };
}

/** Replaces each `@var` literal with its runtime value (default when missing). */
export function applyVars(parsed: ParsedSource, values: Record<string, string>): string {
  const lines = parsed.code.split("\n");
  // Right-to-left so earlier columns on the same line stay valid.
  const sorted = [...parsed.vars].sort((a, b) => b.line - a.line || b.fromColumn - a.fromColumn);
  for (const v of sorted) {
    const value = values[v.name] ?? v.defaultValue;
    const line = lines[v.line - 1]!;
    lines[v.line - 1] = line.slice(0, v.fromColumn) + escapeLiteral(value) + line.slice(v.toColumn);
  }
  return lines.join("\n");
}

function escapeLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
}
