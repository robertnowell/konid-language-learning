# konid ChatGPT App

A ChatGPT App that provides language expression coaching with inline audio playback.

## How it works

The app connects to the konid remote MCP server and exposes two tools to ChatGPT:

- **coach** — Generates 3 socially-calibrated expression options in any target language
- **speak** — Generates audio pronunciation and renders an inline audio player

ChatGPT proactively uses these tools when users ask about expressing ideas in other languages.

## Architecture

```
ChatGPT ←→ Remote MCP Server (konid.fly.dev/mcp) ←→ Claude API + Edge TTS
                                    ↓
                          Audio Player Widget (iframe)
```

- The MCP server handles coaching (via Claude API) and TTS (via Edge TTS)
- The audio player widget renders inline in the ChatGPT conversation
- Audio files are served from the same remote server

## Development

### Prerequisites

- The konid remote server running (`KONID_REMOTE=1 node dist/index.js`)
- [ngrok](https://ngrok.com/) for exposing the local server
- ChatGPT Developer Mode enabled (Settings → Apps → Advanced settings)

### Testing locally

1. Start the remote server:
   ```bash
   cd .. && KONID_REMOTE=1 KONID_BASE_URL=https://your-ngrok-url.ngrok.io pnpm start
   ```

2. Expose via ngrok:
   ```bash
   ngrok http 3000
   ```

3. In ChatGPT, enable Developer Mode and add the MCP server URL:
   ```
   https://your-ngrok-url.ngrok.io/mcp
   ```

4. Try asking: "How do I say 'we'll see' in Mandarin?"

### Widget development

The audio player widget is at `public/audio-player.html`. It receives tool results via `postMessage` and renders an `<audio>` element.

To test the widget standalone, open it in a browser and send it a message:
```js
iframe.contentWindow.postMessage({
  type: 'konid:audio',
  data: { text: '你好', meaning: 'hello', voice: 'zh-CN-YunjianNeural', speed: 'normal', audioUrl: 'test.mp3' }
}, '*');
```

## Submitting to ChatGPT App Directory

1. Deploy the remote server to Fly.io (see root `Dockerfile`)
2. Verify the MCP endpoint is accessible: `curl https://konid.fly.dev/health`
3. Submit via [OpenAI Platform Dashboard](https://platform.openai.com)
4. Required info: app name, logo, description, MCP server URL, privacy policy, screenshots
