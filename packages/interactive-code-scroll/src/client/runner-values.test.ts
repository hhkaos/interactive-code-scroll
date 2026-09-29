import { describe, expect, it } from "vitest";
import type { RunnerRequest } from "../requests.ts";
import { displayLine, failureMessage, resolveRequest, responseBadge, runAsLabels } from "./runner-values.ts";

const request: RunnerRequest = {
  path: "geocode.http",
  name: "geocode-get",
  method: "GET",
  url: "{{base}}/geocode?address={{address}}&token={{token}}",
  headers: [{ name: "X-Esri-Authorization", value: "Bearer {{token}}" }],
  body: "token={{token}}&f=json",
  variables: { host: "example.com", base: "https://{{host}}/api", address: "Main St", token: "YOUR_TOKEN" },
};

describe("resolveRequest", () => {
  it("uses form values over file variable defaults, resolving nested file variables", () => {
    expect(resolveRequest(request, {}).url).toBe("https://example.com/api/geocode?address=Main%20St&token=YOUR_TOKEN");
    expect(resolveRequest(request, { host: "other.test" }).url).toMatch(/^https:\/\/other\.test\/api\/geocode\?/);
  });

  it("URL-encodes values in the query string only; path, headers and body get them as is", () => {
    const resolved = resolveRequest(request, { token: "a b&c", base: "https://example.com/a b" });
    expect(resolved.url).toBe("https://example.com/a b/geocode?address=Main%20St&token=a%20b%26c");
    expect(resolved.headers).toEqual([{ name: "X-Esri-Authorization", value: "Bearer a b&c" }]);
    expect(resolved.body).toBe("token=a b&c&f=json");
  });

  it("leaves unknown and circular placeholders as written", () => {
    const loop = { ...request, url: "https://x.test/{{a}}/{{missing}}", variables: { a: "{{b}}", b: "{{a}}" } };
    expect(resolveRequest(loop, {}).url).toBe("https://x.test/{{a}}/{{missing}}");
  });

  it("has no body when the request has none", () => {
    const { body: _, ...withoutBody } = request;
    expect(resolveRequest(withoutBody, {})).not.toHaveProperty("body");
  });
});

describe("displayLine", () => {
  const secrets = new Set(["token"]);

  it("masks secret values that differ from the demo default, unencoded", () => {
    expect(displayLine(request, { token: "a b&c" }, secrets, false)).toBe(
      "GET https://example.com/api/geocode?address=Main St&token=•••••",
    );
  });

  it("shows the demo default and revealed secrets as they are", () => {
    expect(displayLine(request, {}, secrets, false)).toMatch(/token=YOUR_TOKEN$/);
    expect(displayLine(request, { token: "a b&c" }, secrets, true)).toMatch(/token=a b&c$/);
  });
});

describe("runAsLabels", () => {
  it("uses the method, or the name when a method repeats", () => {
    expect(runAsLabels([{ name: "get", method: "GET" }, { name: "post", method: "POST" }])).toEqual(["GET", "POST"]);
    expect(runAsLabels([{ name: "a", method: "GET" }, { name: "b", method: "GET" }, { name: "c", method: "POST" }])).toEqual(["a", "b", "POST"]);
  });
});

describe("messages", () => {
  it("explains the failure and whether captured output is shown", () => {
    expect(failureMessage("network", true)).toBe(
      "Live request failed: network error (offline or blocked by CORS). Showing the captured output instead.",
    );
    expect(failureMessage("timeout", false)).toBe("Live request failed: no response after 30 s. This step has no captured output.");
  });

  it("labels live and kept responses", () => {
    expect(responseBadge({ status: 200, statusText: "OK", ms: 317.6 }, false)).toBe("Live · 200 OK · 318 ms");
    expect(responseBadge({ status: 404, statusText: "", ms: 12 }, true)).toBe("Kept · 404 · 12 ms");
  });
});
