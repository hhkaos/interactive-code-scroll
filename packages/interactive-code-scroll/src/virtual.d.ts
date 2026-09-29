/// <reference types="astro/client" />
declare module "virtual:interactive-code-scroll/tutorial" {
  export const Content: import("astro").MDXContent;
  export const frontmatter: Record<string, unknown>;
  export const files: import("./tutorial-files.ts").SourceFile[];
  /** Binary files under `code/`, relative to it. */
  export const binaries: string[];
  /** Absolute path of the tutorial's `code/` folder (build time only). */
  export const codeDir: string;
  /** Captured outputs, relative to `output/`. */
  export const outputs: string[];
  /** Absolute path of the tutorial's `output/` folder (build time only). */
  export const outputDir: string;
  /** Image path (relative to `images/`) → public URL. */
  export const images: Record<string, string>;
}
