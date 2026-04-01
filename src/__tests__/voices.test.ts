import { describe, it, expect } from "vitest";
import { VOICE_MAP, resolveVoice, detectVoiceFromText } from "../core/voices.js";

describe("VOICE_MAP", () => {
  it("has entries for all supported languages", () => {
    const expectedKeys = ["zh", "zh-CN", "zh-TW", "ja", "ko", "es", "fr", "de", "pt", "it", "ru", "ar", "hi", "en"];
    for (const key of expectedKeys) {
      expect(VOICE_MAP[key]).toBeDefined();
    }
  });
});

describe("resolveVoice", () => {
  it("returns the voice directly if provided", () => {
    expect(resolveVoice("custom-voice", "anything")).toBe("custom-voice");
  });

  it("resolves Chinese/Mandarin", () => {
    expect(resolveVoice(undefined, "Mandarin Chinese")).toBe(VOICE_MAP["zh-CN"]);
    expect(resolveVoice(undefined, "Chinese")).toBe(VOICE_MAP["zh-CN"]);
  });

  it("resolves Japanese", () => {
    expect(resolveVoice(undefined, "Japanese")).toBe(VOICE_MAP["ja"]);
  });

  it("resolves Korean", () => {
    expect(resolveVoice(undefined, "Korean")).toBe(VOICE_MAP["ko"]);
  });

  it("resolves European languages", () => {
    expect(resolveVoice(undefined, "Spanish")).toBe(VOICE_MAP["es"]);
    expect(resolveVoice(undefined, "French")).toBe(VOICE_MAP["fr"]);
    expect(resolveVoice(undefined, "German")).toBe(VOICE_MAP["de"]);
    expect(resolveVoice(undefined, "Portuguese")).toBe(VOICE_MAP["pt"]);
    expect(resolveVoice(undefined, "Italian")).toBe(VOICE_MAP["it"]);
    expect(resolveVoice(undefined, "Russian")).toBe(VOICE_MAP["ru"]);
  });

  it("resolves Arabic and Hindi", () => {
    expect(resolveVoice(undefined, "Arabic")).toBe(VOICE_MAP["ar"]);
    expect(resolveVoice(undefined, "Hindi")).toBe(VOICE_MAP["hi"]);
  });

  it("defaults to zh-CN for unknown languages", () => {
    expect(resolveVoice(undefined, "Swahili")).toBe(VOICE_MAP["zh-CN"]);
  });

  it("is case-insensitive", () => {
    expect(resolveVoice(undefined, "JAPANESE")).toBe(VOICE_MAP["ja"]);
    expect(resolveVoice(undefined, "mandarin chinese")).toBe(VOICE_MAP["zh-CN"]);
  });
});

describe("detectVoiceFromText", () => {
  it("detects Japanese (kana)", () => {
    expect(detectVoiceFromText("こんにちは")).toBe(VOICE_MAP["ja"]);
    expect(detectVoiceFromText("カタカナ")).toBe(VOICE_MAP["ja"]);
  });

  it("detects Chinese (hanzi only)", () => {
    expect(detectVoiceFromText("你好")).toBe(VOICE_MAP["zh-CN"]);
    expect(detectVoiceFromText("再说吧")).toBe(VOICE_MAP["zh-CN"]);
  });

  it("detects Japanese before Chinese when kana is present", () => {
    // Mixed kanji + kana should be detected as Japanese
    expect(detectVoiceFromText("お元気ですか")).toBe(VOICE_MAP["ja"]);
  });

  it("detects Korean", () => {
    expect(detectVoiceFromText("안녕하세요")).toBe(VOICE_MAP["ko"]);
  });

  it("detects Arabic", () => {
    expect(detectVoiceFromText("مرحبا")).toBe(VOICE_MAP["ar"]);
  });

  it("detects Hindi", () => {
    expect(detectVoiceFromText("नमस्ते")).toBe(VOICE_MAP["hi"]);
  });

  it("detects Russian", () => {
    expect(detectVoiceFromText("Привет")).toBe(VOICE_MAP["ru"]);
  });

  it("detects French from diacritics", () => {
    expect(detectVoiceFromText("café")).toBe(VOICE_MAP["fr"]);
    expect(detectVoiceFromText("ça va")).toBe(VOICE_MAP["fr"]);
  });

  it("detects German from ß (unambiguous)", () => {
    expect(detectVoiceFromText("Straße")).toBe(VOICE_MAP["de"]);
  });

  it("detects Spanish from ñ and ¡ (unambiguous)", () => {
    expect(detectVoiceFromText("mañana")).toBe(VOICE_MAP["es"]);
    expect(detectVoiceFromText("¡hola!")).toBe(VOICE_MAP["es"]);
  });

  it("detects Portuguese from ã (unambiguous)", () => {
    expect(detectVoiceFromText("não")).toBe(VOICE_MAP["pt"]);
  });

  // Latin diacritics overlap: ü, é, à are shared by French/German/Spanish/Italian.
  // The detector checks French first, so ambiguous chars fall to French.
  // This is a known limitation — the `voice` param should be used for precision.
  it("falls back to French for ambiguous Latin diacritics", () => {
    expect(detectVoiceFromText("über")).toBe(VOICE_MAP["fr"]); // ü in both French and German
    expect(detectVoiceFromText("¿qué?")).toBe(VOICE_MAP["fr"]); // é matches French before Spanish
    expect(detectVoiceFromText("città")).toBe(VOICE_MAP["fr"]); // à matches French before Italian
  });

  it("defaults to zh-CN for plain ASCII", () => {
    expect(detectVoiceFromText("hello world")).toBe(VOICE_MAP["zh-CN"]);
  });
});
