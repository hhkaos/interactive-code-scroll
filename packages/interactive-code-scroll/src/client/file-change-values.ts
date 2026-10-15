/**
 * Which steps switch the code panel to another file, in reading order.
 * `files[i]` is the file step `i` shows (`undefined`: text-only, media, or for other variants:
 * the code panel keeps its file). `start` is the file shown before the first step.
 * Returns, per step, the file it switches to, or `undefined` when it keeps the current one.
 */
export function fileChanges(files: readonly (string | undefined)[], start: string | undefined): (string | undefined)[] {
  let shown = start;
  return files.map((file) => {
    if (file === undefined || file === shown) return undefined;
    shown = file;
    return file;
  });
}
