import { describe, expect, it } from "vitest";
import { terminalSegments } from "./terminal-values.ts";

describe("terminalSegments", () => {
  it("colors prompt lines: the prompt and the command", () => {
    expect(terminalSegments("$ sh request.sh\n{\"ok\":true}\n")).toEqual([
      { text: "$ ", classes: ["term-prompt"] },
      { text: "sh request.sh\n", classes: ["term-command"] },
      { text: '{"ok":true}\n', classes: [] },
    ]);
  });

  it("recognizes shell, PowerShell and REPL prompts, but not a bare symbol", () => {
    for (const prompt of ["% ", "# ", "> ", ">>> ", "PS C:\\work> "]) {
      expect(terminalSegments(`${prompt}run`)[0]).toEqual({ text: prompt, classes: ["term-prompt"] });
    }
    expect(terminalSegments("$ \n")).toEqual([{ text: "$ \n", classes: [] }]);
    expect(terminalSegments("a $ b")).toEqual([{ text: "a $ b", classes: [] }]);
  });

  it("turns ANSI SGR codes into classes and resets them", () => {
    expect(terminalSegments("\x1b[1;32mok\x1b[0m done \x1b[91merr\x1b[39m.")).toEqual([
      { text: "ok", classes: ["term-green", "term-bold"] },
      { text: " done ", classes: [] },
      { text: "err", classes: ["term-bright-red"] },
      { text: ".", classes: [] },
    ]);
  });

  it("keeps a style across lines until reset", () => {
    expect(terminalSegments("\x1b[33mwarn\nstill\x1b[m\nplain")).toEqual([
      { text: "warn\nstill", classes: ["term-yellow"] },
      { text: "\nplain", classes: [] },
    ]);
  });

  it("drops 256/truecolor arguments, cursor moves, OSC titles and lone escapes", () => {
    expect(terminalSegments("\x1b[38;5;196ma\x1b[38;2;1;2;3;4mb\x1b[2K\x1b[1Ac\x1b]0;title\x07d\x1be")).toEqual([
      { text: "a", classes: [] },
      // 38;2;r;g;b takes three values: the trailing 4 is underline.
      { text: "bcde", classes: ["term-underline"] },
    ]);
  });

  it("never interprets HTML", () => {
    expect(terminalSegments("<b>x</b>")).toEqual([{ text: "<b>x</b>", classes: [] }]);
  });
});
