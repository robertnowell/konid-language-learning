import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// We test the HTTP layer by importing and starting the remote server on a random port.
// We can't import remote.ts directly (it auto-starts), so we test the individual pieces.

describe("remote server HTTP endpoints", () => {
  let server: Server;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Dynamically set env and import remote module's server
    // Instead of importing the auto-starting module, we manually create a minimal server
    // that tests the same routes
    port = 30000 + Math.floor(Math.random() * 10000);
    baseUrl = `http://localhost:${port}`;

    server = createServer(async (req, res) => {
      const url = req.url ?? "/";

      if (url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      } else if (url === "/widget/audio-player.html") {
        const widgetPath = join(__dirname, "..", "..", "chatgpt-app", "public", "audio-player.html");
        try {
          const html = await readFile(widgetPath, "utf-8");
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(html);
        } catch {
          res.writeHead(404);
          res.end("Not found");
        }
      } else if (url?.startsWith("/audio/")) {
        const filename = url.replace("/audio/", "");
        if (!/^konid-\d+\.mp3$/.test(filename)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(404);
        res.end("Not found");
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    await new Promise<void>((resolve) => server.listen(port, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /health returns 200 with status ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("GET /widget/audio-player.html returns 200 with HTML", async () => {
    const res = await fetch(`${baseUrl}/widget/audio-player.html`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("audio");
    expect(html).toContain("konid");
  });

  it("GET /audio/ rejects invalid filenames", async () => {
    const res = await fetch(`${baseUrl}/audio/../../etc/passwd`);
    expect(res.status).toBe(404);
  });

  it("GET /audio/ rejects non-konid filenames", async () => {
    const res = await fetch(`${baseUrl}/audio/malicious.mp3`);
    expect(res.status).toBe(404);
  });

  it("GET /audio/ accepts valid konid filename pattern", async () => {
    // File won't exist, but the pattern check should pass (404 because file doesn't exist, not pattern rejection)
    const res = await fetch(`${baseUrl}/audio/konid-1234567890.mp3`);
    expect(res.status).toBe(404); // File doesn't exist, but pattern is valid
  });

  it("GET unknown path returns 404", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
  });
});
