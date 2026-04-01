import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("[konid] WARNING: ANTHROPIC_API_KEY is not set");
}
const anthropic = new Anthropic({ apiKey: apiKey || "" });
const COACH_MODEL = process.env.KONID_MODEL ?? "claude-sonnet-4-6";

export function buildCoachingPrompt(targetLanguage: string): string {
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

export async function coach(
  text: string,
  targetLanguage: string,
  context?: string,
): Promise<string> {
  const userMessage = context
    ? `Idea: "${text}"\nContext: ${context}`
    : `Idea: "${text}"`;

  const response = await anthropic.messages.create({
    model: COACH_MODEL,
    max_tokens: 1024,
    system: buildCoachingPrompt(targetLanguage),
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock
    ? textBlock.text
    : "No response generated.";
}
