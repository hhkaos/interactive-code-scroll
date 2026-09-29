import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineMdastPlugin, type MdastPluginEntry, type MdxJsxFlowElement, type MdxJsxTextElement } from "satteri";
import { frontmatterKeyLines } from "./frontmatter.ts";
import { parseSource } from "./markers.ts";
import { credentialWarnings, isTextOutput } from "./output.ts";
import { readTutorialFiles } from "./tutorial-files.ts";
import { validateTutorial, type AttributeValue, type ComponentUse } from "./validate.ts";
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

/** Astro parses the frontmatter before the MDX compile and seeds it as `ctx.data.astro.frontmatter`. */
function frontmatterOf(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const astro = data.astro;
  if (typeof astro !== "object" || astro === null) return {};
  const frontmatter = (astro as { frontmatter?: unknown }).frontmatter;
  return typeof frontmatter === "object" && frontmatter !== null ? (frontmatter as Record<string, unknown>) : {};
}

/**
 * Satteri mdast plugin: checks the frontmatter and component references against `code/`,
 * `images/`, `output/` and `requests/`; `warn` gets problems that do not fail the build.
 */
export function tutorialValidation(tutorialDir: string, warn: (message: string) => void = console.warn): MdastPluginEntry {
  return (ctx) => {
    const tutorial = readTutorialFiles(tutorialDir);
    if (!ctx.fileURL || fileURLToPath(ctx.fileURL) !== tutorial.mdxPath) return null;
    const frontmatter = frontmatterOf(ctx.data);

    const uses: ComponentUse[] = [];
    const collect = (node: Readonly<MdxJsxFlowElement | MdxJsxTextElement>) => {
      if (!node.name || !COMPONENTS.has(node.name)) return;
      const start = node.position?.start;
      uses.push({ name: node.name, attributes: attributesOf(node), line: start?.line ?? 0, column: start?.column ?? 0 });
    };

    return defineMdastPlugin({
      name: "interactive-code-scroll:validate",
      options: { position: true },
      mdxJsxFlowElement: collect,
      mdxJsxTextElement: collect,
      after() {
        const mdxFile = relative(process.cwd(), tutorial.mdxPath);
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
          frontmatterLines: frontmatterKeyLines(readFileSync(tutorial.mdxPath, "utf8")),
        });
        if (problems.length > 0) throw new TutorialValidationError(problems, mdxFile);
        const sources = [...parsedFiles(tutorial.files).values(), ...tutorial.requests.map((f) => parseSource(f.source, `requests/${f.path}`))];
        const defaults = new Set(sources.flatMap((p) => p.vars.map((v) => v.defaultValue)));
        const texts = tutorial.outputs
          .filter(isTextOutput)
          .map((path) => ({ path, text: readFileSync(join(tutorial.outputDir, path), "utf8") }));
        for (const warning of credentialWarnings(texts, defaults)) warn(warning);
      },
    });
  };
}
