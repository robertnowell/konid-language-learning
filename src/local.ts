#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { coach } from "./core/coaching.js";
import { generateAudio } from "./core/tts.js";
import { MCP_INSTRUCTIONS } from "./shared.js";

const execFileAsync = promisify(execFile);

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
  { name: "konid-ai", version: "1.0.4" },
  { instructions: MCP_INSTRUCTIONS },
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
    const result = await coach(text, target_language, context);
    return { content: [{ type: "text" as const, text: result }] };
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
    try {
      const { filepath, resolvedVoice } = await generateAudio(text, { voice, slow });
      lastAudioFile = filepath;
      playAudio(filepath);

      return {
        content: [{
          type: "text" as const,
          text: `Speaking: "${text}"${meaning ? ` - ${meaning}` : ""}\nVoice: ${resolvedVoice} | Speed: ${slow ? "slow" : "normal"}\nAudio: ${filepath}`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Failed to generate audio.\n\nError: ${message}` }],
      };
    }
  },
);

server.tool(
  "replay",
  "Replay the last spoken audio clip. Use when the user says 'again', 'replay', 'repeat', or 'play it again'.",
  {},
  async () => {
    if (!lastAudioFile) {
      return {
        content: [{ type: "text" as const, text: "Nothing to replay - use speak first." }],
      };
    }
    playAudio(lastAudioFile);
    return {
      content: [{ type: "text" as const, text: `Replaying: ${lastAudioFile}` }],
    };
  },
);

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
