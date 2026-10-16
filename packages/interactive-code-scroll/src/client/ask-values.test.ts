import { describe, expect, it } from "vitest";
import { askPrompt, assistantUrl, authorUrl, barPosition, contextMarkdown, linkBack, longEnough, truncate, type AskContext } from "./ask-values.ts";

const page = "https://example.com/tutorials/display-map/";
const prose: AskContext = { title: "Display a map", url: `${page}#basemap`, step: "Pick a basemap", selection: "The basemap sets\nthe background." };
const code: AskContext = { title: "Display a map", url: `${page}#basemap`, step: "Pick a basemap", selection: 'basemap: "arcgis/topographic"', code: { file: "index.html", lines: [12, 12] } };

describe("longEnough", () => {
  it("needs two words in the explanations", () => {
    expect(longEnough(" basemap ", false)).toBe(false);
    expect(longEnough("the basemap", false)).toBe(true);
  });

  it("needs three characters in code", () => {
    expect(longEnough(" {}\n", true)).toBe(false);
    expect(longEnough("map", true)).toBe(true);
  });
});

describe("truncate", () => {
  it("cuts long text with an ellipsis", () => {
    expect(truncate(`  ${"a".repeat(10)} `, 20)).toBe("a".repeat(10));
    expect(truncate("abcde fghij", 6)).toBe("abcde…");
  });
});

describe("linkBack", () => {
  it("adds a text fragment after the step hash", () => {
    expect(linkBack(page, "basemap", "a well-known  basemap")).toBe(`${page}#basemap:~:text=a%20well%2Dknown%20basemap`);
  });

  it("uses the first and last words of a long selection", () => {
    const long = `${"word ".repeat(30)}one two, three-four`;
    expect(linkBack(page, undefined, long)).toBe(`${page}#:~:text=word%20word%20word%20word,word%20one%20two%2C%20three%2Dfour`);
  });

  it("is the step link alone without text", () => {
    expect(linkBack(page, "basemap")).toBe(`${page}#basemap`);
    expect(linkBack(page, undefined)).toBe(page);
  });
});

describe("contextMarkdown", () => {
  it("quotes prose under the link and the step", () => {
    expect(contextMarkdown(prose)).toBe(`Tutorial: [Display a map](${page}#basemap)\nStep: Pick a basemap\n\n> The basemap sets\n> the background.`);
  });

  it("puts code in a block with its file and lines", () => {
    expect(contextMarkdown({ ...code, code: { file: "index.html", lines: [3, 5] } })).toContain('File: index.html, lines 3-5\n\n```\nbasemap: "arcgis/topographic"\n```');
    expect(contextMarkdown(code)).toContain("File: index.html, line 12\n");
    expect(contextMarkdown({ ...code, selection: "```js\nx\n```" })).toContain("~~~~\n```js\nx\n```\n~~~~");
  });
});

describe("askPrompt", () => {
  it("is a complete request around the context", () => {
    const prompt = askPrompt(prose);
    expect(prompt).toContain(contextMarkdown(prose));
    expect(prompt).toMatch(/^I'm following this tutorial/);
    expect(prompt).toMatch(/If it looks wrong, say so\.$/);
  });
});

describe("authorUrl and assistantUrl", () => {
  it("fills the selection placeholders, URL-encoded", () => {
    const url = authorUrl("https://github.com/o/r/issues/new?title=Q&body={context}&s={selection}&u={url}", prose);
    const params = new URL(url).searchParams;
    expect(params.get("body")).toBe(contextMarkdown(prose));
    expect(params.get("s")).toBe("The basemap sets\nthe background.");
    expect(params.get("u")).toBe(`${page}#basemap`);
  });

  it("puts the prompt in {prompt}, or opens the URL as is", () => {
    expect(new URL(assistantUrl("https://chatgpt.com/?q={prompt}", "a & b")).searchParams.get("q")).toBe("a & b");
    expect(assistantUrl("https://developers.arcgis.com/", "a & b")).toBe("https://developers.arcgis.com/");
  });
});

describe("barPosition", () => {
  const viewport = { width: 1000, height: 800 };
  const bar = { width: 200, height: 40 };

  it("centers the bar above the selection", () => {
    expect(barPosition({ top: 300, bottom: 320, left: 400, width: 100 }, bar, viewport, 60)).toEqual({ top: 252, left: 350 });
  });

  it("goes below the selection under the header and stays in the viewport", () => {
    expect(barPosition({ top: 80, bottom: 100, left: 0, width: 50 }, bar, viewport, 60)).toEqual({ top: 108, left: 8 });
    expect(barPosition({ top: 80, bottom: 790, left: 990, width: 10 }, bar, viewport, 60)).toEqual({ top: 752, left: 792 });
  });
});
