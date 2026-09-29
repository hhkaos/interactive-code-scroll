import { HTTP_VARIABLE } from "./markers.ts";

export interface HttpHeader {
  name: string;
  value: string;
}

/** A request of a `.http` file, with its `{{placeholders}}` unresolved. */
export interface HttpRequest {
  /** From `# @name x`; unnamed requests cannot be bound by `request=`. */
  name?: string;
  /** 1-based line of the request line. */
  line: number;
  method: string;
  /** Query continuation lines (`?` / `&`) are appended. */
  url: string;
  headers: HttpHeader[];
  body?: string;
}

export interface HttpFile {
  /** Path relative to `requests/`, with forward slashes. */
  path: string;
  /** File variables (`@name = value`): file-scoped, wherever they are defined. */
  variables: Record<string, string>;
  requests: HttpRequest[];
}

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const REQUEST_NAME = /^[A-Za-z0-9_-]+$/;
const SEPARATOR = /^###/;
const COMMENT = /^\s*(?:#|\/\/)/;
const NAME_COMMENT = /^\s*(?:#|\/\/)\s*@name\b\s*=?\s*(.*?)\s*$/;
const REQUEST_LINE = /^(\S+)\s+(\S.*?)(?:\s+HTTP\/[\d.]+)?\s*$/;
const HEADER = /^([^\s:]+)\s*:\s*(.*?)\s*$/;
const PLACEHOLDER = /\{\{\s*(.*?)\s*\}\}/g;
/** `< file`, `<@ file` bodies and JetBrains `<> previous-response` references. */
const FILE_BODY = /^<[@>]?\s/;
/** Response handlers (`> {% %}`, `> file.js`) and response redirects (`>> file`, `>>! file`). */
const RESPONSE_HANDLER = /^>{1,2}!?\s/;

/** Parses the supported `.http` subset; `errors` holds `requests/<path>:<line>: message` entries. */
export function parseHttpFile(source: string, path: string): { file: HttpFile; errors: string[] } {
  const lines = source.split("\n").map((line) => line.replace(/\r$/, ""));
  const errors: string[] = [];
  const report = (line: number, message: string) => errors.push(`requests/${path}:${line}: ${message}`);

  const variables: Record<string, string> = {};
  for (const line of lines) {
    const variable = HTTP_VARIABLE.exec(line);
    if (variable && !COMMENT.test(line)) variables[variable[2]!] = variable[3]!;
  }
  const checkPlaceholders = (text: string, line: number) => {
    for (const [, inner] of text.matchAll(PLACEHOLDER)) {
      if (inner!.startsWith("$")) report(line, `system variable {{${inner}}} is not supported; use a file variable`);
      else if (/^[\w-]+\.(?:request|response)\b/.test(inner!)) report(line, `request variable {{${inner}}} is not supported`);
      else if (!(inner! in variables)) report(line, `{{${inner}}} has no file variable; add "@${inner} = value" to this file`);
    }
  };

  const requests: HttpRequest[] = [];
  let state: "between" | "headers" | "body" = "between";
  let pendingName: { name: string; line: number } | undefined;
  let current: HttpRequest | undefined;
  let body: string[] = [];
  const finish = () => {
    if (current) {
      while (body.length > 0 && body.at(-1)!.trim() === "") body.pop();
      if (body.length > 0) current.body = body.join("\n");
    }
    state = "between";
    pendingName = undefined;
    current = undefined;
    body = [];
  };

  lines.forEach((text, index) => {
    const line = index + 1;
    if (SEPARATOR.test(text)) return finish();

    if (state === "body") {
      if (FILE_BODY.test(text)) report(line, "file bodies (< file) are not supported; write the body inline");
      else if (RESPONSE_HANDLER.test(text)) report(line, "response handlers and redirects (> …) are not supported");
      else {
        checkPlaceholders(text, line);
        body.push(text);
      }
      return;
    }

    if (state === "headers") {
      const trimmed = text.trim();
      if (trimmed === "") state = "body";
      else if (COMMENT.test(text)) return;
      else if (/^[?&]/.test(trimmed) && current!.headers.length === 0) {
        checkPlaceholders(trimmed, line);
        current!.url += trimmed;
      } else {
        const header = HEADER.exec(text);
        if (!header) return report(line, 'expected a header "Name: value" or a blank line before the body');
        checkPlaceholders(text, line);
        current!.headers.push({ name: header[1]!, value: header[2]! });
      }
      return;
    }

    if (text.trim() === "") return;
    const name = NAME_COMMENT.exec(text);
    if (name) {
      if (pendingName) report(line, `request already named "${pendingName.name}" on line ${pendingName.line}`);
      else if (!REQUEST_NAME.test(name[1]!)) report(line, `request name "${name[1]}" must be letters, digits, "_" and "-"`);
      else pendingName = { name: name[1]!, line };
      return;
    }
    if (COMMENT.test(text)) return;
    if (HTTP_VARIABLE.test(text)) return checkPlaceholders(HTTP_VARIABLE.exec(text)![3]!, line);
    if (/^[<>]/.test(text)) return report(line, "pre-request and response scripts are not supported");

    const request = REQUEST_LINE.exec(text.trim());
    if (!request || !HTTP_METHODS.includes(request[1]!)) {
      return report(line, `request line must be "METHOD URL" with METHOD one of ${HTTP_METHODS.join(", ")}`);
    }
    checkPlaceholders(request[2]!, line);
    current = { ...(pendingName && { name: pendingName.name }), line, method: request[1]!, url: request[2]!, headers: [] };
    requests.push(current);
    state = "headers";
  });
  finish();
  return { file: { path, variables, requests }, errors };
}

/** Request name → where it is defined; a name defined twice across `requests/` is an error. */
export function requestIndex(files: readonly HttpFile[]): { names: Map<string, { path: string; line: number }>; errors: string[] } {
  const names = new Map<string, { path: string; line: number }>();
  const errors: string[] = [];
  for (const file of files) {
    for (const { name, line } of file.requests) {
      if (name === undefined) continue;
      const other = names.get(name);
      if (other) errors.push(`requests/${file.path}:${line}: request name "${name}" is also defined in requests/${other.path}:${other.line}`);
      else names.set(name, { path: file.path, line });
    }
  }
  return { names, errors };
}

/** A named request as the browser runner gets it: placeholders unresolved, with its file's variables. */
export interface RunnerRequest {
  /** Path relative to `requests/`. */
  path: string;
  name: string;
  method: string;
  url: string;
  headers: HttpHeader[];
  body?: string;
  /** File variable defaults of the request's file. */
  variables: Record<string, string>;
}

/** Request name → runner entry; unnamed requests cannot be bound, so they are left out. */
export function runnerRequests(files: readonly HttpFile[]): Record<string, RunnerRequest> {
  const out: Record<string, RunnerRequest> = {};
  for (const { path, variables, requests } of files) {
    for (const { name, method, url, headers, body } of requests) {
      if (name === undefined || name in out) continue;
      out[name] = { path, name, method, url, headers, ...(body !== undefined && { body }), variables };
    }
  }
  return out;
}
