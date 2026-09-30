/// <reference types="astro/client" />
declare module "virtual:interactive-code-scroll/tutorial" {
  /** True when the site publishes several tutorials, each under `/<slug>/`. */
  export const series: boolean;
  /** Every tutorial of the site (one, with slug `""`, for a single-tutorial site). */
  export const tutorials: import("./tutorial-data.ts").TutorialData[];
  /** A series' optional `index.mdx`. */
  export const seriesIndex: { Content: import("astro").MDXContent; frontmatter: Record<string, unknown> } | undefined;
  /** Image path (relative to the series folder's `images/`) → public URL. */
  export const seriesImages: Record<string, string>;
}
// Plain tsc (package build, `pnpm check`) cannot read `.astro` files; Astro's tooling resolves them first.
declare module "*.astro" {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}
