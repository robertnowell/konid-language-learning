#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
// @ts-ignore - no type declarations
import { EdgeTTS } from "node-edge-tts";

const execFileAsync = promisify(execFile);
const anthropic = new Anthropic();
const COACH_MODEL = process.env.KONID_MODEL ?? "claude-sonnet-4-6";
const AUDIO_DIR = join(tmpdir(), "konid-ai");

// --- Coaching prompt ---

function buildCoachingPrompt(targetLanguage: string): string {
  return `You are a language expression coach specializing in ${targetLanguage}.

The user will describe an idea in English. Your job is to help them express it naturally in ${targetLanguage}, with attention to social context, register, and cultural appropriateness.

This is NOT translation. You are coaching someone on how a native speaker would actually say this in real life.

Response format (follow exactly):

## Options

1. [${targetLanguage} text] ([romanization])
   - Literal: [word-by-word gloss]
   - Tone: [when/where to use this - casual, formal, flirty, professional, etc.]

2. [${targetLanguage} text] ([romanization])
   - Literal: [word-by-word gloss]
   - Tone: [when/where to use this]

3. [${targetLanguage} text] ([romanization])
   - Literal: [word-by-word gloss]
   - Tone: [when/where to use this]

## Nuance

[1-2 sentences comparing the options. Which is most natural? Which is safer? Which carries more warmth or distance?]

## Social note

[Cultural context, politeness level, or common mistakes. If the user gave social context (e.g. "texting a date"), tailor this specifically.]

Rules:
- Exactly 3 options, ordered casual to formal.
- Romanization: pinyin with tone marks for Mandarin, romaji for Japanese, revised romanization for Korean, standard system for others.
- Each option is one natural sentence or phrase, not a paragraph.
- The "Literal" line is a direct word-by-word gloss, not a polished translation.
- Focus on what a native speaker would ACTUALLY say, not textbook phrasing.
- If the idea is ambiguous, pick the most likely interpretation and note it in Nuance.
- Do NOT add commentary outside the format above.
- Do NOT over-explain grammar.`;
}

// --- edge-tts voice mapping ---

const VOICE_MAP: Record<string, string> = {
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

function resolveVoice(voice: string | undefined, targetLanguage: string): string {
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

// --- Auto-detect voice from text script ---

function detectVoiceFromText(text: string): string {
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

// --- Cross-platform audio playback ---

async function playAudio(filepath: string): Promise<void> {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      await execFileAsync("afplay", [filepath]);
    } else if (platform === "linux") {
      for (const player of ["mpv", "paplay", "aplay"]) {
        try {
          await execFileAsync(player, [filepath]);
          return;
        } catch {
          continue;
        }
      }
    } else if (platform === "win32") {
      await execFileAsync("powershell", [
        "-c",
        `(New-Object Media.SoundPlayer '${filepath}').PlaySync()`,
      ]);
    }
  } catch {
    // Silent failure - file path is in the response text
  }
}

// --- State ---

let lastAudioFile: string | null = null;

// --- MCP Server ---

const server = new McpServer(
  {
    name: "konid-ai",
    version: "1.0.2",
  },
  {
    instructions: `konid is a language expression coach with audio playback.
Use the "coach" tool whenever the user asks how to say something in another language, wants to express an idea in a foreign language, or asks about phrasing/wording in any non-English language. This includes questions like "how do I say X in Y", "what's the right way to say X", "how would a native speaker say X", etc.
Use the "speak" tool to pronounce any foreign language text aloud through the user's speakers. Use it automatically after coaching to let the user hear the options. Also use it when the user says "say it", "pronounce it", "how does it sound", "speak", or "read it aloud".
Use the "replay" tool when the user says "again", "replay", "repeat", or "one more time".
Always prefer these tools over inline text responses for language expression tasks.
If a tool call fails with an authentication error, tell the user they need to set their ANTHROPIC_API_KEY environment variable. They can get a key at https://console.anthropic.com/settings/keys and then either: (1) run "export ANTHROPIC_API_KEY=sk-ant-..." in their terminal before starting Claude Code, or (2) add it to their shell profile (~/.zshrc or ~/.bashrc).`,
  },
);

server.tool(
  "coach",
  "Express an idea naturally in a target language. Returns 3 socially-calibrated options with romanization, literal meanings, tone notes, and cultural context. Each option is numbered for use with the speak tool.",
  {
    text: z.string().describe("The idea you want to express (in English)"),
    target_language: z
      .string()
      .default("Mandarin Chinese")
      .describe("Target language (e.g. 'Mandarin Chinese', 'Japanese', 'Korean', 'Spanish')"),
    context: z
      .string()
      .optional()
      .describe("Social context: who you're talking to, the situation (e.g. 'texting a date', 'email to boss', 'casual with friends')"),
  },
  async ({ text, target_language, context }) => {
    const userMessage = context
      ? `Idea: "${text}"\nContext: ${context}`
      : `Idea: "${text}"`;

    const response = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: 1024,
      system: buildCoachingPrompt(target_language),
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return {
      content: [
        {
          type: "text" as const,
          text: textBlock && "text" in textBlock ? textBlock.text : "No response generated.",
        },
      ],
    };
  },
);

server.tool(
  "speak",
  "Speak text aloud using text-to-speech. Generates audio and plays it through speakers. Use after coach to hear how a phrase sounds.",
  {
    text: z.string().describe("The text to speak (in the target language)"),
    meaning: z
      .string()
      .optional()
      .describe("English meaning of the text (e.g. 'thanks', 'thank you'). Include this so the output is understandable without context."),
    slow: z
      .boolean()
      .default(false)
      .describe("Speak at a slower pace for clearer pronunciation"),
    voice: z
      .string()
      .optional()
      .describe("edge-tts voice name (e.g. 'zh-CN-YunjianNeural', 'zh-CN-XiaoxiaoNeural'). Auto-detected from text if omitted."),
  },
  async ({ text, meaning, slow, voice }) => {
    await mkdir(AUDIO_DIR, { recursive: true });

    const resolvedVoice = voice ?? detectVoiceFromText(text);
    const filepath = join(AUDIO_DIR, `konid-${Date.now()}.mp3`);

    try {
      const tts = new EdgeTTS({ voice: resolvedVoice, ...(slow ? { rate: "-30%" } : {}) });
      await tts.ttsPromise(text, filepath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to generate audio.\n\nError: ${message}`,
          },
        ],
      };
    }

    // Play audio (fire-and-forget)
    lastAudioFile = filepath;
    playAudio(filepath);

    return {
      content: [
        {
          type: "text" as const,
          text: `Speaking: "${text}"${meaning ? ` - ${meaning}` : ""}\nVoice: ${resolvedVoice} | Speed: ${slow ? "slow" : "normal"}\nAudio: ${filepath}`,
        },
      ],
    };
  },
);

server.tool(
  "replay",
  "Replay the last spoken audio clip. Use when the user says 'again', 'replay', 'repeat', or 'play it again'.",
  {},
  async () => {
    if (!lastAudioFile) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Nothing to replay - use speak first.",
          },
        ],
      };
    }

    playAudio(lastAudioFile);

    return {
      content: [
        {
          type: "text" as const,
          text: `Replaying: ${lastAudioFile}`,
        },
      ],
    };
  },
);

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
