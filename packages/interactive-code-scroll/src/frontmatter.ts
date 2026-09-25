export const PREVIEW_MODES = ["off", "iframe", "tab", "both"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

export interface TutorialConfig {
  title: string;
  preview: PreviewMode;
}

/** Validates tutorial.mdx frontmatter; defaults: preview `both`, title "Tutorial". */
export function readTutorialConfig(frontmatter: Record<string, unknown>): TutorialConfig {
  const { title = "Tutorial", preview = "both" } = frontmatter;
  if (typeof title !== "string") throw new Error('tutorial.mdx frontmatter: "title" must be a string');
  if (!PREVIEW_MODES.includes(preview as PreviewMode)) {
    throw new Error(`tutorial.mdx frontmatter: "preview" must be one of ${PREVIEW_MODES.join(", ")} (got ${JSON.stringify(preview)})`);
  }
  return { title, preview: preview as PreviewMode };
}
