import type { MDXContent } from "astro";
import type { SourceFile } from "./tutorial-files.ts";

/** One tutorial as the virtual module exposes it to the injected pages. */
export interface TutorialData {
  /** URL segment in a series site; `""` for a single-tutorial site at `/`. */
  slug: string;
  Content: MDXContent;
  frontmatter: Record<string, unknown>;
  files: SourceFile[];
  /** Binary files under `code/`, relative to it. */
  binaries: string[];
  /** Absolute path of the tutorial's `code/` folder (build time only). */
  codeDir: string;
  /** Captured outputs, relative to `output/`. */
  outputs: string[];
  /** Absolute path of the tutorial's `output/` folder (build time only). */
  outputDir: string;
  /** Text files under `requests/`, relative to it (binaries there are validation errors). */
  requests: SourceFile[];
  /** Image path (relative to `images/`) → public URL. */
  images: Record<string, string>;
}

const KEY = "interactiveCodeScrollTutorial";

/**
 * The tutorial page stores its tutorial in `Astro.locals` before rendering the MDX, so the
 * MDX components (`<Step>`, `<VarField>`) read the tutorial they belong to.
 */
export function setCurrentTutorial(locals: object, tutorial: TutorialData): void {
  (locals as Record<string, unknown>)[KEY] = tutorial;
}

export function currentTutorial(locals: object): TutorialData {
  const tutorial = (locals as Record<string, unknown>)[KEY] as TutorialData | undefined;
  if (!tutorial) throw new Error("interactive-code-scroll: tutorial components must render inside a tutorial page");
  return tutorial;
}

/** Tutorial of a route: `/<slug>/` in a series, the only one otherwise. */
export function tutorialFor(tutorials: readonly TutorialData[], slug: string | undefined): TutorialData {
  const tutorial = tutorials.find((t) => t.slug === (slug ?? ""));
  if (!tutorial) throw new Error(`interactive-code-scroll: no tutorial "${slug}"`);
  return tutorial;
}

/** URL prefix of a tutorial's page, Preview and outputs (`<base>` or `<base><slug>/`). */
export function tutorialBase(base: string, slug: string): string {
  const root = base.replace(/\/?$/, "/");
  return slug === "" ? root : `${root}${slug}/`;
}
