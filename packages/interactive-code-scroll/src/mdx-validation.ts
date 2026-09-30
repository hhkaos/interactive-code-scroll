import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineMdastPlugin, type MdastPluginEntry, type MdxJsxFlowElement, type MdxJsxTextElement } from "satteri";
import { frontmatterKeyLines } from "./frontmatter.ts";
import { parseSource } from "./markers.ts";
import { credentialWarnings, isTextOutput } from "./output.ts";
import { SERIES_IMAGES, SERIES_INDEX } from "./series.ts";
import { listFiles, readTutorialFiles } from "./tutorial-files.ts";
import { validateSeriesIndex, validateTutorial, type AttributeValue, type ComponentUse } from "./validate.ts";
import { parsedFiles } from "./variants.ts";

const COMPONENTS = new Set(["Hint", "Step", "VarField"]);

export class TutorialValidationError extends Error {
  /** Position in the MDX of the first problem that has one: the MDX compiler turns it into the dev overlay `loc`. */
  readonly line?: number;
  readonly column?: number;

  constructor(
    readonly problems: string[],
    mdxFile?: string,
  ) {
    super(`Tutorial has ${problems.length} broken reference(s):\n  ${problems.join("\n  ")}`);
    this.name = "TutorialValidationError";
    if (mdxFile === undefined) return;
    for (const problem of problems) {
      if (!problem.startsWith(`${mdxFile}:`)) continue;
      const position = /^(\d+):(\d+) /.exec(problem.slice(mdxFile.length + 1));
      if (!position) continue;
      this.line = Number(position[1]);
      this.column = Number(position[2]);
      return;
    }
  }
}

function attributesOf(node: Readonly<MdxJsxFlowElement | MdxJsxTextElement>): Record<string, AttributeValue> {
  const out: Record<string, AttributeValue> = {};
  for (const attr of node.attributes) {
    if (attr.type !== "mdxJsxAttribute") continue;
    const { value } = attr;
    out[attr.name] = value == null ? true : typeof value === "string" ? value : { expression: value.value };
  }
  return out;
}

/** Collects every JSX component of an MDX file with its position. */
function componentCollector(accept: (name: string) => boolean) {
  const uses: ComponentUse[] = [];
  const collect = (node: Readonly<MdxJsxFlowElement | MdxJsxTextElement>) => {
    if (!node.name || !accept(node.name)) return;
    const start = node.position?.start;
    uses.push({ name: node.name, attributes: attributesOf(node), line: start?.line ?? 0, column: start?.column ?? 0 });
  };
  return { uses, collect };
}

/** A series `index.mdx`: frontmatter, logo and `<TutorialList>`; other components (capitalized) are errors. */
function seriesIndexValidation(data: Readonly<Record<string, unknown>>, mdxPath: string, seriesDir: string) {
  const frontmatter = frontmatterOf(data);
  const { uses, collect } = componentCollector((name) => /^[A-Z]/.test(name));
  return defineMdastPlugin({
    name: "interactive-code-scroll:validate-index",
    options: { position: true },
    mdxJsxFlowElement: collect,
    mdxJsxTextElement: collect,
    after() {
      const mdxFile = relative(process.cwd(), mdxPath);
      const problems = validateSeriesIndex({
        mdxFile,
        uses,
        images: listFiles(join(seriesDir, SERIES_IMAGES)),
        frontmatter,
        frontmatterLines: frontmatterKeyLines(readFileSync(mdxPath, "utf8")),
      });
      if (problems.length > 0) throw new TutorialValidationError(problems, mdxFile);
    },
  });
}

/** Astro parses the frontmatter before the MDX compile and seeds it as `ctx.data.astro.frontmatter`. */
function frontmatterOf(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const astro = data.astro;
  if (typeof astro !== "object" || astro === null) return {};
  const frontmatter = (astro as { frontmatter?: unknown }).frontmatter;
  return typeof frontmatter === "object" && frontmatter !== null ? (frontmatter as Record<string, unknown>) : {};
}

/**
 * Satteri mdast plugin: checks each tutorial's frontmatter and component references against its
 * `code/`, `images/`, `output/` and `requests/`; `warn` gets problems that do not fail the build.
 */
export function tutorialValidation(
  tutorialDirs: string | readonly string[],
  warn: (message: string) => void = console.warn,
  seriesDir?: string,
): MdastPluginEntry {
  const dirs = typeof tutorialDirs === "string" ? [tutorialDirs] : tutorialDirs;
  return (ctx) => {
    if (!ctx.fileURL) return null;
    const mdxPath = fileURLToPath(ctx.fileURL);
    if (seriesDir !== undefined && mdxPath === join(seriesDir, SERIES_INDEX)) return seriesIndexValidation(ctx.data, mdxPath, seriesDir);
    const tutorialDir = dirs.find((dir) => join(dir, "tutorial.mdx") === mdxPath);
    if (tutorialDir === undefined) return null;
    const tutorial = readTutorialFiles(tutorialDir);
    const frontmatter = frontmatterOf(ctx.data);

    const { uses, collect } = componentCollector((name) => COMPONENTS.has(name));

    return defineMdastPlugin({
      name: "interactive-code-scroll:validate",
      options: { position: true },
      mdxJsxFlowElement: collect,
      mdxJsxTextElement: collect,
      after() {
        const mdxFile = relative(process.cwd(), tutorial.mdxPath);
        const frontmatterLines = frontmatterKeyLines(readFileSync(tutorial.mdxPath, "utf8"));
        const problems = validateTutorial({
          mdxFile,
          uses,
          files: tutorial.files,
          binaries: tutorial.binaries,
          images: tutorial.images,
          outputs: tutorial.outputs,
          requests: tutorial.requests,
          requestBinaries: tutorial.requestBinaries,
          frontmatter,
          frontmatterLines,
        });
        if (problems.length > 0) throw new TutorialValidationError(problems, mdxFile);
        const sources = [...parsedFiles(tutorial.files).values(), ...tutorial.requests.map((f) => parseSource(f.source, `requests/${f.path}`))];
        const defaults = new Set(sources.flatMap((p) => p.vars.map((v) => v.defaultValue)));
        const texts = tutorial.outputs
          .filter(isTextOutput)
          .map((path) => ({ path, text: readFileSync(join(tutorial.outputDir, path), "utf8") }));
        for (const warning of credentialWarnings(texts, defaults)) warn(warning);
        if (seriesDir === undefined && frontmatter.family !== undefined) {
          warn(`${mdxFile}:${frontmatterLines.family ?? 1}:1 frontmatter "family" has no effect outside a series site`);
        }
      },
    });
  };
}
