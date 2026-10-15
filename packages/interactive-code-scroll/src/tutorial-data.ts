import type { MDXContent } from "astro";
import { logoUrl, readTutorialConfig, type TagGroup } from "./frontmatter.ts";
import { cardTags, familyOf, familyProblems, sortCards, tagFor, tagLogos, type FamilyMember, type SeriesCard } from "./series.ts";
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
  /** Files under `embeds/`, relative to it. */
  embeds: string[];
  /** Absolute path of the tutorial's `embeds/` folder (build time only). */
  embedsDir: string;
  /** Text files under `requests/`, relative to it (binaries there are validation errors). */
  requests: SourceFile[];
  /** JSON option lists under `field-options/`, relative to it. */
  fieldOptions: SourceFile[];
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

/** URL prefix of a tutorial's page, Preview, outputs and embeds (`<base>` or `<base><slug>/`). */
export function tutorialBase(base: string, slug: string): string {
  const root = base.replace(/\/?$/, "/");
  return slug === "" ? root : `${root}${slug}/`;
}

/**
 * Index cards of a series, in index order (frontmatter was validated at MDX compile time). `groups`
 * (`tagGroups`) set the tags' spelling and their logos, resolved in the series folder's `images/`.
 */
export function seriesCards(
  tutorials: readonly TutorialData[],
  base: string,
  groups: readonly TagGroup[] = [],
  groupImages: Readonly<Record<string, string>> = {},
): SeriesCard[] {
  const groupTags = groups.flatMap((group) => group.tags);
  const groupLogos = new Map(
    groups.flatMap((group) =>
      Object.entries(group.logos ?? {}).flatMap(([tag, logo]) => {
        const src = logoUrl(logo, groupImages);
        return src === undefined ? [] : [[tag, src] as const];
      }),
    ),
  );
  return sortCards(
    tutorials.map(({ slug, frontmatter, images }) => {
      const config = readTutorialConfig(frontmatter);
      const { title, description, level, duration, order } = config;
      const variants = config.variants ?? [];
      const tags = cardTags(config.tags, variants.map((v) => v.label), groupTags);
      const variantLogos = variants.flatMap((v) => {
        const src = logoUrl(v.logo, images);
        return src === undefined ? [] : [{ label: v.label, src }];
      });
      const logos = tagLogos(tags, groupLogos, variantLogos);
      const href = tutorialBase(base, slug);
      // One variant is no choice: its label stays a tag.
      const links =
        variants.length < 2
          ? []
          : variants.map(({ id, label }) => {
              // Every label is a card tag, so its logo is the tag's (tagGroups first, else the variant's own).
              const src = logos[tagFor(label, tags) ?? label];
              return { id, label, href: `${href}?variant=${encodeURIComponent(id)}`, ...(src === undefined ? {} : { logo: src }) };
            });
      const logo = logoUrl(config.logo, images);
      return {
        slug,
        href,
        title,
        tags,
        ...(description === undefined ? {} : { description }),
        ...(level === undefined ? {} : { level }),
        ...(duration === undefined ? {} : { duration }),
        ...(order === undefined ? {} : { order }),
        ...(logo === undefined ? {} : { logo }),
        ...(Object.keys(logos).length === 0 ? {} : { tagLogos: logos }),
        ...(links.length === 0 ? {} : { variants: links }),
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
