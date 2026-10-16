import { describe, expect, it } from "vitest";
import { resolveAsk, withoutSelection } from "./ask.ts";

const feedback = "https://github.com/o/r/issues/new?title=Question&body={context}";

describe("resolveAsk", () => {
  it("defaults to the author (with a feedback URL), ChatGPT and Claude", () => {
    expect(resolveAsk(undefined, feedback)).toEqual({
      author: feedback,
      assistants: [
        { label: "ChatGPT", url: "https://chatgpt.com/?q={prompt}" },
        { label: "Claude", url: "https://claude.ai/new?q={prompt}" },
      ],
    });
  });

  it("skips the author in the default list without a feedback URL", () => {
    expect(resolveAsk(undefined, undefined).author).toBeUndefined();
  });

  it("keeps the listed order and custom assistants", () => {
    const custom = { label: " Esri's Ask AI ", url: "https://developers.arcgis.com/" };
    expect(resolveAsk([custom, "claude"], undefined)).toEqual({
      assistants: [
        { label: "Esri's Ask AI", url: "https://developers.arcgis.com/" },
        { label: "Claude", url: "https://claude.ai/new?q={prompt}" },
      ],
    });
  });

  it("turns everything off with false", () => {
    expect(resolveAsk(false, feedback)).toEqual({ assistants: [] });
  });

  it("refuses an explicit author without a feedback URL", () => {
    expect(() => resolveAsk(["author", "chatgpt"], undefined)).toThrow(/no feedbackUrl/);
  });
});

describe("withoutSelection", () => {
  it("fills the selection placeholders empty", () => {
    expect(withoutSelection("https://x.test/new?body={context}%0A{selection}&ref={url}&t=a")).toBe("https://x.test/new?body=%0A&ref=&t=a");
  });
});
