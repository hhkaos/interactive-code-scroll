/**
 * URL of a sibling tutorial: same step (`#hash`; the sibling falls back to its top without it), and
 * the active variant only when the sibling has it (else it picks its own variant as usual).
 */
export function siblingUrl(href: string, base: string, hash: string, variant: string | undefined, siblingVariants: readonly string[]): string {
  const url = new URL(href, base);
  if (variant !== undefined && siblingVariants.includes(variant)) url.searchParams.set("variant", variant);
  url.hash = hash;
  return url.href;
}
