import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
// @ts-ignore - no type declarations
import { EdgeTTS } from "node-edge-tts";
import { detectVoiceFromText } from "./voices.js";

export const AUDIO_DIR = join(tmpdir(), "konid-ai");

export async function generateAudio(
  text: string,
  options: { voice?: string; slow?: boolean },
): Promise<{ filepath: string; resolvedVoice: string }> {
  await mkdir(AUDIO_DIR, { recursive: true });

  const resolvedVoice = options.voice ?? detectVoiceFromText(text);
  const filepath = join(AUDIO_DIR, `konid-${Date.now()}.mp3`);

  const tts = new EdgeTTS({
    voice: resolvedVoice,
    ...(options.slow ? { rate: "-30%" } : {}),
  });
  await tts.ttsPromise(text, filepath);

  return { filepath, resolvedVoice };
}
