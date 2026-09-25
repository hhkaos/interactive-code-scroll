import { expect, test } from "@playwright/test";

test("the injected page renders the author's tutorial.mdx", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "OAuth 2.0 with the ArcGIS Maps SDK for JavaScript",
  );
});
