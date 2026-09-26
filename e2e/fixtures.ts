import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

/** ArcGIS Maps SDK and Calcite assets (t9n, icons) are served from this CDN. */
const ESRI_CDN = /^https:\/\/js\.arcgis\.com\//;

/**
 * Tests are hermetic by default: the Esri CDN is blocked, so neither the preview's
 * app nor Calcite's runtime asset fetches (which delay first render) depend on the
 * network. Opt in with `test.use({ network: true })`.
 */
export const test = base.extend<{ network: boolean }>({
  network: [false, { option: true }],
  context: async ({ context, network }, use) => {
    if (!network) await context.route(ESRI_CDN, (route) => route.abort());
    await use(context);
  },
});
