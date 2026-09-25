import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineMdastPlugin, type MdastPluginEntry, type MdxJsxFlowElement, type MdxJsxTextElement } from "satteri";
import { readTutorialFiles } from "./tutorial-files.ts";
import { validateTutorial, type AttributeValue, type ComponentUse } from "./validate.ts";

const COMPONENTS = new Set(["Step", "VarField"]);

export class TutorialValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`Tutorial has ${problems.length} broken reference(s):\n  ${problems.join("\n  ")}`);
    this.name = "TutorialValidationError";
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

/** Satteri mdast plugin: checks `<Step>` / `<VarField>` references against `code/` and `images/`. */
export function tutorialValidation(tutorialDir: string): MdastPluginEntry {
  return (ctx) => {
    const tutorial = readTutorialFiles(tutorialDir);
    if (!ctx.fileURL || fileURLToPath(ctx.fileURL) !== tutorial.mdxPath) return null;

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
        const problems = validateTutorial({
          mdxFile: relative(process.cwd(), tutorial.mdxPath),
          uses,
          files: tutorial.files,
          images: tutorial.images,
        });
        if (problems.length > 0) throw new TutorialValidationError(problems);
      },
    });
  };
}
