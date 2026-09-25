/** Fired on `document` when the image shown in the media panel changes (`detail`: the image, or null). */
export const MEDIA_EVENT = "ics:media-change";

type Dialog = HTMLElement & { open: boolean; heading: string };

/**
 * Clicking a carousel image opens it in a full-screen dialog. While open, step keys keep
 * paging the carousel and the dialog follows; leaving the step's images closes it.
 */
export function startImageViewer(): void {
  const dialog = document.querySelector<Dialog>("#image-viewer");
  const viewed = dialog?.querySelector("img");
  const media = document.querySelector<HTMLElement>(".media-panel");
  if (!dialog || !viewed || !media) return;

  const show = (image: HTMLImageElement) => {
    const items = [...media.querySelectorAll(".step-image")];
    viewed.src = image.src;
    viewed.alt = image.alt;
    dialog.heading = items.length > 1 ? `${image.alt} (${items.indexOf(image) + 1} of ${items.length})` : image.alt;
  };

  media.addEventListener("click", (event) => {
    const image = (event.target as Element).closest<HTMLImageElement>(".step-image");
    if (!image) return;
    show(image);
    dialog.open = true;
  });

  // Also here: the dialog only sees Esc while focus is inside it.
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) dialog.open = false;
  });

  document.addEventListener(MEDIA_EVENT, (event) => {
    if (!dialog.open) return;
    const image = (event as CustomEvent<HTMLImageElement | null>).detail;
    if (image) show(image);
    else dialog.open = false;
  });
}
