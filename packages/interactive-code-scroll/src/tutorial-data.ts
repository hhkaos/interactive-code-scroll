import type { MDXContent } from "astro";
import { readTutorialConfig } from "./frontmatter.ts";
import { familyOf, familyProblems, sortCards, type FamilyMember, type SeriesCard } from "./series.ts";
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

/** Index cards of a series, in index order (frontmatter was validated at MDX compile time). */
export function seriesCards(tutorials: readonly TutorialData[], base: string): SeriesCard[] {
  return sortCards(
    tutorials.map(({ slug, frontmatter }) => {
      const { title, description, tags, level, duration, order } = readTutorialConfig(frontmatter);
      return {
        slug,
        href: tutorialBase(base, slug),
        title,
        tags,
        ...(description === undefined ? {} : { description }),
        ...(level === undefined ? {} : { level }),
        ...(duration === undefined ? {} : { duration }),
        ...(order === undefined ? {} : { order }),
      };
    }),
  );
}

/** A tutorial of the current one's family, as the header's language switcher lists it. */
export interface Sibling {
  slug: string;
  label: string;
  href: string;
  /** Variant ids of the sibling: the active variant carries over only when it has it. */
  variants: string[];
  current: boolean;
}

function familyMembers(tutorials: readonly TutorialData[]): (FamilyMember & { variants: string[] })[] {
  return tutorials.map(({ slug, frontmatter }) => {
    const { family, order, variants } = readTutorialConfig(frontmatter);
    return { slug, variants: variants?.map((v) => v.id) ?? [], ...(family && { family }), ...(order === undefined ? {} : { order }) };
  });
}

const warned = new Set<string>();

/** Cross-tutorial family rules (per-tutorial ones run at MDX compile time); each warning is logged once. */
export function checkFamilies(tutorials: readonly TutorialData[], warn: (message: string) => void = console.warn): void {
  const { errors, warnings } = familyProblems(familyMembers(tutorials));
  for (const warning of warnings) {
    if (warned.has(warning)) continue;
    warned.add(warning);
    warn(warning);
  }
  if (errors.length > 0) throw new Error(`interactive-code-scroll: sibling tutorials:\n  ${errors.join("\n  ")}`);
}

/** The switcher's entries for `slug` (itself included); empty when it has no sibling on the site. */
export function siblingsOf(tutorials: readonly TutorialData[], slug: string, base: string): Sibling[] {
  return familyOf(familyMembers(tutorials), slug).map((m) => ({
    slug: m.slug,
    label: m.family!.label,
    href: tutorialBase(base, m.slug),
    variants: m.variants,
    current: m.slug === slug,
  }));
}
