/** File extension, lowercase, without the dot ("" when there is none; dotfiles have none). */
export function extensionOf(path: string): string {
  const name = path.split("/").pop()!;
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}
