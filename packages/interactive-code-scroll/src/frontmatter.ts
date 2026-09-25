export const PREVIEW_MODES = ["off", "iframe", "tab", "both"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

/** Code panel theme: fixed dark/light, or `auto` to follow the page's light/dark mode. */
export const CODE_THEMES = ["dark", "light", "auto"] as const;
export type CodeTheme = (typeof CODE_THEMES)[number];

export interface TutorialConfig {
  title: string;
  preview: PreviewMode;
  codeTheme: CodeTheme;
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[]): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`tutorial.mdx frontmatter: "${name}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`);
}

/** Validates tutorial.mdx frontmatter; defaults: title "Tutorial", preview `both`, codeTheme `dark`. */
export function readTutorialConfig(frontmatter: Record<string, unknown>): TutorialConfig {
  const { title = "Tutorial", preview = "both", codeTheme = "dark" } = frontmatter;
  if (typeof title !== "string") throw new Error('tutorial.mdx frontmatter: "title" must be a string');
  return {
    title,
    preview: oneOf("preview", preview, PREVIEW_MODES),
    codeTheme: oneOf("codeTheme", codeTheme, CODE_THEMES),
  };
}
