import { PROGRESS_EVENT, type StepEngine } from "./steps.ts";
import { SPEECH_STORAGE_KEY, speechPreferences, speechSentences, speechVoices, speechWord } from "./speech-text.ts";

interface Sentence { text: string; range(start?: number, end?: number): Range; block: HTMLElement }
const SKIP = "pre, script, style, template, button, input, textarea, select, [contenteditable], [hidden], [aria-hidden=true], calcite-button, calcite-action, .var-field, .var-fields, .step-file";

/** Read prose only, preserving text nodes and the reader's selection. */
function sentences(root: HTMLElement, lang: string): Sentence[] {
  const groups: { block: HTMLElement; nodes: Text[] }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent && !parent.closest(SKIP) && parent.checkVisibility() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const block = node.parentElement!.closest<HTMLElement>("h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote") ?? root;
    let group = groups.at(-1);
    if (group?.block !== block) groups.push(group = { block, nodes: [] });
    group.nodes.push(node);
  }
  return groups.flatMap(({ block, nodes }) => {
    const text = nodes.map((node) => node.data).join("");
    return speechSentences(text, lang).map((sentence) => ({
      text: sentence.text,
      block,
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
  });
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
  const auto = bar.querySelector<HTMLInputElement>("#speech-auto")!;
  const launch = document.querySelector<HTMLButtonElement>("#speech-launch")!;
  let preferences = speechPreferences(null);
  try { preferences = speechPreferences(localStorage.getItem(SPEECH_STORAGE_KEY)); } catch { /* Storage may be blocked. */ }
  rate.value = String(preferences.rate);
  auto.checked = preferences.auto;
  function savePreferences(): void {
    preferences = { voice: voiceSelect.value, rate: Number(rate.value), auto: auto.checked };
    try { localStorage.setItem(SPEECH_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Keep in-memory preferences. */ }
  }
  const lang = document.documentElement.lang || "en";
  let voices: SpeechSynthesisVoice[] = [];
  let state: "idle" | "playing" | "paused" = "idle";
  let queue: Sentence[] = [];
  let index = 0;
  let offset = 0;
  let generation = 0;
  let utterance: SpeechSynthesisUtterance | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let root: HTMLElement | undefined;
  let advancing = false;
  // Custom Highlights paint ranges without altering links, text nodes, or selections.
  const canHighlight = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
  const clearHighlight = () => {
    if (canHighlight) CSS.highlights.delete("ics-speech");
    document.querySelectorAll("[data-speaking]").forEach((el) => el.removeAttribute("data-speaking"));
  };
  function highlight(sentence: Sentence, start = 0, end = sentence.text.length): void {
    clearHighlight();
    if (canHighlight) CSS.highlights.set("ics-speech", new Highlight(sentence.range(start, end)));
    else sentence.block.setAttribute("data-speaking", "");
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
    bar.hidden = !voices.length || state === "idle";
    launch.setAttribute("aria-expanded", String(!bar.hidden));
    launch.setAttribute("aria-label", bar.hidden ? "Listen to this tutorial" : "Listen: stop narration and close controls");
    launch.title = message ?? "Listen / pause / resume (Alt+Shift+L)";
    bar.dataset.state = state;
    controls.hidden = state === "idle";
    toggle.querySelector("span")!.textContent = state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Listen";
    toggle.querySelector("calcite-icon")!.setAttribute("icon", state === "playing" ? "pause" : state === "paused" ? "play" : "sound");
    toggle.setAttribute("aria-label", `${state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Start"} narration (Alt+Shift+L)`);
    status.textContent = message ?? (state === "playing" ? "Reading aloud" : state === "paused" ? "Narration paused" : "");
  }
  function cancel(): void {
    generation++;
    clearTimeout(timer);
    utterance = undefined;
    synth.cancel();
    clearHighlight();
  }
  function stop(message?: string): void {
    cancel();
    state = "idle";
    root = undefined;
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
    if (progress.completed) return;
    return progress.current < 0 ? document.querySelector<HTMLElement>(".intro") ?? undefined : progress.steps[progress.current];
  }
  function advance(): void {
    if (state !== "playing") return;
    if (!auto.checked) { pause(); return; }
    const progress = engine.progress();
    if (progress.current + 1 >= progress.steps.length) { stop("Narration finished"); return; }
    advancing = true;
    engine.goToStep(progress.current + 1);
    advancing = false;
    start();
  }
  function speak(): void {
    if (state !== "playing") return;
    const sentence = queue[index];
    if (!sentence) {
      clearHighlight();
      if (auto.checked) timer = setTimeout(advance, 700);
      else { state = "paused"; render("Step finished. Resume to read it again, or choose the next step."); }
      return;
    }
    const token = ++generation;
    const startOffset = offset;
    const text = sentence.text.slice(startOffset);
    const next = new SpeechSynthesisUtterance(text);
    utterance = next; // Keep alive until end; some engines otherwise drop callbacks.
    next.lang = lang;
    next.voice = voices.find((voice) => voice.voiceURI === voiceSelect.value) ?? voices[0]!;
    next.rate = Number(rate.value);
    next.onstart = () => { if (token === generation) highlight(sentence, startOffset); };
    next.onboundary = (event) => {
      if (token !== generation || event.name !== "word") return;
      const word = speechWord(sentence.text, startOffset + event.charIndex, lang);
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
    queue = root ? sentences(root, lang) : [];
    index = 0;
    offset = 0;
    state = "playing";
    render();
    if (!root) { stop("Choose a step to listen to"); return; }
    speak();
  }
  function playPause(): void {
    if (document.body.hasAttribute("data-presenting") || !voices.length) return;
    if (state === "playing") pause();
    else if (state === "paused" && root === currentRoot() && index < queue.length) {
      state = "playing";
      render();
      speak();
    } else start();
  }
  function updateVoices(): void {
    const selected = voiceSelect.value || preferences.voice;
    voices = speechVoices(synth.getVoices(), lang);
    voiceSelect.replaceChildren(...voices.map((voice) => new Option(`${voice.name}${voice.localService ? "" : " (online)"}`, voice.voiceURI)));
    voiceSelect.value = voices.find((voice) => voice.voiceURI === selected)?.voiceURI ?? voices.find((voice) => voice.default)?.voiceURI ?? voices[0]?.voiceURI ?? "";
    launch.hidden = !voices.length;
    bar.hidden = !voices.length || state === "idle";
    if (!voices.length && state !== "idle") stop("No voice available for this tutorial's language");
  }
  toggle.addEventListener("click", playPause);
  launch.addEventListener("click", () => {
    if (state === "idle") { playPause(); toggle.focus(); }
    else stop();
  });
  bar.querySelector("#speech-stop")!.addEventListener("click", () => { stop(); launch.focus(); });
  auto.addEventListener("change", savePreferences);
  for (const select of [rate, voiceSelect]) select.addEventListener("change", () => {
    savePreferences();
    if (state === "playing") { cancel(); speak(); }
  });
  document.addEventListener(PROGRESS_EVENT, () => {
    if (advancing || state === "idle") return;
    if (engine.progress().completed) { stop(); return; }
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
    if (launch.hidden || document.body.hasAttribute("data-presenting")) return;
    event.preventDefault();
    playPause();
  });
  new MutationObserver(() => {
    if (document.body.hasAttribute("data-presenting") && state !== "idle") pause();
  }).observe(document.body, { attributes: true, attributeFilter: ["data-presenting"] });
  addEventListener("pagehide", () => stop());
  synth.addEventListener("voiceschanged", updateVoices);
  updateVoices();
  render();
}
