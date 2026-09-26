import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["packages/**/*.test.ts", "packages/**/*.test.mjs"], exclude: ["**/node_modules/**", "**/fixtures/**"] },
});
