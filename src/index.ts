import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import OpenAI from "openai";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const openai = new OpenAI();
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
   - Tone: [when/where to use this — casual, formal, flirty, professional, etc.]

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

// --- MCP Server ---

const server = new McpServer({
  name: "konid-ai",
  version: "0.1.0",
});

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildCoachingPrompt(target_language) },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: response.choices[0]?.message?.content ?? "No response generated.",
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
    slow: z
      .boolean()
      .default(false)
      .describe("Speak at a slower pace for clearer pronunciation"),
    voice: z
      .string()
      .optional()
      .describe("edge-tts voice name (e.g. 'zh-CN-YunjianNeural', 'zh-CN-XiaoxiaoNeural'). Auto-detected from text if omitted."),
  },
  async ({ text, slow, voice }) => {
    await mkdir(AUDIO_DIR, { recursive: true });

    const resolvedVoice = voice ?? VOICE_MAP["zh-CN"];
    const filepath = join(AUDIO_DIR, `konid-${Date.now()}.mp3`);

    const args = [
      "--text", text,
      "--voice", resolvedVoice,
      "--write-media", filepath,
    ];

    if (slow) {
      args.push("--rate", "-30%");
    }

    try {
      await execFileAsync("edge-tts", args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to generate audio. Is edge-tts installed? (pip install edge-tts)\n\nError: ${message}`,
          },
        ],
      };
    }

    // Play audio (fire-and-forget)
    execFileAsync("/usr/bin/afplay", [filepath]).catch(() => {});

    return {
      content: [
        {
          type: "text" as const,
          text: `Speaking: "${text}"\nVoice: ${resolvedVoice} | Speed: ${slow ? "slow" : "normal"}\nAudio: ${filepath}`,
        },
      ],
    };
  },
);

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
