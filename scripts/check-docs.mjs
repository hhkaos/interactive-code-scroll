import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const digest = (text) => createHash("sha256").update(text).digest("hex");

/** Keep exact changelog entries as review keys, including continuation paragraphs. */
export function changes(markdown) {
  const result = [];
  let version;
  let entry;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## \[([^\]]+)\]/);
    if (heading || /^### /.test(line) || /^- /.test(line)) {
      if (entry) result.push({ version, change: entry.trim() });
      entry = undefined;
    }
    if (heading) version = heading[1];
    else if (/^- /.test(line)) entry = line.slice(2);
    else if (entry !== undefined) entry += `\n${line}`;
  }
  if (entry) result.push({ version, change: entry.trim() });
  return result;
}

/** Public Markdown headings use GitHub-style anchors; duplicate headings receive suffixes. */
export function anchors(markdown) {
  const seen = new Map();
  const ids = new Set();
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced || !/^#{1,6} /.test(line)) continue;
    const slug = line.replace(/^#+ /, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    ids.add(count ? `${slug}-${count}` : slug);
  }
  return ids;
}

export function checkDocs(root, { refresh = false, release = false } = {}) {
  const read = (path) => readFileSync(resolve(root, path), "utf8");
  const manifestPath = "docs/dev/documentation-review.json";
  const manifest = JSON.parse(read(manifestPath));
  const errors = [];
  const packages = ["interactive-code-scroll", "create-interactive-code-scroll"];
  const versions = packages.map((name) =>
    JSON.parse(read(`packages/${name}/package.json`)).version);
  if (versions[0] !== versions[1]) errors.push("Package versions must match.");
  const changelog = read("CHANGELOG.md");
  const headings = [...changelog.matchAll(/^## \[([^\]]+)\]/gm)].map((match) => match[1]);
  const baseline = headings.indexOf("0.2.0-beta.10");
  if (baseline < 0) errors.push("Changelog is missing the documentation-review baseline (0.2.0-beta.10).");
  const reviewedVersions = headings.slice(0, baseline + 1);
  const entries = changes(changelog).filter(({ version }) => reviewedVersions.includes(version));
  const keys = new Set(entries.map(({ change }) => change));
  const records = manifest.changes;
  if (!Array.isArray(records)) throw new Error(`${manifestPath}: changes must be an array.`);
  const documents = {};
  // Discover the whole public documentation set, including pages no release record cites yet.
  const documentPaths = [
    "README.md",
    ...packages.map((name) => `packages/${name}/README.md`),
    ...readdirSync(resolve(root, "docs"), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => `docs/${entry.name}`),
  ].sort();
  for (const path of documentPaths) {
    try {
      documents[path] = digest(read(path));
    } catch {
      errors.push(`Missing public documentation file: ${path}`);
    }
  }
  for (const { version, change } of entries) {
    const matches = records.filter((record) => record.change === change);
    if (matches.length !== 1) {
      errors.push(`${version}: expected one documentation review for: ${change.slice(0, 100)}`);
      continue;
    }
    const record = matches[0];
    const hasDocs = Array.isArray(record.docs) && record.docs.length > 0;
    const hasReason = typeof record.reason === "string" && record.reason.trim().length >= 20;
    if (hasDocs === hasReason) errors.push(`Choose documentation links OR a specific no-docs reason: ${change.slice(0, 80)}`);
    if ((record.breaking || /^(?:\*\*)?breaking(?:\s|:)/i.test(change)) && (!hasDocs || !record.docs.some((link) => typeof link === "string" && link.startsWith("docs/upgrade.md#")))) {
      errors.push(`Breaking changes require an upgrade-guide section: ${change.slice(0, 80)}`);
    }
    for (const link of hasDocs ? record.docs : []) {
      if (typeof link !== "string" || !/^docs\/[a-z-]+\.md#[a-z0-9_-]+$/.test(link)) {
        errors.push(`Use a public documentation section (docs/name.md#heading): ${link}`);
        continue;
      }
      const [path, hash] = link.split("#");
      try {
        const markdown = read(path);
        if (!anchors(markdown).has(hash)) errors.push(`Missing documentation anchor: ${link}`);
        documents[path] = digest(markdown);
      } catch {
        errors.push(`Missing documentation file: ${path}`);
      }
    }
  }
  for (const record of records) if (!keys.has(record.change)) errors.push(`Stale documentation review: ${record.change?.slice(0, 80)}`);
  // Include untracked implementation files as well: staging must not change the result.
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "packages"], { cwd: root, encoding: "utf8" })
    .split("\0").filter((path) => path && !/(^|\/)(test|fixtures)\/|\.test\.[^/]+$/.test(path)).sort();
  const sourceDigest = digest(paths.map((path) => `${path}\0${digest(readFileSync(resolve(root, path)))}`).join("\n"));
  const changelogDigest = digest(JSON.stringify(entries));
  if (refresh && manifest.sourceDigest && manifest.sourceDigest !== sourceDigest && manifest.changelogDigest === changelogDigest) {
    errors.push("Package inputs changed without a changelog review change. Record and review the change before refreshing.");
  }
  if (release) {
    if (headings[1] !== versions[0]) errors.push(`Latest changelog release must match package version ${versions[0]}.`);
    if (entries.some(({ version }) => version === "Unreleased")) errors.push("Move Unreleased entries into the release before publishing.");
  }
  if (!refresh) {
    if (manifest.sourceDigest !== sourceDigest) errors.push("Package inputs changed since documentation review. Review usage changes, then run pnpm docs:review.");
    const previousDocuments = manifest.documents ?? {};
    const changedDocuments = [...new Set([...Object.keys(previousDocuments), ...Object.keys(documents)])]
      .filter((path) => previousDocuments[path] !== documents[path]).sort();
    if (changedDocuments.length) errors.push(`Reviewed documents changed: ${changedDocuments.join(", ")}. Review the affected pages, then run pnpm docs:review.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  if (refresh) writeFileSync(resolve(root, manifestPath), `${JSON.stringify({ ...manifest, sourceDigest, changelogDigest, documents }, null, 2)}\n`);
  return `${entries.length} changelog entries have documentation reviews.`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const flags = process.argv.slice(2);
    if (flags.some((flag) => !["--refresh", "--release"].includes(flag)) || flags.length > 1) throw new Error("Use --refresh OR --release.");
    console.log(checkDocs(fileURLToPath(new URL("../", import.meta.url)), { refresh: flags.includes("--refresh"), release: flags.includes("--release") }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
