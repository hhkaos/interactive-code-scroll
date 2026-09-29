import { describe, expect, it } from "vitest";
import { JsonNumber } from "./client/json-tree-values.ts";
import { matchError, readErrorRule, valueAt, type ErrorRule } from "./error-rule.ts";

const rule: ErrorRule = {
  object: "error",
  code: "error.code",
  message: "error.message",
  help: { "498": { text: "The token is invalid or expired.", link: "https://example.test/errors#498" } },
  fallbackLink: "https://example.test/errors",
};

describe("readErrorRule", () => {
  it("reads a valid rule; help and fallbackLink are optional", () => {
    expect(readErrorRule(JSON.stringify(rule))).toEqual({ rule, errors: [] });
    expect(readErrorRule('{ "object": "error", "code": "error.code", "message": "error.message" }')).toEqual({
      rule: { object: "error", code: "error.code", message: "error.message", help: {} },
      errors: [],
    });
  });

  it("reports invalid JSON at its line when the parser gives a position", () => {
    const { rule: read, errors } = readErrorRule('{\n  "object": "error",\n  "code": "error.code",\n}');
    expect(read).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]!.line).toBe(4);
    expect(errors[0]!.message).toMatch(/^invalid JSON: /);
  });

  it("reports a root that is not an object", () => {
    expect(readErrorRule("[]").errors).toEqual([{ line: 1, message: "must be a JSON object" }]);
  });

  it("reports missing and malformed paths, unknown keys, bad help and bad links at the key's line", () => {
    const source = [
      "{",
      '  "object": "error",',
      '  "code": "error..code",',
      '  "fallbacklink": "https://x.test",',
      '  "help": {',
      '    "498": { "text": "Invalid token", "link": "javascript:alert(1)" },',
      '    "499": { "link": "https://x.test" }',
      "  },",
      '  "fallbackLink": "not a url"',
      "}",
    ].join("\n");
    expect(readErrorRule(source)).toEqual({
      errors: [
        { line: 4, message: 'unknown key "fallbacklink"; expected object, code, message, help, fallbackLink' },
        { line: 3, message: '"code" must be a dot path such as "error.code"' },
        { line: 1, message: '"message" is required: a dot path such as "error.message"' },
        { line: 6, message: 'help "498" needs a "link" with an http(s) URL' },
        { line: 7, message: 'help "499" needs a non-empty "text"' },
        { line: 9, message: '"fallbackLink" must be an http(s) URL' },
      ],
    });
  });
});

describe("valueAt", () => {
  const body = { error: { code: new JsonNumber("498"), details: ["a"] } };

  it("follows dot paths through objects only", () => {
    expect(valueAt(body, "error.code")).toEqual(new JsonNumber("498"));
    expect(valueAt(body, "error.missing")).toBeUndefined();
    expect(valueAt(body, "error.details.0")).toBeUndefined();
    expect(valueAt(body, "error.code.source")).toBeUndefined();
    expect(valueAt(body, "toString")).toBeUndefined();
  });
});

describe("matchError", () => {
  it("matches a body holding the error object, with help for known codes", () => {
    const body = { error: { code: new JsonNumber("498"), message: "Invalid token." } };
    expect(matchError(rule, body)).toEqual({ code: "498", message: "Invalid token.", help: rule.help["498"] });
  });

  it("gives the fallback link for codes without help, and string codes", () => {
    expect(matchError(rule, { error: { code: "E42", message: "Nope" } })).toEqual({ code: "E42", message: "Nope", link: rule.fallbackLink });
    expect(matchError({ ...rule, fallbackLink: undefined }, { error: { code: "E42" } })).toEqual({ code: "E42" });
  });

  it("matches an error object without code or message", () => {
    expect(matchError(rule, { error: {} })).toEqual({ link: rule.fallbackLink });
  });

  it("does not match bodies without the error object", () => {
    expect(matchError(rule, { candidates: [] })).toBeUndefined();
    expect(matchError(rule, { error: null })).toBeUndefined();
    expect(matchError(rule, { error: "text" })).toBeUndefined();
    expect(matchError(rule, ["error"])).toBeUndefined();
    expect(matchError(rule, "error")).toBeUndefined();
  });
});
