/** A root-relative path as a public URL: absolute with Astro `site`, as is otherwise. */
export function publicUrl(path: string, site: string | undefined): string {
  return site === undefined ? path : new URL(path, site).href;
}
