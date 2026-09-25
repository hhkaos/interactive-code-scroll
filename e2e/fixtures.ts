import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

/** ArcGIS Maps SDK on the CDN (`js.arcgis.com/<major>.<minor>/…`), not Calcite's assets. */
const ARCGIS_SDK = /^https:\/\/js\.arcgis\.com\/\d+\.\d+\//;

/**
 * Tests are hermetic by default: the SDK is blocked so the preview iframe's map
 * never delays `load` or depends on the network. Opt in with `test.use({ sdk: true })`.
 */
export const test = base.extend<{ sdk: boolean }>({
  sdk: [false, { option: true }],
  context: async ({ context, sdk }, use) => {
    if (!sdk) await context.route(ARCGIS_SDK, (route) => route.abort());
    await use(context);
  },
});
