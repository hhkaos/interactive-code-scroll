import { extensionOf } from "./file-types.ts";

/** How the Result pane renders a captured output. */
export type OutputKind = "json" | "text" | "image";

const KINDS: Record<string, OutputKind> = {
  json: "json",
  txt: "text",
  log: "text",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
};

/** Extensions a captured output may have, for error messages. */
export const OUTPUT_EXTENSIONS = Object.keys(KINDS);

/** `undefined` for a file type the Result pane cannot show. */
export function outputKind(path: string): OutputKind | undefined {
  return KINDS[extensionOf(path)];
}

/** Outputs read as text by the build (credential check); `.svg` is XML text shown as an image. */
export const isTextOutput = (path: string) => outputKind(path) !== "image" || extensionOf(path) === "svg";

/**
 * Path (relative to `output/`) a step's `output=` resolves to: the variant's override
 * `output/<variant>/<name>` first, then `output/<name>`.
 */
export function resolveOutput(name: string, outputs: readonly string[], variant?: string): string | undefined {
  if (variant !== undefined && outputs.includes(`${variant}/${name}`)) return `${variant}/${name}`;
  return outputs.includes(name) ? name : undefined;
}

const CREDENTIAL = /(token=|"token"\s*:\s*"?|apiKey["']?\s*[:=]\s*["']?|Authorization:\s*Bearer\s+)([^\s"'&,}<>]+)/gi;

/**
 * Captured outputs are committed and published: warn when one looks like it holds a real
 * credential (a value that is not a var default, i.e. not the demo value shown in the code).
 */
export function credentialWarnings(outputs: readonly { path: string; text: string }[], varDefaults: ReadonlySet<string>): string[] {
  const warnings: string[] = [];
  for (const { path, text } of outputs) {
    for (const [index, line] of text.split("\n").entries()) {
      for (const match of line.matchAll(CREDENTIAL)) {
        const value = match[2]!;
        if (varDefaults.has(value) || value.startsWith("{{")) continue;
        // Name the key, never the value: build logs may be public.
        const key = match[1]!.replace(/["'\s]/g, "").replace(/[:=]$/, "");
        warnings.push(`output/${path}:${index + 1} looks like it contains a credential (${key}); replace it with the var's default before publishing`);
      }
    }
  }
  return warnings;
}
