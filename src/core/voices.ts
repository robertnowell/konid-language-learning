export const VOICE_MAP: Record<string, string> = {
  "zh": "zh-CN-YunjianNeural",
  "zh-CN": "zh-CN-YunjianNeural",
  "zh-TW": "zh-TW-YunJheNeural",
  "ja": "ja-JP-KeitaNeural",
  "ko": "ko-KR-InJoonNeural",
  "es": "es-ES-AlvaroNeural",
  "fr": "fr-FR-HenriNeural",
  "de": "de-DE-ConradNeural",
  "pt": "pt-BR-AntonioNeural",
  "it": "it-IT-DiegoNeural",
  "ru": "ru-RU-DmitryNeural",
  "ar": "ar-SA-HamedNeural",
  "hi": "hi-IN-MadhurNeural",
  "en": "en-US-GuyNeural",
};

export function resolveVoice(voice: string | undefined, targetLanguage: string): string {
  if (voice) return voice;
  const lang = targetLanguage.toLowerCase();
  if (lang.includes("chinese") || lang.includes("mandarin")) return VOICE_MAP["zh-CN"];
  if (lang.includes("japanese")) return VOICE_MAP["ja"];
  if (lang.includes("korean")) return VOICE_MAP["ko"];
  if (lang.includes("spanish")) return VOICE_MAP["es"];
  if (lang.includes("french")) return VOICE_MAP["fr"];
  if (lang.includes("german")) return VOICE_MAP["de"];
  if (lang.includes("portuguese")) return VOICE_MAP["pt"];
  if (lang.includes("italian")) return VOICE_MAP["it"];
  if (lang.includes("russian")) return VOICE_MAP["ru"];
  if (lang.includes("arabic")) return VOICE_MAP["ar"];
  if (lang.includes("hindi")) return VOICE_MAP["hi"];
  return VOICE_MAP["zh-CN"]; // default
}

export function detectVoiceFromText(text: string): string {
  // Japanese before Chinese: Japanese uses kana + kanji, Chinese uses only hanzi
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return VOICE_MAP["ja"];
  if (/[\u4e00-\u9fff]/.test(text)) return VOICE_MAP["zh-CN"];
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) return VOICE_MAP["ko"];
  if (/[\u0600-\u06ff]/.test(text)) return VOICE_MAP["ar"];
  if (/[\u0900-\u097f]/.test(text)) return VOICE_MAP["hi"];
  if (/[\u0400-\u04ff]/.test(text)) return VOICE_MAP["ru"];
  // Latin scripts - check for diacritics/patterns
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(text)) return VOICE_MAP["fr"];
  if (/[äöüß]/i.test(text)) return VOICE_MAP["de"];
  if (/[ñ¿¡áéíóú]/i.test(text)) return VOICE_MAP["es"];
  if (/[ãõçâê]/i.test(text)) return VOICE_MAP["pt"];
  if (/[àèìòù]/i.test(text)) return VOICE_MAP["it"];
  return VOICE_MAP["zh-CN"]; // default
}
