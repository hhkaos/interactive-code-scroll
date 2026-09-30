import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const cli = fileURLToPath(new URL("../bin/interactive-code-scroll.mjs", import.meta.url));
const seriesFixture = fileURLToPath(new URL("../../../fixtures/framework-fixture-series/", import.meta.url));
const deploymentDoc = fileURLToPath(new URL("../../../docs/deployment.md", import.meta.url));

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]));

/** Root-absolute URLs in HTML attributes, embedded JSON and CSS that do not start with the base. */
export function unprefixedUrls(text: string, base: string): string[] {
  const urls = [
    ...text.matchAll(/\s(?:href|src|srcset|action|poster|data-[\w-]+)="(\/[^"]*)"/g),
    ...text.matchAll(/":"(\/[^"]*)"/g),
    ...text.matchAll(/url\(["']?(\/[^"')]*)/g),
  ].map((match) => match[1]!);
  return urls.filter((url) => !url.startsWith(base) && !url.startsWith("//"));
}

it("flags root-absolute URLs that miss the base", () => {
  const html = '<a href="/repo/alpha/"></a><img src="/_astro/x.png"><script>{"href":"/beta/"}</script><style>a{background:url(/x.svg)}</style>';
  expect(unprefixedUrls(html, "/repo/")).toEqual(["/_astro/x.png", "/beta/", "/x.svg"]);
});

it("builds a series site whose internal URLs all carry a project-site base, as the Pages workflow does", () => {
  const outDir = mkdtempSync(join(tmpdir(), "ics-pages-"));
  try {
    const run = spawnSync(process.execPath, [cli, "build", "--root", seriesFixture, "--site", "https://octo.github.io", "--base", "/repo/", "--outDir", outDir], {
      encoding: "utf8",
      // A BASE_URL environment variable overrides import.meta.env.BASE_URL in Astro pages; links must follow --base.
      env: { ...process.env, CI: "true", BASE_URL: "/" },
    });
    expect(run.status, run.stderr + run.stdout).toBe(0);

    const published = files(outDir).filter((file) => /\.(html|css)$/.test(file));
    const offenders = published.flatMap((file) => unprefixedUrls(readFileSync(file, "utf8"), "/repo/").map((url) => `${file.slice(outDir.length)}: ${url}`));
    expect(offenders).toEqual([]);

    const index = readFileSync(join(outDir, "index.html"), "utf8");
    for (const slug of ["alpha", "beta", "gamma"]) expect(index).toContain(`href="/repo/${slug}/"`);
    expect(index).toMatch(/="\/repo\/_astro\/[^"]+\.css"/);

    const beta = readFileSync(join(outDir, "beta", "index.html"), "utf8");
    expect(beta).toContain('"base":"/repo/beta/"');
    expect(beta).toContain('href="/repo/"');
    expect(beta).toContain('<calcite-dropdown-item href="/repo/alpha/" data-tutorial="alpha">');
    expect(files(join(outDir, "beta")).map((file) => file.slice(outDir.length))).toEqual(
      expect.arrayContaining(["/beta/output/run.txt", "/beta/preview/web/index.html", "/beta/preview/web/main.js"]),
    );
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}, 120_000);

it("documents the scaffolder's npm and pnpm Pages workflows, which differ only in package manager commands", () => {
  const doc = readFileSync(deploymentDoc, "utf8");
  const documented = [...doc.matchAll(/```yaml\n(name: Deploy to GitHub Pages\n[\s\S]*?)```/g)].map((match) => match[1]!);
  // The scaffolder's templates are the source; the guide shows them verbatim.
  const workflows = ["npm", "pnpm"].map((pm) => readFileSync(new URL(`../../create-interactive-code-scroll/src/templates/pages/pages-${pm}.yml`, import.meta.url), "utf8"));
  expect(documented).toEqual(workflows);
  const [npm, pnpm] = workflows as [string, string];

  expect(npm).toContain("run: npm ci");
  expect(npm).toContain("npx --no-install interactive-code-scroll build");
  expect(pnpm).toContain("uses: pnpm/action-setup@");
  expect(pnpm).toContain("run: pnpm install --frozen-lockfile");
  expect(pnpm).toContain("pnpm exec interactive-code-scroll build");

  const normalize = (workflow: string) =>
    workflow
      .replace(/ {6}- name: Set up pnpm\n(?: {8}.*\n)+\n/, "")
      .replace(/cache: (?:npm|pnpm)/, "cache: <pm>")
      .replace(/run: (?:npm ci|pnpm install --frozen-lockfile)/, "run: <install>")
      .replace(/(?:npx --no-install|pnpm exec) interactive-code-scroll/, "<exec> interactive-code-scroll");
  expect(normalize(pnpm)).toBe(normalize(npm));

  expect(npm).toMatch(/^ {2}pull_request:$/m);
  expect(npm).toContain("uses: actions/configure-pages@");
  expect(npm).toContain("vars.ICS_SITE || steps.pages.outputs.origin");
  expect(npm).toContain("vars.ICS_BASE || format('{0}/', steps.pages.outputs.base_path)");
  // Pull requests build; only pushes and manual runs upload and deploy.
  expect(npm.match(/if: github\.event_name != 'pull_request'/g)).toHaveLength(2);
  expect(npm).toMatch(/permissions:\n {6}contents: read\n {6}pages: read\n/);
  expect(npm).toMatch(/permissions:\n {6}pages: write\n {6}id-token: write\n/);
  expect(npm).toMatch(/concurrency:\n {6}group: pages\n {6}cancel-in-progress: false\n/);
});
