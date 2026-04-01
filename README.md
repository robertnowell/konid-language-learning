# konid

*konid* (کنید) - Farsi for "do." Take action.

Your language expression wizard. An MCP server for Claude Code that coaches you on natural, socially-aware expression in any language.

<p align="center">
  <img src="docs/hero.gif" alt="Google Translate says 'estoy caliente' for 'I'm hot', which actually means 'I'm horny' in Spanish" width="700">
</p>

This is not a translator. konid is an expression coach: tell it what you want to say, and it shows you how a native speaker would actually say it, with cultural context, tone notes, and audio you can play through your speakers.

## Quick Start

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (or any MCP-compatible client, see below)
- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable set ([get one here](https://console.anthropic.com/settings/keys))

### Install

```bash
claude mcp add konid-ai -- npx -y konid-ai
```

That's it. Start a new Claude Code session and ask something like *"how do I say 'nice to meet you' in Japanese?"*

## How It Works

**You:** "how do I say 'we'll see' in Chinese?"

**konid returns 3 options, casual to formal:**

1. **再说吧** (zài shuō ba) - casual, slightly evasive, can function as a soft "no"
2. **看情况吧** (kàn qíngkuàng ba) - "depends on the situation," genuinely open-minded
3. **到时候再看吧** (dào shíhou zài kàn ba) - "let's wait and see," most neutral

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

### Claude Cowork

> Cowork is available in the Claude desktop app for Pro and Max subscribers.

<a href="https://www.loom.com/share/9ae0d46f7c6d4a6caa2847351aa18ae8">
  <img src="https://cdn.loom.com/sessions/thumbnails/9ae0d46f7c6d4a6caa2847351aa18ae8-with-play.gif" alt="konid Cowork setup video" width="400">
</a>

Install konid as a Cowork plugin — no Node.js or API key required.

1. Download [`konid-ai-plugin.zip`](docs/konid-ai-plugin.zip)
2. In Cowork, click **Customize** in the left sidebar
3. Click the **+** next to "Personal plugins"
4. Select **Create plugin** > **Upload plugin**
5. Choose the `konid-ai-plugin.zip` file

<p align="center">
  <img src="docs/cowork-upload.png" alt="Cowork plugin upload: Customize > + > Create plugin > Upload plugin" width="600">
</p>

Once installed, start a new task and ask something like *"how do I say 'nice to meet you' in Japanese?"* — konid will coach you with 3 options and provide a link to hear the pronunciation.

**Audio:** Cowork's sandbox doesn't support inline audio playback. The `speak` tool returns a clickable link to hear the pronunciation in your browser.

**Alternative (local, with audio playback):** If you have Node.js installed, you can add konid as a local MCP server in `claude_desktop_config.json` instead. This plays audio directly through your speakers:

```json
{
  "mcpServers": {
    "konid-ai": {
      "command": "npx",
      "args": ["-y", "konid-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### ChatGPT

Connect the remote MCP server in Developer Mode:

Settings > Apps > Advanced settings > Developer mode > add `https://konid.fly.dev/mcp`

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
| `voice` | Edge TTS voice name (override auto-detection) | auto-detected |

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

Any language Claude knows can be coached. The voice auto-detection covers the above, and you can pass a specific `voice` parameter for others.

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) | - |
| `KONID_MODEL` | Claude model for coaching | `claude-sonnet-4-6` |

## Audio Playback

konid plays audio through your system speakers automatically:

- **macOS**: uses `afplay` (built-in)
- **Linux**: tries `mpv`, `paplay`, `aplay` in order
- **Windows**: uses PowerShell `SoundPlayer`

If no audio player is available, the file path is included in the response so you can open it manually.

## Remote Server

konid can run as a remote HTTP server for web-based clients (ChatGPT, Claude Cowork remote, etc.):

```bash
# Start remote server
KONID_REMOTE=1 KONID_BASE_URL=https://konid.fly.dev ANTHROPIC_API_KEY=sk-ant-... node dist/index.js

# Or with pnpm
pnpm start:remote
```

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `KONID_REMOTE` | Set to `1` to start HTTP server instead of stdio | - |
| `KONID_BASE_URL` | Public URL for audio file links | `http://localhost:3000` |
| `PORT` | HTTP server port | `3000` |

The remote server exposes:
- `POST /mcp` — MCP Streamable HTTP endpoint
- `GET /audio/:file` — Generated audio files
- `GET /health` — Health check

## Roadmap

- [x] Remove Python/edge-tts dependency (TTS bundled natively)
- [x] Remote HTTP server + ChatGPT App
- [ ] MCP Registry listing
- [ ] Language-specific coaching plugins (idiom databases, formality registers)
- [ ] Hosted version (no API key needed)

## License

MIT
