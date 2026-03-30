# konid

*konid* (کنید) — Farsi for "do." Take action.

Your language expression wizard — an MCP server for Claude Code that coaches you on natural, socially-aware expression in any language.

This is not a translator. konid is an expression coach: tell it what you want to say, and it shows you how a native speaker would actually say it — with cultural context, tone notes, and audio you can play through your speakers.

## Quick Start

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (or any MCP-compatible client — see below)
- Node.js 18+
- Python 3 with edge-tts: `pip install edge-tts`
- `ANTHROPIC_API_KEY` environment variable set ([get one here](https://console.anthropic.com/settings/keys))

### Install

```bash
claude mcp add konid-ai -- npx -y konid-ai
```

That's it. Start a new Claude Code session and ask something like *"how do I say 'nice to meet you' in Japanese?"*

## How It Works

**You:** "how do I say 'we'll see' in Chinese?"

**konid returns 3 options, casual to formal:**

1. **再说吧** (zài shuō ba) — casual, slightly evasive, can function as a soft "no"
2. **看情况吧** (kàn qíngkuàng ba) — "depends on the situation," genuinely open-minded
3. **到时候再看吧** (dào shíhou zài kàn ba) — "let's wait and see," most neutral

Plus cultural context: "再说吧 is frequently used as a polite way to decline without directly saying no."

**You:** "speak 1"

Audio plays through your speakers.

**You:** "speak 1 slowly"

Slower pronunciation for practice.

## Works with

konid runs as a stdio MCP server, which means it works with any client that supports the protocol. The config is nearly identical across tools:

### Claude Code

```bash
claude mcp add konid-ai -- npx -y konid-ai
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "konid": {
      "command": "npx",
      "args": ["-y", "konid-ai"]
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "konid": {
      "command": "npx",
      "args": ["-y", "konid-ai"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "konid": {
      "command": "npx",
      "args": ["-y", "konid-ai"]
    }
  }
}
```

### Zed

Add to `settings.json`:

```json
{
  "context_servers": {
    "konid": {
      "command": {
        "path": "npx",
        "args": ["-y", "konid-ai"]
      }
    }
  }
}
```

### JetBrains (2025.1+)

Settings > Tools > AI Assistant > MCP Servers > Add > command: `npx`, args: `-y konid-ai`

## Tools

### coach

Express an idea naturally in a target language. Returns 3 socially-calibrated options with romanization, literal meanings, tone notes, and cultural context.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `text` | The idea you want to express (in English) | required |
| `target_language` | Target language | Mandarin Chinese |
| `context` | Social context (e.g. "texting a date", "email to boss") | optional |

### speak

Speak text aloud using text-to-speech. Generates audio and plays it through your speakers. Auto-detects the language from the text script.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `text` | Text to speak (in the target language) | required |
| `slow` | Slower pace for clearer pronunciation | false |
| `voice` | edge-tts voice name (override auto-detection) | auto-detected |

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

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) | — |
| `KONID_MODEL` | Claude model for coaching | `claude-sonnet-4-6` |

## Audio Playback

konid plays audio through your system speakers automatically:

- **macOS**: uses `afplay` (built-in)
- **Linux**: tries `mpv`, `paplay`, `aplay` in order
- **Windows**: uses PowerShell `SoundPlayer`

If no audio player is available, the file path is included in the response so you can open it manually.

## Roadmap

- [ ] Remove Python/edge-tts dependency (bundle TTS natively)
- [ ] ChatGPT connector (requires HTTP transport)
- [ ] MCP Registry listing
- [ ] Language-specific coaching plugins (idiom databases, formality registers)
- [ ] Hosted version (no API key needed)

## License

MIT
