import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseFrontmatter } from "astro/markdown";
import { mdxToMdast } from "satteri";
import { frontmatterKeyLines, readIndexConfig, readTutorialConfig } from "./frontmatter.ts";
import { jsxAttributes } from "./llm-parts.ts";
import { parseSource } from "./markers.ts";
import { credentialWarnings, isTextOutput } from "./output.ts";
import { cardTags, discoverTutorials, SERIES_IMAGES, SERIES_INDEX, unusedGroupTags } from "./series.ts";
import { seriesProblems, type SeriesMember } from "./tutorial-data.ts";
import { listFiles, readTutorialFiles, type TutorialFiles } from "./tutorial-files.ts";
import { jsonVarTargets, validateSeriesIndex, validateTutorial, type ComponentUse } from "./validate.ts";
import { parsedFiles } from "./variants.ts";
import { globToRegExp } from "./visible-files.ts";

/** The components the tutorial validation reads. */
export const TUTORIAL_COMPONENTS = new Set(["Hint", "Intro", "Outro", "Step", "VarField"]);

export interface TutorialProblemsInput {
  /** `tutorial.mdx` path as messages show it (relative to the working directory). */
  mdxFile: string;
  tutorial: TutorialFiles;
  frontmatter: Record<string, unknown>;
  uses: ComponentUse[];
  /** `<summary>` elements parsed inline (no blank line after them). */
  inlineSummaries: readonly { line: number; column: number }[];
  /** Whether the tutorial belongs to a series site. */
  series: boolean;
}

/** Every problem of one tutorial: `errors` fail the build, `warnings` are logged. Shared by the MDX compile and `check`. */
export function tutorialProblems({ mdxFile, tutorial, frontmatter, uses, inlineSummaries, series }: TutorialProblemsInput): {
  errors: string[];
  warnings: string[];
} {
  const frontmatterLines = frontmatterKeyLines(readFileSync(tutorial.mdxPath, "utf8"));
  const errors = validateTutorial({
    mdxFile,
    uses,
    files: tutorial.files,
    binaries: tutorial.binaries,
    hiddenCode: tutorial.hiddenCode,
    ignoredCode: tutorial.ignoredCode,
    images: tutorial.images,
    embeds: tutorial.embeds,
    outputs: tutorial.outputs,
    requests: tutorial.requests,
    requestBinaries: tutorial.requestBinaries,
    fieldOptions: tutorial.fieldOptions,
    frontmatter,
    frontmatterLines,
  });
  if (errors.length > 0) return { errors, warnings: [] };

  const warnings: string[] = [];
  const { jsonVars } = jsonVarTargets(mdxFile, uses, tutorial.files);
  const sources = [...parsedFiles(tutorial.files, jsonVars).values(), ...tutorial.requests.map((f) => parseSource(f.source, `requests/${f.path}`))];
  const defaults = new Set(sources.flatMap((p) => p.vars.map((v) => v.defaultValue)));
  const texts = tutorial.outputs.filter(isTextOutput).map((path) => ({ path, text: readFileSync(join(tutorial.outputDir, path), "utf8") }));
  warnings.push(...credentialWarnings(texts, defaults));
  for (const folder of tutorial.skippedCodeDirs) {
    warnings.push(
      `${mdxFile}:${frontmatterLines.include ?? 1}:1 code/${folder}/ is not published (paths starting with "." are skipped); add "${folder}/**" to frontmatter "include" to publish it`,
    );
  }
  // An explicit include wins over .gitignore, but the author should know a local-only file goes public.
  const published = new Set([...tutorial.files.map((f) => f.path), ...tutorial.binaries]);
  for (const pattern of readTutorialConfig(frontmatter).include ?? []) {
    const regex = globToRegExp(pattern);
    const matched = tutorial.ignoredCode.filter(({ path }) => published.has(path) && regex.test(path));
    if (matched.length === 0) continue;
    const [first] = matched;
    const more = matched.length > 1 ? ` and ${matched.length - 1} more gitignored path(s)` : "";
    warnings.push(
      `${mdxFile}:${frontmatterLines.include ?? 1}:1 frontmatter include "${pattern}" publishes code/${first!.path}${more}, which ${first!.by} excludes; make sure it holds no secrets or local state`,
    );
  }
  for (const { line, column } of inlineSummaries) {
    warnings.push(`${mdxFile}:${line}:${column} <summary> is rendered inside a paragraph; put a blank line between it and the <details> content`);
  }
  if (!series && frontmatter.family !== undefined) {
    warnings.push(`${mdxFile}:${frontmatterLines.family ?? 1}:1 frontmatter "family" has no effect outside a series site`);
  }
  if (!series && frontmatter.next !== undefined) {
    warnings.push(`${mdxFile}:${frontmatterLines.next ?? 1}:1 frontmatter "next" has no effect outside a series site`);
  }
  return { errors, warnings };
}

/** One problem `check` reports. */
export interface CheckProblem {
  severity: "error" | "warning";
  file?: string;
  line?: number;
  column?: number;
  message: string;
}

const LOCATED = /^(\S*[./]\S*?):(?:(\d+)(?::(\d+))?:?)?\s+([\s\S]*)$/;

/** Splits `file:line:column message` (as validation writes problems) into its parts. */
export function toProblem(severity: CheckProblem["severity"], text: string): CheckProblem {
  const plain = text.replace(/^interactive-code-scroll: /, "");
  const match = LOCATED.exec(plain);
  if (!match) return { severity, message: plain };
  const [, file, line, column, message] = match;
  return {
    severity,
    file: file!,
    ...(line === undefined ? {} : { line: Number(line) }),
    ...(column === undefined ? {} : { column: Number(column) }),
    message: message!,
  };
}

interface MdxNode {
  type: string;
  name?: string | null;
  children?: MdxNode[];
  position?: { start: { line: number; column: number } };
}

/** Parses an MDX file: its frontmatter and the JSX elements `accept` keeps, with positions. */
function readMdx(
  mdxPath: string,
  mdxFile: string,
  accept: (name: string) => boolean,
): { frontmatter: Record<string, unknown>; uses: ComponentUse[]; inlineSummaries: { line: number; column: number }[] } | string {
  const source = readFileSync(mdxPath, "utf8");
  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = (parseFrontmatter(source).frontmatter ?? {}) as Record<string, unknown>;
  } catch (error) {
    return `${mdxFile}:1:1 frontmatter: ${error instanceof Error ? error.message : String(error)}`;
  }
  let tree: MdxNode;
  try {
    tree = mdxToMdast(source, { position: true }) as unknown as MdxNode;
  } catch (error) {
    return `${mdxFile}:${error instanceof Error ? error.message : String(error)}`;
  }
  const uses: ComponentUse[] = [];
  const inlineSummaries: { line: number; column: number }[] = [];
  const visit = (node: MdxNode) => {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      const start = node.position?.start;
      const at = { line: start?.line ?? 0, column: start?.column ?? 0 };
      if (node.name && accept(node.name)) uses.push({ name: node.name, attributes: jsxAttributes(node as Parameters<typeof jsxAttributes>[0]), ...at });
      if (node.type === "mdxJsxTextElement" && node.name === "summary") inlineSummaries.push(at);
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  return { frontmatter, uses, inlineSummaries };
}

export interface CheckOptions {
  /** Tutorial folders (absolute); ignored with `seriesDir`. */
  tutorialDirs?: readonly string[];
  /** Series folder (absolute): every `<slug>/tutorial.mdx`, its `index.mdx` and the cross-tutorial rules. */
  seriesDir?: string;
  /** Base for the paths in messages; default the working directory. */
  cwd?: string;
}

/** The build's validation without Astro: every problem of the tutorials, in file order. */
export function checkTutorials({ tutorialDirs = [], seriesDir, cwd = process.cwd() }: CheckOptions): { tutorials: number; problems: CheckProblem[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sources: { slug: string; dir: string }[];
  if (seriesDir === undefined) sources = tutorialDirs.map((dir) => ({ slug: "", dir }));
  else {
    try {
      sources = discoverTutorials(seriesDir, (message) => warnings.push(message));
    } catch (error) {
      return { tutorials: 0, problems: [toProblem("error", error instanceof Error ? error.message : String(error))] };
    }
  }

  const members: SeriesMember[] = [];
  let membersValid = true;
  for (const { slug, dir } of sources) {
    const tutorial = readTutorialFiles(dir);
    const mdxFile = relative(cwd, tutorial.mdxPath);
    const mdx = readMdx(tutorial.mdxPath, mdxFile, (name) => TUTORIAL_COMPONENTS.has(name));
    if (typeof mdx === "string") {
      errors.push(mdx);
      membersValid = false;
      continue;
    }
    const problems = tutorialProblems({ mdxFile, tutorial, ...mdx, series: seriesDir !== undefined });
    errors.push(...problems.errors);
    warnings.push(...problems.warnings);
    if (problems.errors.length > 0) membersValid = false;
    members.push({ slug, frontmatter: mdx.frontmatter, images: Object.fromEntries(tutorial.images.map((image) => [image, image])) });
  }

  if (seriesDir !== undefined) {
    const indexPath = join(seriesDir, SERIES_INDEX);
    if (existsSync(indexPath)) {
      const mdxFile = relative(cwd, indexPath);
      const mdx = readMdx(indexPath, mdxFile, (name) => /^[A-Z]/.test(name));
      if (typeof mdx === "string") errors.push(mdx);
      else {
        const indexErrors = validateSeriesIndex({
          mdxFile,
          uses: mdx.uses,
          images: listFiles(join(seriesDir, SERIES_IMAGES)),
          frontmatter: mdx.frontmatter,
          frontmatterLines: frontmatterKeyLines(readFileSync(indexPath, "utf8")),
        });
        errors.push(...indexErrors);
        if (indexErrors.length === 0 && membersValid) {
          const groups = readIndexConfig(mdx.frontmatter).tagGroups ?? [];
          const groupTags = groups.flatMap((group) => group.tags);
          const cards = members.map(({ frontmatter }) => {
            const config = readTutorialConfig(frontmatter);
            return { tags: cardTags(config.tags, (config.variants ?? []).map((v) => v.label), groupTags) };
          });
          const unused = unusedGroupTags(groups, cards);
          if (unused.length > 0) errors.push(`${mdxFile}: frontmatter tagGroups: no tutorial has the tag(s) ${unused.map((t) => `"${t}"`).join(", ")}`);
        }
      }
    }
    if (membersValid) {
      const cross = seriesProblems(members);
      errors.push(...cross.errors);
      warnings.push(...cross.warnings);
    }
  }
  return { tutorials: sources.length, problems: [...errors.map((text) => toProblem("error", text)), ...warnings.map((text) => toProblem("warning", text))] };
}

/** `check` output: one line per problem and a summary, or JSON. */
export function formatCheck(problems: readonly CheckProblem[], { json = false, tutorials = 1 } = {}): string {
  const errors = problems.filter((p) => p.severity === "error").length;
  const warnings = problems.length - errors;
  if (json) return JSON.stringify({ ok: errors === 0, errors, warnings, problems }, null, 2);
  const lines = problems.map((p) => {
    const at = p.file === undefined ? "" : `${p.file}${p.line === undefined ? "" : `:${p.line}`}${p.column === undefined ? "" : `:${p.column}`} `;
    return `${p.severity} ${at}${p.message}`;
  });
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  lines.push(
    problems.length === 0
      ? `No problems found in ${count(tutorials, "tutorial")}.`
      : `${count(errors, "error")}, ${count(warnings, "warning")} in ${count(tutorials, "tutorial")}.`,
  );
  return lines.join("\n");
}
