import { describe, expect, it } from "vitest";
import { speechPreferences, speechSentences, speechVoices, speechWord } from "./speech-text.ts";

describe("narration offsets", () => {
  it("keeps offsets into original prose, including whitespace and Unicode", () => {
    const text = "  Hello world. ¡Hola, mundo!\nNext step.";
    const parts = speechSentences(text, "en");
    expect(parts.length).toBe(3);
    for (const part of parts) expect(text.slice(part.start, part.end)).toBe(part.text);
    expect(speechSentences(" \n ", "en")).toEqual([]);
  });
  it("finds words without assuming ASCII, and rejects punctuation or invalid offsets", () => {
    expect(speechWord("Hello, café!", 7, "en")).toEqual({ start: 7, end: 11 });
    expect(speechWord("Hello, café!", 8, "en")).toEqual({ start: 7, end: 11 });
    expect(speechWord("Hello, café!", 5, "en")).toBeUndefined();
    expect(speechWord("Hello", -1, "en")).toBeUndefined();
    expect(speechWord("Hello", 5, "en")).toBeUndefined();
  });
  it("offers only voices matching the tutorial language, including regional variants", () => {
    const voices = [{ lang: "en-US" }, { lang: "EN-gb" }, { lang: "es-ES" }] as SpeechSynthesisVoice[];
    expect(speechVoices(voices, "en")).toEqual(voices.slice(0, 2));
    expect(speechVoices(voices, "es-MX")).toEqual([voices[2]]);
    expect(speechVoices(voices, "fr")).toEqual([]);
  });
});


describe("narration preferences", () => {
  it("restores supported preferences and rejects invalid storage", () => {
    expect(speechPreferences('{"voice":"local-en","rate":1.5,"auto":true}')).toEqual({ voice: "local-en", rate: 1.5, auto: true });
    for (const value of [null, "bad JSON", "null", "42", '{"voice":1,"rate":99,"auto":"yes"}']) {
      expect(speechPreferences(value)).toEqual({ voice: "", rate: 1, auto: false });
    }
  });
});
