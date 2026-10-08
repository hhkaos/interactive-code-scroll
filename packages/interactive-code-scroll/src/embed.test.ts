import { describe, expect, it } from "vitest";
import { embedUrl, resolveEmbed } from "./embed.ts";

const embeds = ["slides/index.html", "slides/assets/app.js", "demo page.html", "app/index.html"];

describe("resolveEmbed", () => {
  it("accepts https:// URLs as they are", () => {
    expect(resolveEmbed("https://example.com/app?x=1#a", embeds)).toEqual({ kind: "remote", url: "https://example.com/app?x=1#a" });
  });

  it("opens a folder's index.html, always with a trailing slash, keeping the query and fragment", () => {
    expect(resolveEmbed("slides", embeds)).toEqual({ kind: "local", path: "slides/", suffix: "" });
    expect(resolveEmbed("slides/#/3", embeds)).toEqual({ kind: "local", path: "slides/", suffix: "#/3" });
    expect(resolveEmbed("slides#/3", embeds)).toEqual({ kind: "local", path: "slides/", suffix: "#/3" });
  });

  it("opens a file", () => {
    expect(resolveEmbed("demo page.html?x=1", embeds)).toEqual({ kind: "local", path: "demo page.html", suffix: "?x=1" });
    expect(resolveEmbed("slides/index.html#/2", embeds)).toEqual({ kind: "local", path: "slides/index.html", suffix: "#/2" });
  });

  it.each([
    ["http://example.com", "must be an https:// URL or a path in embeds/"],
    ["javascript:alert(1)", "must be an https:// URL or a path in embeds/"],
    ["//example.com/app", "must be an https:// URL or a path in embeds/"],
    ["/slides/", "must be an https:// URL or a path in embeds/"],
    ["../code/index.html", "must be an https:// URL or a path in embeds/"],
    ["slides/../app", "must be an https:// URL or a path in embeds/"],
    ["", "must be an https:// URL or a path in embeds/"],
    ["missing/", "not found in embeds/"],
    ["slides/assets/", "not found in embeds/"],
    ["https://exa mple.com", "is not a valid URL"],
  ])("rejects %j", (value, message) => {
    expect(resolveEmbed(value, embeds)).toEqual({ error: expect.stringContaining(message) });
  });
});

describe("embedUrl", () => {
  it("publishes local embeds under the tutorial's embeds/, encoded", () => {
    expect(embedUrl({ kind: "local", path: "slides/", suffix: "#/3" }, "/base/rest/")).toBe("/base/rest/embeds/slides/#/3");
    expect(embedUrl({ kind: "local", path: "demo page.html", suffix: "" }, "/")).toBe("/embeds/demo%20page.html");
  });

  it("keeps remote URLs", () => {
    expect(embedUrl({ kind: "remote", url: "https://example.com/" }, "/")).toBe("https://example.com/");
  });
});
