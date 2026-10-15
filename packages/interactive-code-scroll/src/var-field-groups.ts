import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineMdastPlugin, type MdastPluginEntry } from "satteri";

/** Class of the block that lays out a run of consecutive `<VarField>`s in columns. */
export const VAR_FIELDS_CLASS = "var-fields";

const isVarField = (node: unknown) =>
  (node as { type?: string; name?: string } | undefined)?.type === "mdxJsxFlowElement" && (node as { name?: string }).name === "VarField";

/**
 * Wraps each run of consecutive `<VarField>`s of a tutorial in a `div.var-fields`, which the
 * page lays out as a grid: as many columns as the explanations panel fits. CSS alone cannot
 * group siblings, and a grid on the step itself would stop its prose margins from collapsing.
 */
export function varFieldGroups(tutorialDirs: readonly string[]): MdastPluginEntry {
  const mdxPaths = new Set(tutorialDirs.map((dir) => join(dir, "tutorial.mdx")));
  return (ctx) => {
    if (!ctx.fileURL || !mdxPaths.has(fileURLToPath(ctx.fileURL))) return null;
    return defineMdastPlugin({
      name: "interactive-code-scroll:var-field-groups",
      mdxJsxFlowElement(node, ctx) {
        if (!isVarField(node)) return;
        const siblings = ctx.parent(node)?.children ?? [];
        const index = ctx.indexOf(node) ?? -1;
        // The first field of a run wraps the whole run.
        if (index < 0 || isVarField(siblings[index - 1])) return;
        let end = index + 1;
        while (isVarField(siblings[end])) end++;
        const run = siblings.slice(index, end);
        for (const field of run.slice(1)) ctx.removeNode(field);
        ctx.replaceNode(node, {
          type: "varFields",
          data: { hName: "div", hProperties: { className: [VAR_FIELDS_CLASS] } },
          children: run.map((field) => JSON.parse(JSON.stringify(field))),
        });
      },
    });
  };
}
