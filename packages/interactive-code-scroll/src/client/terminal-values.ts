/** A run of terminal text and the CSS classes that color it (`term-*`). */
export interface TerminalSegment {
  text: string;
  classes: string[];
}

const COLORS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
/** Shell, PowerShell and REPL prompts at the start of a line: `$ `, `% `, `# `, `> `, `>>> `, `PS C:\> `. */
const PROMPT = /^(\$|%|#|>|>>>|PS [^>\n]*>) (?=\S)/;
/** SGR (`ESC[…m`), other CSI sequences, OSC sequences and lone escapes. */
const ESCAPE = /\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b/g;

interface Style {
  fg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

function applySgr(style: Style, params: string): Style {
  const codes = params === "" ? [0] : params.split(";").map(Number);
  const next = { ...style };
  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i]!;
    if (code === 0) Object.keys(next).forEach((key) => delete next[key as keyof Style]);
    else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4) next.underline = true;
    else if (code === 22) next.bold = next.dim = false;
    else if (code === 23) next.italic = false;
    else if (code === 24) next.underline = false;
    else if (code >= 30 && code <= 37) next.fg = COLORS[code - 30];
    else if (code >= 90 && code <= 97) next.fg = `bright-${COLORS[code - 90]}`;
    else if (code === 39) delete next.fg;
    // 256-color and truecolor: skip their arguments, keep the default color.
    else if (code === 38) i += codes[i + 1] === 5 ? 2 : codes[i + 1] === 2 ? 4 : 1;
    else if (code === 48) i += codes[i + 1] === 5 ? 2 : codes[i + 1] === 2 ? 4 : 1;
  }
  return next;
}

function classesOf(style: Style): string[] {
  const classes: string[] = [];
  if (style.fg) classes.push(`term-${style.fg}`);
  if (style.bold) classes.push("term-bold");
  if (style.dim) classes.push("term-dim");
  if (style.italic) classes.push("term-italic");
  if (style.underline) classes.push("term-underline");
  return classes;
}

/**
 * Splits untrusted terminal output into colored runs: prompt lines (`$ cmd`) color the prompt and
 * the command, ANSI SGR codes become classes, and every other escape sequence is removed.
 * Runs are meant for text nodes; nothing here is HTML.
 */
export function terminalSegments(text: string): TerminalSegment[] {
  const segments: TerminalSegment[] = [];
  const push = (value: string, classes: string[]) => {
    if (!value) return;
    const last = segments.at(-1);
    if (last && last.classes.join(" ") === classes.join(" ")) last.text += value;
    else segments.push({ text: value, classes });
  };
  let style: Style = {};
  for (const line of text.split(/(?<=\n)/)) {
    const prompt = !line.includes("\x1b") ? PROMPT.exec(line) : null;
    if (prompt) {
      push(prompt[0], ["term-prompt"]);
      push(line.slice(prompt[0].length), ["term-command"]);
      continue;
    }
    let index = 0;
    for (const match of line.matchAll(ESCAPE)) {
      push(line.slice(index, match.index), classesOf(style));
      if (match[1] !== undefined) style = applySgr(style, match[1]);
      index = match.index + match[0].length;
    }
    push(line.slice(index), classesOf(style));
  }
  return segments;
}
