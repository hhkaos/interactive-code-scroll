import { closeHint, openHint } from "./hints.ts";
import { DOCS_TOGGLE_EVENT, PRESENTATION_EVENT } from "./presentation.ts";
import { PROGRESS_EVENT, type StepEngine } from "./steps.ts";
import { SPEECH_STORAGE_KEY, speechPreferences, speechSentences, speechVoices, speechWord, type SpeechPreferences, type SpeechMode } from "./speech-text.ts";

interface Sentence {
  text: string;
  /** Spoken context is separate from DOM offsets used by highlights and seeking. */
  prefix?: string;
  range(start?: number, end?: number): Range;
  block: HTMLElement;
  /** A hint read as an aside: its popover is open while it is read. */
  hint?: HTMLElement;
  /** A collapsed section, opened when its content is read. */
  details?: HTMLDetailsElement;
  /** Silence before the sentence, in ms (around asides and collapsed sections). */
  delay?: number;
}
const SKIP = "pre, script, style, template, button:not(.hint-label), input, textarea, select, [contenteditable], [hidden], [aria-hidden=true], [data-speech=skip], calcite-button, calcite-action, .var-field, .var-fields, .step-file, .completion-actions, .completion-next, .completion-share";
const BLOCK = "h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,summary,details";
export const ASIDE_PAUSE_MS = 400;

const explanationsHidden = () => document.body.hasAttribute("data-docs-hidden");

/** Ignore only the hidden panel itself; author-hidden prose must stay excluded. */
function readable(element: HTMLElement): boolean {
  if (element.checkVisibility()) return true;
  const column = element.closest(".docs-column");
  if (!explanationsHidden() || !column) return false;
  for (let current: HTMLElement | null = element; current && current !== column; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.contentVisibility === "hidden") return false;
  }
  return true;
}

/** The closed <details> whose collapsed content (not its summary) holds this element. */
function collapsedIn(element: Element): HTMLDetailsElement | undefined {
  const details = element.closest("details:not([open])");
  if (!(details instanceof HTMLDetailsElement)) return;
  return details.querySelector(":scope > summary")?.contains(element) ? undefined : details;
}

/** Read prose only, preserving text nodes and the reader's selection. */
function sentences(root: HTMLElement, lang: string, preferences: SpeechPreferences, aside?: HTMLElement): Sentence[] {
  const groups: { block: HTMLElement; nodes: Text[]; details?: HTMLDetailsElement }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      // Hint popovers are read separately, after the sentence that names their term.
      const popover = parent?.closest(".hint-popover");
      if (!parent || parent.closest(SKIP) || (popover && popover !== (aside && root))) return NodeFilter.FILTER_REJECT;
      // Collapsed content is hidden until narration opens it, so the section must be visible instead.
      const closed = collapsedIn(parent);
      if (closed && !preferences.collapsed) return NodeFilter.FILTER_REJECT;
      return readable(closed ?? parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const closest = node.parentElement!.closest<HTMLElement>(BLOCK);
    const block = closest && root.contains(closest) ? closest : root;
    let group = groups.at(-1);
    if (group?.block !== block) groups.push(group = { block, nodes: [], details: collapsedIn(node.parentElement!) });
    group.nodes.push(node);
  }
  const queue: Sentence[] = [];
  for (const { block, nodes, details } of groups) {
    const text = nodes.map((node) => node.data).join("");
    const items = speechSentences(text, lang).map((sentence) => ({
      text: sentence.text,
      block,
      details,
      hint: aside,
      start: sentence.start,
      end: sentence.end,
      range(start = 0, end = sentence.text.length) {
        const range = document.createRange();
        let offset = 0;
        for (const node of nodes) {
          if (sentence.start + start >= offset && sentence.start + start < offset + node.length) range.setStart(node, sentence.start + start - offset);
          if (sentence.start + end > offset && sentence.start + end <= offset + node.length) range.setEnd(node, sentence.start + end - offset);
          offset += node.length;
        }
        return range;
      },
    }));
    // Each hint follows the sentence where its term ends, framed by short pauses.
    const asides = new Map<number, HTMLElement[]>();
    if (!aside && preferences.hints) {
      let offset = 0;
      const ends = new Map<HTMLElement, number>();
      for (const node of nodes) {
        offset += node.length;
        const hint = node.parentElement!.closest<HTMLElement>(".hint-label")?.closest<HTMLElement>(".hint");
        if (hint) ends.set(hint, offset);
      }
      for (const [hint, end] of ends) {
        const at = items.findIndex((item) => end > item.start && end <= item.end);
        if (at >= 0) asides.set(at, [...(asides.get(at) ?? []), hint]);
      }
    }
    items.forEach((item, i) => {
      queue.push(item);
      for (const hint of asides.get(i) ?? []) {
        const popover = hint.querySelector<HTMLElement>(".hint-popover");
        if (popover) {
          const label = hint.querySelector(".hint-label")?.textContent?.trim();
          queue.push(...sentences(popover, lang, preferences, hint).map((sentence, i) => ({
            ...sentence, details, prefix: i === 0 && label ? `About ${label}: ` : undefined,
          })));
        }
      }
    });
  }
  // Pause on entering and leaving an aside or a collapsed section.
  queue.forEach((sentence, i) => {
    const previous = queue[i - 1];
    if (previous && (previous.hint !== sentence.hint || previous.details !== sentence.details)) sentence.delay = ASIDE_PAUSE_MS;
  });
  return queue;
}

/** Optional native narration; no audio starts until the reader asks. */
export function startSpeech(engine: StepEngine): void {
  const element = document.querySelector<HTMLElement>("#speech-bar");
  if (!element || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const bar = element;
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.getVoices !== "function") return;
  const toggle = bar.querySelector<HTMLButtonElement>("#speech-toggle")!;
  const controls = bar.querySelector<HTMLElement>("#speech-controls")!;
  const status = document.querySelector<HTMLElement>("#speech-status")!;
  const rate = bar.querySelector<HTMLSelectElement>("#speech-rate")!;
  const voiceSelect = bar.querySelector<HTMLSelectElement>("#speech-voice")!;
  const mode = bar.querySelector<HTMLSelectElement>("#speech-mode")!;
  const hints = bar.querySelector<HTMLInputElement>("#speech-hints")!;
  const collapsed = bar.querySelector<HTMLInputElement>("#speech-collapsed")!;
  const choice = bar.querySelector<HTMLElement>("#speech-choice")!;
  const settings = bar.querySelector<HTMLDetailsElement>(".speech-settings")!;
  const selectionButton = bar.querySelector<HTMLButtonElement>("#speech-selection")!;
  const stateLabel = bar.querySelector<HTMLElement>("#speech-state")!;
  const launch = document.querySelector<HTMLButtonElement>("#speech-launch")!;
  const dock = document.querySelector<HTMLElement>("#speech-dock")!;
  const expand = document.querySelector<HTMLButtonElement>("#speech-expand")!;
  const minimize = bar.querySelector<HTMLButtonElement>("#speech-minimize")!;
  let minimized = true;
  let preferences = speechPreferences(null);
  try { preferences = speechPreferences(localStorage.getItem(SPEECH_STORAGE_KEY)); } catch { /* Storage may be blocked. */ }
  rate.value = String(preferences.rate);
  mode.value = preferences.mode ?? "step";
  hints.checked = preferences.hints;
  collapsed.checked = preferences.collapsed;
  function savePreferences(): void {
    preferences = { voice: voiceSelect.value, rate: Number(rate.value), mode: preferences.mode, hints: hints.checked, collapsed: collapsed.checked };
    try { localStorage.setItem(SPEECH_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Keep in-memory preferences. */ }
  }
  const lang = document.documentElement.lang || "en";
  let voices: SpeechSynthesisVoice[] = [];
  let state: "idle" | "choosing" | "playing" | "paused" = "idle";
  let queue: Sentence[] = [];
  let index = 0;
  let offset = 0;
  let generation = 0;
  let utterance: SpeechSynthesisUtterance | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let root: HTMLElement | undefined;
  let advancing = false;
  let waited = -1;
  let selectedRange: Range | undefined;
  let openHintElement: HTMLElement | undefined;
  /** Show what the next sentence reads: its hint popover, or its collapsed section. */
  function stage(sentence?: Sentence): void {
    if (explanationsHidden()) sentence = undefined;
    if (openHintElement && openHintElement !== sentence?.hint) closeHint(openHintElement);
    openHintElement = sentence?.hint;
    if (openHintElement) openHint(openHintElement);
    if (sentence?.details) sentence.details.open = true;
  }
  // Custom Highlights paint ranges without altering links, text nodes, or selections.
  const canHighlight = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
  const clearHighlight = () => {
    if (canHighlight) CSS.highlights.delete("ics-speech");
    document.querySelectorAll("[data-speaking]").forEach((el) => el.removeAttribute("data-speaking"));
  };
  function highlight(sentence: Sentence, start = 0, end = sentence.text.length): void {
    clearHighlight();
    if (explanationsHidden()) return;
    if (canHighlight) CSS.highlights.set("ics-speech", new Highlight(sentence.range(start, end)));
    else sentence.block.setAttribute("data-speaking", "");
    // The hint popover sits next to its term, which the previous sentence revealed.
    if (sentence.hint) return;
    const docs = document.querySelector<HTMLElement>(".docs")!;
    const box = sentence.range(start, end).getBoundingClientRect();
    const view = docs.getBoundingClientRect();
    if (box.top < view.top + 12 || box.bottom > view.bottom - 12) {
      // Scroll only our panel: native scrollIntoView also moves an embedding page.
      // Reveal at the nearest edge. Centering a step's final sentence could bring
      // the next step across the activation line before this sentence finishes.
      const top = box.top < view.top + 12 ? box.top - view.top - 12 : box.bottom - view.bottom + 12;
      docs.scrollBy({ top, behavior: "instant" });
    }
  }
  function render(message?: string): void {
    const presenting = document.body.hasAttribute("data-presenting");
    const compact = presenting && minimized && state !== "choosing";
    bar.hidden = !voices.length || state === "idle" || compact;
    dock.hidden = !presenting || !voices.length || state === "choosing";
    dock.dataset.state = state;
    expand.setAttribute("aria-expanded", String(!bar.hidden));
    minimize.hidden = !presenting || state === "choosing";
    launch.setAttribute("aria-expanded", String(!bar.hidden));
    launch.setAttribute("aria-label", bar.hidden ? "Listen to this tutorial" : "Listen: stop narration and close controls");
    launch.title = message ?? "Listen / pause / resume (Alt+Shift+L)";
    bar.dataset.state = state;
    choice.hidden = state !== "choosing";
    controls.hidden = state === "idle" || state === "choosing";
    toggle.hidden = controls.hidden;
    bar.querySelector<HTMLElement>("#speech-seek")!.hidden = controls.hidden;
    const finished = state === "paused" && root === currentRoot() && index >= queue.length;
    stateLabel.textContent = message ?? (state === "playing" ? "Reading aloud" : finished ? "Step finished" : state === "paused" ? "Paused" : "Read aloud");
    selectionButton.disabled = !selectedRange || controls.hidden;
    toggle.querySelector("span")!.textContent = state === "playing" ? "Pause" : finished ? "Continue" : state === "paused" ? "Resume" : "Listen";
    toggle.querySelector("calcite-icon")!.setAttribute("icon", state === "playing" ? "pause" : state === "paused" ? "play" : "sound");
    toggle.setAttribute("aria-label", `${state === "playing" ? "Pause" : finished ? "Continue" : state === "paused" ? "Resume" : "Start"} narration (Alt+Shift+L)`);
    const visibilityAction = bar.hidden ? "Show" : "Hide";
    const playbackState = state === "playing" ? "reading aloud" : finished ? "step finished" : "paused";
    expand.title = state === "idle" ? "Listen to this tutorial" : `${visibilityAction} narration controls (${playbackState})`;
    expand.setAttribute("aria-label", expand.title);
    status.textContent = message ?? (state === "playing" ? "Reading aloud" : state === "paused" ? "Narration paused" : "");
  }
  function cancel(): void {
    generation++;
    clearTimeout(timer);
    bar.removeAttribute("data-gap");
    utterance = undefined;
    synth.cancel();
    clearHighlight();
    stage();
  }
  function stop(message?: string): void {
    cancel();
    state = "idle";
    root = undefined;
    settings.open = false;
    selectedRange = undefined;
    render(message);
  }
  function pause(): void {
    if (state !== "playing") return;
    // Restart at the latest word boundary (or sentence) on resume. This also works
    // on engines where native pause/resume is absent or unreliable.
    cancel();
    state = "paused";
    render();
  }
  function currentRoot(): HTMLElement | undefined {
    const progress = engine.progress();
    if (progress.completed) return document.querySelector<HTMLElement>(".completion") ?? undefined;
    return progress.current < 0 ? document.querySelector<HTMLElement>(".intro") ?? undefined : progress.steps[progress.current];
  }
  function advance(): void {
    if (state !== "playing") return;
    const progress = engine.progress();
    if (progress.completed) { stop("Narration finished"); return; }
    advancing = true;
    if (progress.current + 1 < progress.steps.length) engine.goToStep(progress.current + 1);
    else if (document.querySelector(".completion")) engine.goToCompletion();
    else { advancing = false; stop("Narration finished"); return; }
    advancing = false;
    start();
  }
  function speak(): void {
    if (state !== "playing") return;
    const sentence = queue[index];
    if (!sentence) {
      clearHighlight();
      stage();
      if (engine.progress().completed) stop("Narration finished");
      else if (preferences.mode === "continuous") timer = setTimeout(advance, 700);
      else { state = "paused"; render(); status.textContent = "Step finished. Continue to the next step when ready."; }
      return;
    }
    stage(sentence);
    if (sentence.delay && offset === 0 && waited !== index) {
      waited = index;
      clearHighlight();
      bar.toggleAttribute("data-gap", true);
      timer = setTimeout(() => { bar.removeAttribute("data-gap"); speak(); }, sentence.delay);
      return;
    }
    const token = ++generation;
    const startOffset = offset;
    const prefix = startOffset === 0 ? sentence.prefix ?? "" : "";
    const text = prefix + sentence.text.slice(startOffset);
    const next = new SpeechSynthesisUtterance(text);
    utterance = next; // Keep alive until end; some engines otherwise drop callbacks.
    next.lang = lang;
    next.voice = voices.find((voice) => voice.voiceURI === voiceSelect.value) ?? voices[0]!;
    next.rate = Number(rate.value);
    next.onstart = () => { if (token === generation) highlight(sentence, startOffset); };
    next.onboundary = (event) => {
      if (token !== generation || event.name !== "word") return;
      const word = speechWord(sentence.text, startOffset + event.charIndex - prefix.length, lang);
      if (word) { offset = word.start; highlight(sentence, word.start, word.end); }
    };
    next.onend = () => {
      if (token !== generation || state !== "playing") return;
      utterance = undefined;
      index++;
      offset = 0;
      speak();
    };
    next.onerror = () => {
      if (token === generation) stop("Narration could not continue. Try another voice or press Listen to retry.");
    };
    synth.speak(next);
  }
  function start(): void {
    cancel();
    root = currentRoot();
    selectedRange = undefined;
    queue = root ? sentences(root, lang, preferences) : [];
    index = 0;
    offset = 0;
    waited = -1;
    state = "playing";
    render();
    if (!root) { stop("Choose a step to listen to"); return; }
    speak();
  }
  function playPause(): void {
    if (!voices.length) return;
    if (state === "idle" && !preferences.mode) {
      state = "choosing";
      render();
      choice.querySelector<HTMLButtonElement>("button")!.focus();
    } else if (state === "choosing") return;
    else if (state === "playing") pause();
    else if (state === "paused" && root === currentRoot() && index < queue.length) {
      state = "playing";
      render();
      speak();
    } else if (state === "paused" && root === currentRoot() && index >= queue.length) {
      state = "playing";
      advance();
    } else start();
  }
  function updateVoices(): void {
    const selected = voiceSelect.value || preferences.voice;
    voices = speechVoices(synth.getVoices(), lang);
    voiceSelect.replaceChildren(...voices.map((voice) => new Option(`${voice.name}${voice.localService ? "" : " (online)"}`, voice.voiceURI)));
    voiceSelect.value = voices.find((voice) => voice.voiceURI === selected)?.voiceURI ?? voices.find((voice) => voice.default)?.voiceURI ?? voices[0]?.voiceURI ?? "";
    launch.hidden = !voices.length;
    if (!voices.length && state !== "idle") stop("No voice available for this tutorial's language");
    else render();
  }
  function focusPlayback(): void {
    (bar.hidden ? expand : toggle).focus();
  }
  function minimizeControls(): void {
    minimized = true;
    settings.open = false;
    render();
    expand.focus();
  }
  minimize.addEventListener("click", minimizeControls);
  expand.addEventListener("click", () => {
    if (state === "idle") { playPause(); if (choice.hidden) focusPlayback(); return; }
    if (!bar.hidden) { minimizeControls(); return; }
    minimized = false;
    render();
    focusPlayback();
  });
  document.addEventListener(PRESENTATION_EVENT, () => {
    const focused = bar.contains(document.activeElement) || dock.contains(document.activeElement);
    minimized = true;
    settings.open = false;
    render();
    if (focused) {
      if (state === "idle") (dock.hidden ? launch : expand).focus();
      else if (state !== "choosing") focusPlayback();
    }
  });
  toggle.addEventListener("click", playPause);
  launch.addEventListener("click", () => {
    if (state === "idle") { playPause(); if (choice.hidden) focusPlayback(); }
    else stop();
  });
  bar.querySelector("#speech-stop")!.addEventListener("click", () => { stop(); (dock.hidden ? launch : expand).focus(); });
  function chooseMode(value: SpeechMode): void {
    preferences.mode = value;
    mode.value = value;
    savePreferences();
    if (state === "choosing") { start(); focusPlayback(); }
    // A pending advance must respect a switch back to step-by-step.
    else if (state === "playing" && index >= queue.length) {
      cancel();
      speak();
    }
  }
  choice.querySelectorAll<HTMLButtonElement>("[data-speech-mode]").forEach((button) => {
    button.addEventListener("click", () => chooseMode(button.dataset.speechMode as SpeechMode));
  });
  mode.addEventListener("change", () => chooseMode(mode.value as SpeechMode));
  for (const input of [hints, collapsed]) input.addEventListener("change", () => {
    savePreferences();
    if (!root) return;
    const remaining = queue.slice(index);
    const current = remaining[0];
    const previousOffset = offset;
    cancel();
    queue = sentences(root, lang, preferences);
    // Keep the current sentence, or the next surviving one when an aside is disabled.
    const next = remaining.find((candidate) => queue.some((sentence) => sentence.block === candidate.block && sentence.text === candidate.text));
    index = next ? queue.findIndex((sentence) => sentence.block === next.block && sentence.text === next.text) : queue.length;
    offset = next === current ? previousOffset : 0;
    waited = -1;
    render();
    speak();
  });
  function closeSettings(restoreFocus = false): void {
    settings.open = false;
    if (restoreFocus) settings.querySelector<HTMLElement>("summary")!.focus();
  }
  document.addEventListener("pointerdown", (event) => {
    if (!event.composedPath().includes(settings)) closeSettings();
  });
  // Handle Escape before page-level presentation and maximization shortcuts.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settings.open) {
      event.preventDefault(); event.stopImmediatePropagation(); closeSettings(true);
    }
  }, true);
  function seek(range: Range): void {
    if (!root || root !== currentRoot() || (state !== "playing" && state !== "paused")) return;
    // Ranges include both ends: a shared boundary belongs to the following sentence.
    let at = queue.length - 1;
    for (; at >= 0; at--) {
      if (queue[at]!.range().isPointInRange(range.startContainer, range.startOffset)) break;
    }
    if (at < 0) return;
    cancel();
    index = at; offset = 0; waited = -1;
    render();
    if (state === "playing") speak();
    else highlight(queue[index]!);
  }
  document.addEventListener("selectionchange", () => {
    const selection = getSelection();
    const range = selection?.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0) : undefined;
    if (range && root?.contains(range.startContainer) && root.contains(range.endContainer)) selectedRange = range.cloneRange();
    else if (!bar.contains(document.activeElement)) selectedRange = undefined;
    selectionButton.disabled = !selectedRange;
  });
  selectionButton.addEventListener("click", () => { if (selectedRange) seek(selectedRange); });
  document.querySelector(".docs")?.addEventListener("click", (event) => {
    if (!(event instanceof MouseEvent) || event.detail !== 1 || !getSelection()?.isCollapsed) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a,button,summary,input,textarea,select,[contenteditable],.hint,calcite-button,calcite-action")) return;
    const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY);
    const range = caret ? document.createRange() : document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (!range) return;
    if (caret) { range.setStart(caret.offsetNode, caret.offset); range.collapse(true); }
    if (root?.contains(range.startContainer)) seek(range);
  });
  for (const select of [rate, voiceSelect]) select.addEventListener("change", () => {
    savePreferences();
    if (state === "playing") { cancel(); speak(); }
  });
  document.addEventListener(PROGRESS_EVENT, () => {
    if (advancing || state === "idle" || state === "choosing") return;
    if (root !== currentRoot()) {
      const playing = state === "playing";
      cancel();
      root = undefined;
      if (playing) start();
      else render();
    }
  });
  // Let practice interrupt the guided playback, including Calcite's shadow inputs.
  document.addEventListener("focusin", (event) => {
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement && !bar.contains(event.target as Node) && target.matches("input,textarea,select,[contenteditable],calcite-input,calcite-combobox,calcite-select,calcite-switch,calcite-radio-button")) pause();
  });
  document.querySelector("#result-run")?.addEventListener("click", pause, { capture: true });
  addEventListener("keydown", (event) => {
    const target = event.composedPath()[0];
    if (event.repeat || event.code !== "KeyL" || !event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey ||
      (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName)))) return;
    if (launch.hidden) return;
    event.preventDefault();
    playPause();
  });
  // Keep audio independent of the panel, restoring its visual cues when shown.
  document.addEventListener(DOCS_TOGGLE_EVENT, () => {
    clearHighlight();
    const sentence = state === "playing" ? queue[index] : undefined;
    stage(sentence);
    if (sentence) highlight(sentence, offset);
  });
  addEventListener("pagehide", () => stop());
  synth.addEventListener("voiceschanged", updateVoices);
  updateVoices();
  render();
}
