import { describe, expect, it } from "vitest";
import { siblingUrl } from "./family-values.ts";

describe("siblingUrl", () => {
  const base = "https://x.test/site/alpha/?variant=python#config";

  it("keeps the step hash", () => {
    expect(siblingUrl("/site/beta/", base, "#config", undefined, [])).toBe("https://x.test/site/beta/#config");
    expect(siblingUrl("/site/beta/", base, "", undefined, [])).toBe("https://x.test/site/beta/");
  });

  it("carries the variant only when the sibling has it", () => {
    expect(siblingUrl("/site/beta/", base, "#render", "python", ["web", "python"])).toBe("https://x.test/site/beta/?variant=python#render");
    expect(siblingUrl("/site/beta/", base, "#render", "python", ["web"])).toBe("https://x.test/site/beta/#render");
    expect(siblingUrl("/site/beta/", base, "#render", "python", [])).toBe("https://x.test/site/beta/#render");
  });
});
