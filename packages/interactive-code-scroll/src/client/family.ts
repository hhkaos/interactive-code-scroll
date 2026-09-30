import { siblingUrl } from "./family-values.ts";
import type { VariantsHandle } from "./variants.ts";

export interface SiblingInfo {
  slug: string;
  href: string;
  variants: string[];
}

/**
 * Sibling tutorials (same `family`) are plain links in the header menu; when it opens, each `href` gains the
 * current step and, when the sibling has it, the active variant.
 */
export function startFamily(siblings: readonly SiblingInfo[], variants: VariantsHandle | undefined): void {
  const bySlug = new Map(siblings.map((s) => [s.slug, s]));
  const refresh = (link: HTMLElement & { href: string }) => {
    const sibling = bySlug.get(link.dataset.tutorial ?? "");
    if (sibling) link.href = siblingUrl(sibling.href, location.href, location.hash, variants?.active().id, sibling.variants);
  };

  const dropdown = document.querySelector<HTMLElement>("#family-dropdown");
  dropdown?.addEventListener("calciteDropdownBeforeOpen", () => {
    for (const item of dropdown.querySelectorAll<HTMLElement & { href: string }>("calcite-dropdown-item[data-tutorial]")) refresh(item);
  });
}
