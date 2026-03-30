# kodin

Your language expression wizard — an MCP server for Claude Code that coaches you on natural, socially-aware expression in any language.

This is not a translator. kodin is an expression coach: tell it what you want to say, and it shows you how a native speaker would actually say it — with cultural context, tone notes, and audio you can play through your speakers.

## Quick Start

### Prerequisites

- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- Python 3 with edge-tts: `pip install edge-tts`
- `ANTHROPIC_API_KEY` environment variable set

### Install

```bash
claude mcp add kodin-ai -- npx -y kodin-ai
```

Or add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "kodin": {
      "command": "npx",
      "args": ["-y", "kodin-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

## How It Works

**You:** "how do I say 'we'll see' in Chinese?"

**kodin returns 3 options, casual to formal:**

1. **再说吧** (zai shuo ba) — casual, slightly evasive, can function as a soft "no"
2. **看情况吧** (kan qingkuang ba) — "depends on the situation," genuinely open-minded
3. **到时候再看吧** (dao shihou zai kan ba) — "let's wait and see," most neutral

Plus cultural context: "再说吧 is frequently used as a polite way to decline without directly saying no."

**You:** "speak 1"

Audio plays through your speakers.

## Tools

### coach

Express an idea naturally in a target language. Returns 3 socially-calibrated options with romanization, literal meanings, tone notes, and cultural context.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `text` | The idea you want to express (in English) | required |
| `target_language` | Target language | Mandarin Chinese |
| `context` | Social context (e.g. "texting a date", "email to boss") | optional |

### speak

Speak text aloud using text-to-speech. Generates audio and plays it through your speakers.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `text` | Text to speak (in the target language) | required |
| `slow` | Slower pace for clearer pronunciation | false |
| `voice` | edge-tts voice name | auto-detected |

### replay

Replay the last spoken audio clip.

## Supported Languages

| Language | Voice |
|----------|-------|
| Mandarin Chinese | zh-CN-YunjianNeural |
| Taiwanese Mandarin | zh-TW-YunJheNeural |
| Japanese | ja-JP-KeitaNeural |
| Korean | ko-KR-InJoonNeural |
| Spanish | es-ES-AlvaroNeural |
| French | fr-FR-HenriNeural |
| German | de-DE-ConradNeural |
| Portuguese | pt-BR-AntonioNeural |
| Italian | it-IT-DiegoNeural |
| Russian | ru-RU-DmitryNeural |
| Arabic | ar-SA-HamedNeural |
| Hindi | hi-IN-MadhurNeural |
| English | en-US-GuyNeural |

Any language Claude knows can be coached — the voice auto-detection covers the above, and you can pass a specific `voice` parameter for others.

## Audio Playback

kodin plays audio through your system speakers automatically:

- **macOS**: uses `afplay` (built-in)
- **Linux**: tries `mpv`, `paplay`, `aplay` in order
- **Windows**: uses PowerShell `SoundPlayer`

If no audio player is available, the file path is included in the response so you can open it manually.

## License

MIT
