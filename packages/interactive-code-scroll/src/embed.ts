/** A step's `embed=`: an external page, or a page published from the tutorial's `embeds/`. */
export type Embed =
  | { kind: "remote"; url: string }
  /** `path` is relative to `embeds/` (a folder ends with `/`); `suffix` keeps the `?query#fragment`. */
  | { kind: "local"; path: string; suffix: string };

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Resolves `embed=` against the files under `embeds/`. A folder (with or without a trailing
 * slash) opens its `index.html`; its URL always ends with `/` so the page's relative assets
 * resolve. Returns an error message for anything else.
 */
export function resolveEmbed(value: string, embeds: readonly string[]): Embed | { error: string } {
  if (/^https:\/\//i.test(value)) {
    return URL.canParse(value) ? { kind: "remote", url: value } : { error: `embed "${value}" is not a valid URL` };
  }
  const outside = { error: `embed "${value}" must be an https:// URL or a path in embeds/` };
  if (SCHEME.test(value) || value.startsWith("/") || value.includes("\\")) return outside;
  const cut = value.search(/[?#]/);
  const path = cut < 0 ? value : value.slice(0, cut);
  const suffix = cut < 0 ? "" : value.slice(cut);
  const segments = path.replace(/\/$/, "").split("/");
  if (path === "" || segments.some((s) => s === "" || s === "." || s === "..")) return outside;
  if (!path.endsWith("/") && embeds.includes(path)) return { kind: "local", path, suffix };
  const folder = path.replace(/\/?$/, "/");
  if (embeds.includes(`${folder}index.html`)) return { kind: "local", path: folder, suffix };
  return { error: `embed "${value}" not found in embeds/ (a folder needs an index.html)` };
}

/** URL the iframe loads; `tutorialBase` is the tutorial's URL prefix (ends with `/`). */
export function embedUrl(embed: Embed, tutorialBase: string): string {
  if (embed.kind === "remote") return embed.url;
  return `${tutorialBase}embeds/${embed.path.split("/").map(encodeURIComponent).join("/")}${embed.suffix}`;
}
