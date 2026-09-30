import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const create = fileURLToPath(new URL("../bin/create.mjs", import.meta.url));
const coreCli = fileURLToPath(new URL("../../interactive-code-scroll/bin/interactive-code-scroll.mjs", import.meta.url));
const seriesSource = fileURLToPath(new URL("../../interactive-code-scroll/src/series-public.ts", import.meta.url));
// Inside the package, so generated projects resolve astro from its node_modules; removed after the run.
mkdirSync(fileURLToPath(new URL("./fixtures/", import.meta.url)), { recursive: true });
const root = mkdtempSync(fileURLToPath(new URL("./fixtures/create-", import.meta.url)));
afterAll(() => rmSync(root, { recursive: true, force: true }));

/**
 * @param {string[]} args
 * @param {Record<string, string>} [env]
 */
function run(args, env = {}) {
  // stdin is not a terminal here, as in CI.
  return spawnSync(process.execPath, [create, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, CI: "true", ...env } });
}

describe("non-interactive mode", () => {
  it("names the missing options when there is no terminal to ask in", () => {
    const result = run(["docs", "--type", "web"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No terminal to ask in. Pass these options, or --yes for defaults:\n  --layout single|series\n  --pm npm|pnpm\n  --pages / --no-pages\n  --git / --no-git\n  --install / --no-install");
    expect(existsSync(join(root, "docs"))).toBe(false);
  });

  it("reports invalid answers without writing anything", () => {
    const result = run(["bad", "--yes", "--type", "script", "--langs", "swift"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--langs: "swift" is not available for script tutorials (python, javascript).');
    expect(existsSync(join(root, "bad"))).toBe(false);
  });

  it("refuses a folder that is not empty", () => {
    mkdirSync(join(root, "busy"));
    writeFileSync(join(root, "busy", "notes.txt"), "keep me");
    const result = run(["busy", "--yes", "--no-git", "--no-install"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("busy is not empty.");
    expect(readFileSync(join(root, "busy", "notes.txt"), "utf8")).toBe("keep me");
  });

  it("uses the launching package manager by default and prints the next steps", () => {
    const result = run(["pnpm-docs", "--yes", "--no-git", "--no-install"], { npm_config_user_agent: "pnpm/11.13.1 npm/? node/v24.1.0" });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(join(root, "pnpm-docs", "package.json"), "utf8")).packageManager).toBe("pnpm@11.13.1");
    expect(result.stdout).toContain("pnpm install");
    expect(result.stdout).toContain("Settings -> Pages -> Source: GitHub Actions.");
  });
});

/** Every type, each layout and language model, and each index kind. */
const matrix = [
  { name: "web", args: ["--type", "web"], pages: ["index.html", "preview/index.html"] },
  { name: "rest-variants", args: ["--type", "rest", "--langs", "curl,python,javascript"], pages: ["index.html", "output/items.json"] },
  { name: "script", args: ["--type", "script", "--langs", "python"], pages: ["index.html", "output/run.txt"] },
  { name: "native-variants", args: ["--type", "native", "--langs", "kotlin,swift,csharp"], pages: ["index.html"] },
  {
    name: "series-mdx",
    args: ["--layout", "series", "--tutorials", "intro,advanced", "--type", "rest", "--langs", "curl,python", "--languages-as", "variants", "--index", "mdx"],
    pages: ["index.html", "intro/index.html", "advanced/output/items.json"],
  },
  {
    name: "series-siblings",
    args: ["--layout", "series", "--tutorials", "intro", "--type", "script", "--langs", "python,javascript", "--languages-as", "siblings"],
    pages: ["index.html", "intro-python/index.html", "intro-javascript/index.html"],
  },
  { name: "series-custom", args: ["--layout", "series", "--tutorials", "intro", "--type", "web", "--index", "custom"], pages: ["index.html", "intro/preview/index.html"] },
];

describe("generated projects build", () => {
  it.each(matrix)("$name", ({ name, args, pages }) => {
    const created = run([name, ...args, "--yes", "--pm", "npm", "--no-git", "--no-install"]);
    expect(created.status, created.stderr).toBe(0);
    const project = join(root, name);
    const scripts = JSON.parse(readFileSync(join(project, "package.json"), "utf8")).scripts;
    const index = / --index (\S+)/.exec(scripts.build)?.[1];
    if (index) {
      // The published `interactive-code-scroll/series` specifier is covered by scripts/smoke-pack.mjs.
      const page = join(project, index);
      writeFileSync(page, readFileSync(page, "utf8").replace('"interactive-code-scroll/series"', JSON.stringify(seriesSource)));
    }
    const build = spawnSync(process.execPath, [coreCli, "build", "--root", project, ...(index ? ["--index", index] : [])], {
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    });
    expect(build.status, build.stdout + build.stderr).toBe(0);
    for (const page of pages) expect(existsSync(join(project, "dist", page)), page).toBe(true);
  }, 120_000);
});
