import { test as base, type Page } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

/** The fixture servers; every other host (Esri CDN, services the runner calls) is external. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const isExternal = (url: URL) => !LOCAL_HOSTS.has(url.hostname);

/**
 * Tests are hermetic by default: every external host is blocked, so neither the
 * preview's app, Calcite's runtime asset fetches (which delay first render) nor a
 * request runner depend on the network. Mock a service with `mockService()`
 * (page routes take precedence over this context route). Opt in to the network
 * with `test.use({ network: true })`.
 */
export const test = base.extend<{ network: boolean }>({
  network: [false, { option: true }],
  context: async ({ context, network }, use) => {
    if (!network) await context.route(isExternal, (route) => route.abort());
    await use(context);
  },
});

export const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" };

export type ServiceCall = { method: string; url: string; body: string | null; headers: Record<string, string> };

/** Answers a cross-origin service (and its CORS preflight); returns the requests it got. */
export async function mockService(
  page: Page,
  url: string | RegExp,
  reply: { status?: number; body?: string | Buffer; headers?: Record<string, string> } = {},
) {
  const calls: ServiceCall[] = [];
  await page.route(url, (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    calls.push({ method: request.method(), url: request.url(), body: request.postData(), headers: request.headers() });
    const headers = { ...CORS, "Content-Type": "application/json", ...reply.headers };
    return route.fulfill({ status: reply.status ?? 200, headers, body: reply.body ?? "{}" });
  });
  return calls;
}
