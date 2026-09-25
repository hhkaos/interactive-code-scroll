import { defineConfig } from "@playwright/test";

export interface SpikeOptions {
  focusedLine: string;
  visibleCode: string;
}

export default defineConfig<SpikeOptions>({
  testDir: "e2e",
  use: { viewport: { width: 1440, height: 900 } },
  projects: [
    {
      name: "codehike",
      use: { baseURL: "http://localhost:5173", focusedLine: ".line-focus", visibleCode: ".code" },
    },
    {
      name: "astro",
      use: { baseURL: "http://localhost:4321", focusedLine: ".line[data-focus]", visibleCode: ".code:not([hidden])" },
    },
  ],
  webServer: [
    { command: "pnpm --filter ics-spike-codehike dev --port 5173 --strictPort", url: "http://localhost:5173", reuseExistingServer: true },
    { command: "pnpm --filter ics-spike-astro dev --port 4321", url: "http://localhost:4321", reuseExistingServer: true },
  ],
});
