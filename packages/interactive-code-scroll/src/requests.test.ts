import { describe, expect, it } from "vitest";
import { parseHttpFile, requestIndex, runnerRequests } from "./requests.ts";

const parse = (source: string) => parseHttpFile(source, "geocode.http");

describe("parseHttpFile", () => {
  it("reads named requests, file variables, query continuation, headers and body", () => {
    const { file, errors } = parse(`@serviceUrl = https://example.com/api
@token = YOUR_TOKEN

# @name geocode-get
GET {{serviceUrl}}/geocode HTTP/1.1
  ?address=Main St
  &token={{token}}
Accept: application/json

###

// @name geocode-post
POST {{serviceUrl}}/geocode
Content-Type: application/x-www-form-urlencoded
X-Esri-Authorization: Bearer {{token}}

address=Main St&f=json


### unnamed
DELETE https://example.com/items/1
`);
    expect(errors).toEqual([]);
    expect(file.variables).toEqual({ serviceUrl: "https://example.com/api", token: "YOUR_TOKEN" });
    expect(file.requests).toEqual([
      {
        name: "geocode-get",
        line: 5,
        method: "GET",
        url: "{{serviceUrl}}/geocode?address=Main St&token={{token}}",
        headers: [{ name: "Accept", value: "application/json" }],
      },
      {
        name: "geocode-post",
        line: 13,
        method: "POST",
        url: "{{serviceUrl}}/geocode",
        headers: [
          { name: "Content-Type", value: "application/x-www-form-urlencoded" },
          { name: "X-Esri-Authorization", value: "Bearer {{token}}" },
        ],
        body: "address=Main St&f=json",
      },
      { line: 21, method: "DELETE", url: "https://example.com/items/1", headers: [] },
    ]);
  });

  it("accepts file variables defined after the request and '# @name = x'", () => {
    const { file, errors } = parse("# @name = search\nGET {{url}}\n\n###\n@url = https://example.com\n");
    expect(errors).toEqual([]);
    expect(file.requests[0]).toMatchObject({ name: "search", url: "{{url}}" });
  });

  it("keeps a multi-line body, CRLF removed", () => {
    const { file } = parse('POST https://x.test\r\nContent-Type: application/json\r\n\r\n{\r\n  "a": 1\r\n}\r\n');
    expect(file.requests[0]!.body).toBe('{\n  "a": 1\n}');
  });

  it.each([
    ["GET https://x.test/?id={{login.response.body.$.id}}", 1, "request variable {{login.response.body.$.id}} is not supported"],
    ["GET https://x.test/?id={{$guid}}", 1, "system variable {{$guid}} is not supported; use a file variable"],
    ["GET https://x.test/?token={{token}}", 1, '{{token}} has no file variable; add "@token = value" to this file'],
    ["POST https://x.test\n\n< ./body.json", 3, "file bodies (< file) are not supported; write the body inline"],
    ["GET https://x.test\n\n> {% client.log(1) %}", 3, "response handlers and redirects (> …) are not supported"],
    ["GET https://x.test\n\n>> saved.json", 3, "response handlers and redirects (> …) are not supported"],
    ["< {% request.variables.set('a', 1) %}\nGET https://x.test", 1, "pre-request and response scripts are not supported"],
    ["https://x.test", 1, 'request line must be "METHOD URL" with METHOD one of GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'],
    ["FETCH https://x.test", 1, 'request line must be "METHOD URL" with METHOD one of GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'],
    ["GET https://x.test\nnot a header", 2, 'expected a header "Name: value" or a blank line before the body'],
    ["# @name a\n# @name b\nGET https://x.test", 2, 'request already named "a" on line 1'],
    ["# @name bad.name\nGET https://x.test", 1, 'request name "bad.name" must be letters, digits, "_" and "-"'],
  ])("reports %j at line %i", (source, line, message) => {
    expect(parse(source).errors).toEqual([`requests/geocode.http:${line}: ${message}`]);
  });
});

describe("requestIndex", () => {
  it("maps names to their file and reports a name defined twice across requests/", () => {
    const a = parseHttpFile("# @name search\nGET https://x.test\n", "a.http").file;
    const b = parseHttpFile("GET https://x.test\n\n###\n# @name search\nGET https://y.test\n", "sub/b.http").file;
    const { names, errors } = requestIndex([a, b]);
    expect(names).toEqual(new Map([["search", { path: "a.http", line: 2 }]]));
    expect(errors).toEqual(['requests/sub/b.http:5: request name "search" is also defined in requests/a.http:2']);
  });
});

describe("runnerRequests", () => {
  it("indexes named requests with their file's variables and leaves unnamed ones out", () => {
    const { file } = parse(`@base = https://example.com

# @name list
GET {{base}}/items

###
POST {{base}}/items
Content-Type: application/json

{}
`);
    expect(runnerRequests([file])).toEqual({
      list: { path: "geocode.http", name: "list", method: "GET", url: "{{base}}/items", headers: [], variables: { base: "https://example.com" } },
    });
  });
});
