import type { HttpHeader, RunnerRequest } from "../requests.ts";
import { displayValue } from "./var-values.ts";

/** A request that takes longer is aborted. */
export const RUN_TIMEOUT_MS = 30_000;

/** Same as in `requests.ts`: `{{name}}`, spaces allowed inside the braces. */
const PLACEHOLDER = /\{\{\s*(.*?)\s*\}\}/g;
/** File variables may use other file variables; deeper (or circular) references stay as written. */
const MAX_DEPTH = 10;

/** Form values of vars that have a `<VarField>`; other file variables keep their default. */
export type RunnerValues = Readonly<Record<string, string>>;

export interface ResolvedRequest {
  method: string;
  url: string;
  headers: HttpHeader[];
  body?: string;
}

type Encode = (value: string) => string;
const asIs: Encode = (value) => value;

/**
 * Expands `{{name}}` placeholders. `shown` may replace a variable's text (masking);
 * `encode` applies to each top-level substituted value, never to the template itself.
 */
function expander(request: RunnerRequest, values: RunnerValues, shown?: (name: string, value: string) => string | undefined) {
  const raw = (name: string) => values[name] ?? request.variables[name];
  const expand = (text: string, encode: Encode, seen: readonly string[] = []): string =>
    text.replace(PLACEHOLDER, (match, name: string) => {
      const value = raw(name);
      if (value === undefined || seen.includes(name) || seen.length >= MAX_DEPTH) return match;
      return encode(shown?.(name, value) ?? expand(value, asIs, [...seen, name]));
    });
  return expand;
}

/** URL template → path part as is, query part (after the first `?`) with `encode`. */
function expandUrl(url: string, expand: (text: string, encode: Encode) => string, encode: Encode): string {
  const query = url.indexOf("?");
  if (query === -1) return expand(url, asIs);
  return expand(url.slice(0, query), asIs) + expand(url.slice(query), encode);
}

/** What the runner sends: values URL-encoded in the query string, inserted as is in the path, headers and body. */
export function resolveRequest(request: RunnerRequest, values: RunnerValues): ResolvedRequest {
  const expand = expander(request, values);
  return {
    method: request.method,
    url: expandUrl(request.url, expand, encodeURIComponent),
    headers: request.headers.map(({ name, value }) => ({ name, value: expand(value, asIs) })),
    ...(request.body !== undefined && { body: expand(request.body, asIs) }),
  };
}

/** The request line shown above the response: secret values masked (as in the code panel) unless revealed, nothing encoded. */
export function displayLine(request: RunnerRequest, values: RunnerValues, secrets: ReadonlySet<string>, revealed: boolean): string {
  const expand = expander(request, values, (name, value) => {
    if (!secrets.has(name)) return undefined;
    const text = displayValue(value, request.variables[name] ?? "", true, revealed);
    return text === value ? undefined : text;
  });
  return `${request.method} ${expandUrl(request.url, expand, asIs)}`;
}

/** "Run as" labels: the method, or the request name when the step has two requests with the same method. */
export function runAsLabels(requests: readonly Pick<RunnerRequest, "name" | "method">[]): string[] {
  return requests.map(({ name, method }) => (requests.filter((r) => r.method === method).length > 1 ? name : method));
}

export type RunFailure = "network" | "timeout";

/** Notice shown when a live request gets no response; the pane falls back to the captured output when there is one. */
export function failureMessage(failure: RunFailure, hasCaptured: boolean): string {
  const reason =
    failure === "timeout"
      ? `Live request failed: no response after ${RUN_TIMEOUT_MS / 1000} s.`
      : "Live request failed: network error (offline or blocked by CORS).";
  return `${reason} ${hasCaptured ? "Showing the captured output instead." : "This step has no captured output."}`;
}

/** Badge of a live (or kept) response, e.g. "Live · 200 OK · 318 ms". */
export function responseBadge({ status, statusText, ms }: { status: number; statusText: string; ms: number }, kept: boolean): string {
  return `${kept ? "Kept" : "Live"} · ${status}${statusText ? ` ${statusText}` : ""} · ${Math.round(ms)} ms`;
}

/** Badge of a response whose body holds a service error, e.g. "Error 498 · HTTP 200". */
export function serviceErrorBadge(code: string | undefined, status: number): string {
  return `Error${code === undefined ? "" : ` ${code}`} · HTTP ${status}`;
}

/** Text bodies longer than this (in characters) are cut until the reader asks for all of it. */
export const TEXT_LIMIT = 200 * 1024;

/** The part of a text body shown first, and the size of the whole body for "Show all". */
export function truncate(text: string, limit = TEXT_LIMIT): { shown: string; truncated: boolean; kb: number } {
  return { shown: text.slice(0, limit), truncated: text.length > limit, kb: Math.ceil(text.length / 1024) };
}

/** How the Body tab renders a response, from its `Content-Type`. */
export function isImageType(contentType: string): boolean {
  return /^\s*image\//i.test(contentType);
}
