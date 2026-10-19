import { mdxToMdast } from "satteri";
import type { MarkdownPart } from "./llm-markdown.ts";
import type { AttributeValue } from "./validate.ts";

interface Node {
  type: string;
  name?: string | null;
  value?: string;
  attributes?: { type: string; name?: string; value?: string | { value: string } | null }[];
  children?: Node[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

const COMPONENTS = new Set(["Step", "Intro", "Outro", "VarField", "Hint"]);
const SKIPPED = new Set(["yaml", "toml", "mdxjsEsm"]);
const EXPRESSIONS = new Set(["mdxFlowExpression", "mdxTextExpression"]);
const COMMENT = /^\s*\/\*[\s\S]*\*\/\s*$/;

/**
 * Splits `tutorial.mdx` into text and components; frontmatter, imports and `{/* comments *\/}` are left out. Runs at MDX compile time:
 * the parser is a native module that a prerender bundle cannot load.
 */
export function markdownParts(mdx: string): MarkdownPart[] {
  const tree = mdxToMdast(mdx, { position: true }) as unknown as Node;
  const span = (node: Node) => ({ from: node.position?.start.offset ?? 0, to: node.position?.end.offset ?? 0 });

  /** Text from `start` to `end` with the components (and dropped nodes) among `nodes` split out. */
  const between = (start: number, end: number, nodes: readonly Node[]): MarkdownPart[] => {
    const out: MarkdownPart[] = [];
    let at = start;
    for (const node of nodes.flatMap(special)) {
      const { from, to } = span(node);
      out.push(mdx.slice(at, from));
      const part = componentPart(node);
      if (part !== undefined) out.push(part);
      at = to;
    }
    out.push(mdx.slice(at, end));
    return out.filter((part) => part !== "");
  };
  const componentPart = (node: Node): MarkdownPart | undefined => {
    if (SKIPPED.has(node.type)) return undefined;
    if (EXPRESSIONS.has(node.type)) return COMMENT.test(node.value ?? "") ? undefined : mdx.slice(span(node).from, span(node).to);
    const children = node.children ?? [];
    return {
      name: node.name!,
      attributes: jsxAttributes(node),
      children: children.length === 0 ? [] : between(span(children[0]!).from, span(children.at(-1)!).to, children),
    };
  };
  const root = tree.children ?? [];
  return between(0, mdx.length, root);
}

/** Outermost nodes in `node` (itself included) that are not kept as text. */
function special(node: Node): Node[] {
  const component = (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && COMPONENTS.has(node.name ?? "");
  if (component || SKIPPED.has(node.type) || EXPRESSIONS.has(node.type)) return [node];
  return (node.children ?? []).flatMap(special);
}

/** A JSX element's attributes: strings, `true` for a bare name, `{ expression }` for `{…}`. */
export function jsxAttributes(node: Pick<Node, "attributes">): Record<string, AttributeValue> {
  const out: Record<string, AttributeValue> = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute" || attr.name === undefined) continue;
    const { value } = attr;
    out[attr.name] = value == null ? true : typeof value === "string" ? value : { expression: value.value };
  }
  return out;
}
