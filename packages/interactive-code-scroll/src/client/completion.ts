/**
 * Closing panel (shown by "Finish", see steps.ts): the <Outro> content goes between its heading and
 * its actions, and its ZIP / Preview buttons do what the code panel's do (active variant, form values).
 */
export function startCompletion(): void {
  const panel = document.querySelector<HTMLElement>(".completion");
  if (!panel) return;
  const outro = document.querySelector<HTMLElement>(".outro");
  if (outro) {
    panel.querySelector(".completion-outro")!.append(outro);
    outro.hidden = false;
  }
  const forward = (from: string, to: string) =>
    panel.querySelector(from)?.addEventListener("click", () => document.querySelector<HTMLElement>(to)?.click());
  forward("#completion-zip", "#download-zip");
  forward("#completion-preview", "#preview-open");
}
