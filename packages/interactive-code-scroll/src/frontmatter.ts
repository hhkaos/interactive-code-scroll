export const PREVIEW_MODES = ["off", "iframe", "tab", "both"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

/** The tutorial's default mode; `auto` follows the OS. The viewer's toggle always wins. */
export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export interface TutorialConfig {
  title: string;
  preview: PreviewMode;
  theme: Theme;
  /** Image in `images/` shown in the header and used as favicon. */
  logo?: string;
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[]): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`tutorial.mdx frontmatter: "${name}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`);
}

/** Validates tutorial.mdx frontmatter; defaults: title "Tutorial", preview `both`, theme `auto`. */
export function readTutorialConfig(frontmatter: Record<string, unknown>): TutorialConfig {
  const { title = "Tutorial", preview = "both", theme = "auto", logo } = frontmatter;
  if (typeof title !== "string") throw new Error('tutorial.mdx frontmatter: "title" must be a string');
  if (logo !== undefined && typeof logo !== "string") throw new Error('tutorial.mdx frontmatter: "logo" must be a string');
  return {
    title,
    preview: oneOf("preview", preview, PREVIEW_MODES),
    theme: oneOf("theme", theme, THEMES),
    ...(logo === undefined ? {} : { logo }),
  };
}
