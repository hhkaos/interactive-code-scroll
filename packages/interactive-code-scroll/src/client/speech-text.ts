/** Offsets stay in the original text so highlights also work across inline markup. */
export function speechSentences(text: string, lang: string): { text: string; start: number; end: number }[] {
  const segments = new Intl.Segmenter(lang, { granularity: "sentence" }).segment(text);
  return [...segments].filter((part) => part.segment.trim()).map(({ segment, index }) => ({ text: segment, start: index, end: index + segment.length }));
}

export function speechWord(text: string, index: number, lang: string): { start: number; end: number } | undefined {
  if (index < 0 || index >= text.length) return;
  const segments = new Intl.Segmenter(lang, { granularity: "word" }).segment(text);
  for (const part of segments) {
    if (part.index > index) break;
    if (part.isWordLike && index < part.index + part.segment.length) return { start: part.index, end: part.index + part.segment.length };
  }
}

export function speechVoices(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice[] {
  const language = lang.toLowerCase().split("-")[0];
  return voices.filter((voice) => voice.lang.toLowerCase().split("-")[0] === language);
}

export const SPEECH_STORAGE_KEY = "ics:speech";
export type SpeechMode = "step" | "continuous";
export interface SpeechPreferences { voice: string; rate: number; mode?: SpeechMode; hints: boolean; collapsed: boolean }

/** Treat stored settings as untrusted; older or edited values must remain usable. */
export function speechPreferences(value: string | null): SpeechPreferences {
  const defaults: SpeechPreferences = { voice: "", rate: 1, hints: true, collapsed: false };
  try {
    const data = JSON.parse(value ?? "null");
    if (!data || typeof data !== "object") return defaults;
    return {
      voice: typeof data.voice === "string" ? data.voice : "",
      rate: [0.75, 1, 1.25, 1.5, 2].includes(data.rate) ? data.rate : 1,
      // Migrate the old explicit advance preference; new readers choose a mode.
      mode: data.mode === "step" || data.mode === "continuous" ? data.mode : typeof data.auto === "boolean" ? (data.auto ? "continuous" : "step") : undefined,
      hints: typeof data.hints === "boolean" ? data.hints : true,
      collapsed: data.collapsed === true,
    };
  } catch { return defaults; }
}
