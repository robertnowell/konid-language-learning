#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, readdir, unlink, stat } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { coach } from "./core/coaching.js";
import { generateAudio, AUDIO_DIR } from "./core/tts.js";
import { MCP_INSTRUCTIONS } from "./shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.KONID_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// --- Audio cleanup: delete files older than 1 hour ---

async function cleanupAudio() {
  try {
    const files = await readdir(AUDIO_DIR);
    const now = Date.now();
    for (const file of files) {
      const filepath = join(AUDIO_DIR, file);
      const s = await stat(filepath);
      if (now - s.mtimeMs > 60 * 60 * 1000) {
        await unlink(filepath).catch(() => {});
      }
    }
  } catch {
    // AUDIO_DIR may not exist yet
  }
}
setInterval(cleanupAudio, 30 * 60 * 1000);

// --- MCP Server ---

function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "konid-ai", version: "1.0.4" },
    { instructions: MCP_INSTRUCTIONS },
  );

  server.tool(
    "coach",
    "Express an idea naturally in a target language. Returns 3 socially-calibrated options with romanization, literal meanings, tone notes, and cultural context.",
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
      console.log(`[coach] Called: text="${text}" lang="${target_language}"`);
      try {
        const result = await coach(text, target_language, context);
        console.log(`[coach] Success: ${result.slice(0, 80)}`);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        console.error("[coach] Error:", err);
        return { content: [{ type: "text" as const, text: `Error: ${String(err)}` }] };
      }
    },
  );

  // Register audio player widget as an MCP resource (for ChatGPT Apps)
  server.resource(
    "audio-player",
    "konid://audio-player",
    { mimeType: "text/html;profile=mcp-app" },
    async () => {
      const widgetPath = join(__dirname, "..", "chatgpt-app", "public", "audio-player.html");
      const html = await readFile(widgetPath, "utf-8");
      return { contents: [{ uri: "konid://audio-player", mimeType: "text/html;profile=mcp-app", text: html }] };
    },
  );

  server.tool(
    "speak",
    "Generate audio pronunciation of text. Returns an audio URL that can be played in the client.",
    {
      text: z.string().describe("The text to speak (in the target language)"),
      meaning: z
        .string()
        .optional()
        .describe("English meaning of the text (e.g. 'thanks', 'thank you')."),
      slow: z
        .boolean()
        .default(false)
        .describe("Speak at a slower pace for clearer pronunciation"),
      voice: z
        .string()
        .optional()
        .describe("edge-tts voice name (e.g. 'zh-CN-YunjianNeural'). Auto-detected from text if omitted."),
    },
    async ({ text, meaning, slow, voice }) => {
      try {
        const { filepath, resolvedVoice } = await generateAudio(text, { voice, slow });
        const filename = basename(filepath);
        const audioUrl = `${BASE_URL}/audio/${filename}`;
        const speed = slow ? "slow" : "normal";

        return {
          content: [{
            type: "text" as const,
            text: `Speaking: "${text}"${meaning ? ` - ${meaning}` : ""}\nVoice: ${resolvedVoice} | Speed: ${speed}\n\n[Listen to pronunciation](${audioUrl})`,
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

  return server;
}

// --- HTTP server ---

async function readBody(req: IncomingMessage): Promise<unknown | null> {
  const raw = await new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => resolve(data));
  });
  try { return JSON.parse(raw); } catch { return null; }
}

// Per-session transports (Streamable HTTP)
const transports = new Map<string, StreamableHTTPServerTransport>();

// Per-session SSE transports (legacy, used by Claude Desktop/Cowork)
const sseTransports = new Map<string, SSEServerTransport>();

async function handleSSE(req: IncomingMessage, res: ServerResponse) {
  console.log(`[SSE] ${req.method} ${req.url}`);
  const transport = new SSEServerTransport("/message", res);
  const mcpServer = createMcpServer();

  sseTransports.set(transport.sessionId, transport);
  transport.onclose = () => {
    sseTransports.delete(transport.sessionId);
  };

  await mcpServer.connect(transport);
  await transport.start();
}

async function handleMessage(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  console.log(`[SSE] POST /message sessionId=${sessionId}`);

  if (!sessionId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing sessionId" }));
    return;
  }

  const transport = sseTransports.get(sessionId);
  if (!transport) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not found" }));
    return;
  }

  await transport.handlePostMessage(req, res);
}

async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  // Read session ID from header
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  console.log(`[MCP] ${req.method} sessionId=${sessionId}`);

  // For any request with a known session, route to its transport
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    if (req.method === "DELETE") {
      await transport.close();
      transports.delete(sessionId);
      res.writeHead(200);
      res.end();
      return;
    }
    await transport.handleRequest(req, res);
    return;
  }

  // Unknown session ID — return 404 so client reconnects with a fresh session
  if (sessionId && !transports.has(sessionId)) {
    console.log(`[MCP] Unknown session ${sessionId}, returning 404 to force reconnect`);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not found. Please reinitialize." }));
    return;
  }

  // No session — only accept POST with initialize
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
    return;
  }

  // Create new transport + server for this session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);

  if (transport.sessionId) {
    transports.set(transport.sessionId, transport);
    console.log(`[MCP] New session: ${transport.sessionId}`);
  }
}

async function handleAudio(req: IncomingMessage, res: ServerResponse) {
  const filename = req.url?.replace("/audio/", "") ?? "";

  // Sanitize: only allow konid-*.mp3
  if (!/^konid-\d+\.mp3$/.test(filename)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const filepath = join(AUDIO_DIR, filename);
  try {
    const data = await readFile(filepath);
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": data.length,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

async function handleWidget(_req: IncomingMessage, res: ServerResponse) {
  const widgetPath = join(__dirname, "..", "chatgpt-app", "public", "audio-player.html");
  try {
    const html = await readFile(widgetPath, "utf-8");
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    });
    res.end(html);
  } catch {
    res.writeHead(404);
    res.end("Widget not found");
  }
}

const httpServer = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  // Add CORS headers to all responses
  res.setHeader("Access-Control-Allow-Origin", "*");

  const url = req.url ?? "/";

  console.log(`[HTTP] ${req.method} ${url}`);

  if (url === "/mcp") {
    await handleMcp(req, res);
  } else if (url === "/sse" && req.method === "GET") {
    await handleSSE(req, res);
  } else if (url.startsWith("/message") && req.method === "POST") {
    await handleMessage(req, res);
  } else if (url.startsWith("/audio/")) {
    await handleAudio(req, res);
  } else if (url === "/widget/audio-player.html") {
    await handleWidget(req, res);
  } else if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else if (url.startsWith("/.well-known/") || url === "/register") {
    // Cowork probes for OAuth — return 404 to signal no auth required
    res.writeHead(404);
    res.end("Not found");
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

httpServer.listen(PORT, () => {
  console.log(`konid-ai remote server listening on ${BASE_URL}`);
  console.log(`  MCP endpoint: ${BASE_URL}/mcp`);
  console.log(`  Audio files:  ${BASE_URL}/audio/`);
  console.log(`  Health check: ${BASE_URL}/health`);
});
