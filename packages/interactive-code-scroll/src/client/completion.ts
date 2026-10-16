/**
 * Closing panel (shown by "Finish", see steps.ts): the <Outro> content goes between its heading and
 * its actions, and its ZIP / Preview buttons do what the code panel's do (active variant, form values).
 * In presentation mode it is a full-screen closing slide.
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

  // Presentation mode: the panel becomes a full-screen closing slide. It moves out of the explanations,
  // which presentation may hide (a fixed element inside `display: none` is not painted).
  const docs = panel.parentElement!;
  const body = document.body;
  const sync = () => {
    // Drawn when presentation starts, so the slide opens with it in place.
    if (body.hasAttribute("data-presenting")) void drawQr(panel);
    const slide = body.hasAttribute("data-presenting") && body.hasAttribute("data-completed");
    if (slide === panel.hasAttribute("data-slide")) return;
    // Moving an element blurs it. The slide takes the focus ("Finish" could not focus the heading while the
    // explanations were hidden); back in the explanations, the heading keeps it.
    const focused = panel.contains(document.activeElement);
    (slide ? body : docs).append(panel);
    panel.toggleAttribute("data-slide", slide);
    if (slide || focused) panel.querySelector<HTMLElement>("#completion-heading")?.focus({ preventScroll: true });
    // Leaving presentation on the slide (Esc): the reader stays on the panel.
    if (!slide && body.hasAttribute("data-completed")) panel.scrollIntoView({ block: "nearest" });
  };
  new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ["data-presenting", "data-completed"] });
}

/** The QR code being drawn: one encoder load at a time. */
let drawing: Promise<void> | undefined;

/**
 * The slide's QR code and link: the build's public URL (`data-url`), else this page without its hash.
 * A failed encoder load (e.g. a dev server that re-optimized its dependencies) is logged and hides the
 * empty box: the slide keeps the URL. Browsers keep a failed module load until the page reloads.
 */
async function drawQr(panel: HTMLElement): Promise<void> {
  const share = panel.querySelector<HTMLElement>(".completion-share");
  const box = share?.querySelector<HTMLElement>(".completion-qr");
  if (!share || !box || box.hasAttribute("data-drawn") || drawing) return;
  const url = share.dataset.url ?? `${location.origin}${location.pathname}`;
  const link = share.querySelector<HTMLAnchorElement>(".completion-share-url")!;
  link.href = url;
  link.textContent = url.replace(/^https?:\/\//, "");
  // Only presenters reach the slide: the encoder loads in presentation mode, not with the page.
  drawing = import("qrcode-generator")
    .then(({ default: qrcode }) => {
      const qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      // Generated markup (modules only, no text from the URL).
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      box.toggleAttribute("data-drawn", true);
    })
    .catch((error: unknown) => {
      box.hidden = true;
      console.error("InteractiveCodeScroll: the QR code could not be drawn; reload the page to try again.", error);
    })
    .finally(() => {
      drawing = undefined;
    });
  await drawing;
}
