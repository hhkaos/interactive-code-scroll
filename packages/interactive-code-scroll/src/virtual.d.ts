/// <reference types="astro/client" />
declare module "virtual:interactive-code-scroll/tutorial" {
  export const Content: import("astro").MDXContent;
  export const frontmatter: Record<string, unknown>;
  export const files: import("./tutorial-files.ts").SourceFile[];
  /** Image path (relative to `images/`) → public URL. */
  export const images: Record<string, string>;
}
