import { defineConfig } from "@playwright/test";

const port = 4400;

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: `http://localhost:${port}`, viewport: { width: 1440, height: 900 } },
  webServer: {
    // --ignore-lock keeps Astro 7 in the foreground; it auto-backgrounds when it detects an AI agent.
    command: `pnpm build && pnpm --filter example-oauth-pkce preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
