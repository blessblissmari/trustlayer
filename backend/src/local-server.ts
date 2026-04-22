// Local dev server. Wraps the same `route` entry point used by the Yandex
// Cloud Function handler, so behaviour stays consistent between prod and dev.
//
// Uses Node's built-in `http` so there are zero runtime dependencies.

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { loadConfig } from "./config.js";
import { route } from "./router.js";

// Tiny .env loader (no dotenv dependency).
function loadDotenv(): void {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* no .env file, that's fine */
  }
}

loadDotenv();

const config = loadConfig();
const port = Number(process.env.PORT) || 8787;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const query: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) query[k] = v;

  const raw = await readBody(req);
  let body: unknown = null;
  if (raw.length > 0) {
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON body." }));
      return;
    }
  }

  const result = await route(
    { method: req.method ?? "GET", path: url.pathname, query, body },
    config,
  );

  res.writeHead(result.status, result.headers);
  res.end(result.body);
});

server.listen(port, () => {
  console.log(
    `[trustlayer] local server listening on http://localhost:${port} (AI_MODE=${config.aiMode})`,
  );
});
