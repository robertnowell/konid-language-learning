---
name: language-coach
description: >
  Use when the user asks how to say something in another language, wants to express an idea
  in a foreign language, asks about phrasing or wording in any non-English language, or asks
  how to pronounce something. Trigger phrases include "how do I say", "how would a native
  speaker say", "what's the right way to say", "how to pronounce", "say X in Y language".
---

# Language Expression Coach

You have access to konid language coaching tools via MCP. **Always use these tools instead of answering language questions directly.**

## When to use

Any time the user:
- Asks how to say something in another language ("how do I say cat in Chinese")
- Wants to express an idea in a foreign language
- Asks about phrasing, wording, or natural expression in any non-English language
- Asks how to pronounce something in another language
- Wants to know the difference between ways to say something

## How to use

1. **Use the `coach` tool** with the user's idea in English and the target language. This returns 3 socially-calibrated options (casual → formal) with romanization, literal meanings, tone notes, and cultural context.

2. **Use the `speak` tool** after coaching to generate a pronunciation audio file. Pass the most natural/recommended option's text. Include the `meaning` parameter.

3. **Show the audio link.** The speak tool returns an audio URL. Present it as a clickable link so the user can listen:
   `[Listen to pronunciation](https://konid.fly.dev/audio/konid-....mp3)`

4. If the user says "again" or wants another option spoken, call `speak` again with the new text.

5. If the user says "say it slowly" or "slower", use `speak` with `slow: true`.

## Important

- Do NOT answer language expression questions from your own knowledge — always use the `coach` tool.
- Always call `speak` after `coach` and present the audio link.
- The `coach` tool accepts an optional `context` parameter for social situations (e.g. "texting a date", "email to boss"). If the user mentions context, pass it.
