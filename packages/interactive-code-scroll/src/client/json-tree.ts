import {
  entries,
  isContainer,
  literal,
  nextShown,
  startsExpanded,
  summary,
  treeKey,
  type JsonContainer,
  type JsonValue,
} from "./json-tree-values.ts";

const ITEM = '[role="treeitem"]';

function token(className: string, text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

/** Caret column (the glyph comes from CSS per aria-expanded); also aligns leaves and closing rows. */
function spacer(): HTMLSpanElement {
  const caret = token("jt-caret", "");
  caret.setAttribute("aria-hidden", "true");
  return caret;
}

function row(...children: Node[]): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "jt-row";
  div.append(...children);
  return div;
}

/** A leading `"key": ` (objects) or nothing (array items). */
function label(key: string | undefined): Node[] {
  return key === undefined ? [] : [token("jt-key", JSON.stringify(key)), token("jt-p", ": ")];
}

function item(depth: number, key: string | undefined, value: JsonValue, last: boolean): HTMLLIElement {
  const li = document.createElement("li");
  li.setAttribute("role", "treeitem");
  li.setAttribute("aria-level", String(depth + 1));
  li.tabIndex = -1;
  const comma = last ? [] : [token("jt-p", ",")];
  const caret = spacer();

  if (!isContainer(value)) {
    const kind = typeof value === "string" ? "jt-str" : typeof value === "boolean" || value === null ? "jt-lit" : "jt-num";
    li.append(row(caret, ...label(key), token(kind, literal(value)), ...comma));
    return li;
  }
  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  const count = entries(value).length;
  if (count === 0) {
    li.append(row(caret, ...label(key), token("jt-p", `${open} ${close}`), ...comma));
    return li;
  }
  // Both headers exist; CSS shows one per aria-expanded. Children are built on first expand.
  li.append(
    row(
      caret,
      ...label(key),
      token("jt-p jt-when-open", open),
      token("jt-p jt-when-closed", `${open} … ${close}`),
      ...(last ? [] : [token("jt-p jt-when-closed", ",")]),
      token("jt-dim jt-when-closed", summary(value)),
    ),
  );
  li.dataset.close = close + (last ? "" : ",");
  setExpanded(li, value, depth, startsExpanded(depth));
  return li;
}

const containers = new WeakMap<HTMLLIElement, { value: JsonContainer; depth: number }>();

function setExpanded(li: HTMLLIElement, value: JsonContainer, depth: number, expanded: boolean): void {
  containers.set(li, { value, depth });
  li.setAttribute("aria-expanded", String(expanded));
  if (expanded && !li.querySelector(':scope > [role="group"]')) buildChildren(li, value, depth);
}

function buildChildren(li: HTMLLIElement, value: JsonContainer, depth: number): void {
  const all = entries(value);
  const group = document.createElement("ul");
  group.setAttribute("role", "group");
  let shown = 0;
  const page = () => {
    const end = nextShown(all.length, shown);
    const items = all.slice(shown, end).map(([key, child], i) => item(depth + 1, key, child, shown + i === all.length - 1));
    shown = end;
    return items;
  };
  group.append(...page());
  if (shown < all.length) {
    const more = document.createElement("li");
    more.setAttribute("role", "none");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jt-more";
    button.textContent = `Show more (${all.length - shown} remaining)`;
    button.addEventListener("click", () => {
      const items = page();
      more.before(...items);
      if (shown < all.length) button.textContent = `Show more (${all.length - shown} remaining)`;
      else more.remove();
      focusItem(items[0]!);
    });
    more.append(button);
    group.append(more);
  }
  li.append(group, row(spacer(), token("jt-p", li.dataset.close!)));
}

function focusItem(li: HTMLElement): void {
  const tree = li.closest('[role="tree"]');
  tree?.querySelector<HTMLElement>(`${ITEM}[tabindex="0"]`)?.setAttribute("tabindex", "-1");
  li.tabIndex = 0;
  li.focus();
}

/** Items not hidden inside a collapsed container, in document order. */
function visibleItems(tree: HTMLElement): HTMLElement[] {
  return [...tree.querySelectorAll<HTMLElement>(ITEM)].filter(
    (li) => !li.parentElement!.closest('[aria-expanded="false"]'),
  );
}

function toggle(li: HTMLLIElement, expanded: boolean): void {
  const container = containers.get(li);
  if (container) setExpanded(li, container.value, container.depth, expanded);
}

/**
 * Collapsible, keyboard-navigable tree for untrusted JSON: every value is a text node, never HTML.
 * Containers deeper than `EXPANDED_DEPTH` start collapsed; long ones show `PAGE` entries at a time
 * (see json-tree-values.ts).
 */
export function renderJsonTree(value: JsonValue, ariaLabel: string): HTMLUListElement {
  const tree = document.createElement("ul");
  tree.className = "json-tree";
  tree.setAttribute("role", "tree");
  tree.setAttribute("aria-label", ariaLabel);
  // Arrow keys move in the tree, not between steps.
  tree.dataset.ownKeys = "";
  const root = item(0, undefined, value, true);
  root.tabIndex = 0;
  tree.append(root);

  tree.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest("button") || getSelection()?.toString()) return;
    const li = target.closest<HTMLLIElement>(".jt-row")?.parentElement;
    if (!li || li.getAttribute("role") !== "treeitem") return;
    if (li.hasAttribute("aria-expanded")) toggle(li as HTMLLIElement, li.getAttribute("aria-expanded") !== "true");
    focusItem(li);
  });

  tree.addEventListener("keydown", (event) => {
    const li = event.target as HTMLLIElement;
    if (li.getAttribute?.("role") !== "treeitem" || event.altKey || event.ctrlKey || event.metaKey) return;
    const expandable = li.hasAttribute("aria-expanded");
    const expanded = li.getAttribute("aria-expanded") === "true";
    const action = treeKey(event.key, { expandable, expanded });
    if (action === "none") return;
    event.preventDefault();
    const items = visibleItems(tree);
    const index = items.indexOf(li);
    const go = (target: HTMLElement | null | undefined) => target && focusItem(target);
    switch (action) {
      case "next":
        return go(items[index + 1]);
      case "prev":
        return go(items[index - 1]);
      case "first":
        return go(items[0]);
      case "last":
        return go(items.at(-1));
      case "expand":
        return toggle(li, true);
      case "collapse":
        return toggle(li, false);
      case "toggle":
        return toggle(li, !expanded);
      case "child":
        return go(li.querySelector<HTMLElement>(`:scope > [role="group"] > ${ITEM}`));
      case "parent":
        return go(li.parentElement?.closest<HTMLElement>(ITEM));
    }
  });
  return tree;
}
