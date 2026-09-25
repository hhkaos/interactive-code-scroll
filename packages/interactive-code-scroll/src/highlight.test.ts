import { describe, expect, it } from "vitest";
import { highlight, langFor } from "./highlight.ts";
import { parseSource } from "./markers.ts";

describe("highlight", () => {
  it("tags region lines and puts data-var on the literal token", async () => {
    const parsed = parseSource('// #region config\nconst id = "ID"; // @var clientId\n// #endregion\nrun();');
    const html = await highlight(parsed, "main.js");
    const lines = html.split('<span class="line"');
    expect(lines[1]).toContain('data-regions="config"');
    expect(lines[2]).not.toContain("data-regions");
    expect(html).toMatch(/<span[^>]*data-var="clientId"[^>]*>ID<\/span>/);
    expect(html).toContain("--shiki-light:");
    expect(html).toContain("--shiki-dark:");
  });

  it("maps extensions to Shiki languages", () => {
    expect(langFor("a/b.MJS")).toBe("javascript");
    expect(langFor("index.html")).toBe("html");
    expect(langFor("README")).toBe("text");
  });
});
