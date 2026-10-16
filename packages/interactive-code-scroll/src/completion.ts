/** A tutorial as the closing panel's "next tutorial" rules see it (series index order). */
export interface CompletionMember {
  slug: string;
  title: string;
  /** Frontmatter `next`: a slug, `false` for none, absent for the next one in order. */
  next?: string | false;
}

/**
 * The tutorial suggested after `slug`: its `next`, else the one after it in `ordered` (the series
 * index order, see `sortCards`); none with `next: false` or after the last one.
 */
export function nextTutorial<T extends CompletionMember>(ordered: readonly T[], slug: string): T | undefined {
  const index = ordered.findIndex((m) => m.slug === slug);
  const current = ordered[index];
  if (!current || current.next === false) return undefined;
  if (current.next !== undefined) return ordered.find((m) => m.slug === current.next);
  return ordered[index + 1];
}

/** Build errors for `next`: a slug that is not in the series, or the tutorial itself. */
export function nextProblems(members: readonly CompletionMember[]): string[] {
  const slugs = new Set(members.map((m) => m.slug));
  return members.flatMap(({ slug, next }) => {
    if (typeof next !== "string") return [];
    if (next === slug) return [`tutorials/${slug}: "next" points at the tutorial itself`];
    if (!slugs.has(next)) return [`tutorials/${slug}: "next" tutorial "${next}" is not in the series`];
    return [];
  });
}

/** `feedbackUrl` with `{slug}` and `{title}` filled in (URL-encoded). */
export function feedbackHref(template: string, { slug, title }: { slug: string; title: string }): string {
  return template.replaceAll("{slug}", encodeURIComponent(slug)).replaceAll("{title}", encodeURIComponent(title));
}
