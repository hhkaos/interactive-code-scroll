import { defineConfig } from "@playwright/test";

/** Each fixture tutorial is built and served on its own port. */
const fixtures = [
  { name: "fixture", filter: "example-framework-fixture", port: 4400, specs: undefined },
  { name: "variants", filter: "example-framework-fixture-variants", port: 4401, specs: /\/variants\.spec\.ts$/ },
  { name: "variants-hide", filter: "example-framework-fixture-variants-hide", port: 4402, specs: /\/variants-hide\.spec\.ts$/ },
];
/** Specs bound to a dedicated fixture; every other spec runs against the main fixture. */
const dedicated = fixtures.flatMap((f) => (f.specs ? [f.specs] : []));

export default defineConfig({
  testDir: "e2e",
  use: { viewport: { width: 1440, height: 900 } },
  projects: fixtures.map(({ name, port, specs }) => ({
    name,
    use: { baseURL: `http://localhost:${port}` },
    ...(specs ? { testMatch: specs } : { testIgnore: dedicated }),
  })),
  webServer: fixtures.map(({ filter, port }) => ({
    // --ignore-lock keeps Astro 7 in the foreground; it auto-backgrounds when it detects an AI agent.
    command: `CI=true pnpm --filter ${filter} build && CI=true pnpm --filter ${filter} preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  })),
});
