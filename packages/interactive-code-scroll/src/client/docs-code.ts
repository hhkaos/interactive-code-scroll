/** Adds copy controls to fenced code blocks in the tutorial explanations. */
export function startDocsCodeBlocks(): void {
  for (const pre of document.querySelectorAll<HTMLPreElement>(".docs pre")) {
    if (pre.dataset.copyReady === "true") continue;
    const code = pre.querySelector("code");
    if (!code) continue;

    pre.dataset.copyReady = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "docs-code-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code block");

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await navigator.clipboard.writeText(code.textContent ?? "");
      button.textContent = "Copied";
      button.setAttribute("aria-label", "Code block copied");
      window.setTimeout(() => {
        button.textContent = "Copy";
        button.setAttribute("aria-label", "Copy code block");
      }, 1500);
    });

    pre.append(button);
  }
}
