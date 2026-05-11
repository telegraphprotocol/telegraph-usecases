/**
 * Env: SERP_API_KEY, RESOURCE_SERVER_URL or TELEGRAPH_BASE_URL (dispatcher base, e.g. :7044),
 * SOLANA_PRIVATE_KEY (base58), optional ITSAI_REQUEST_TIMEOUT_MS (default 60000), PORT (default 3001).
 * Optional CORS_ORIGIN or FRONTEND_ORIGIN (e.g. http://localhost:5173) for browser clients when not using Vite proxy.
 * Same x402 + ItsAI pattern as telegraph-truthwire/api (plain x402Client, solana:* registration).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import dotenv from "dotenv";
import { analyzeRouter } from "./routes/analyze.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();

const corsOrigin = process.env.CORS_ORIGIN?.trim() || process.env.FRONTEND_ORIGIN?.trim();
if (corsOrigin) {
  const allowed = corsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin as string | undefined;
    let value: string;
    if (allowed.includes("*")) {
      value = "*";
    } else if (requestOrigin && allowed.includes(requestOrigin)) {
      value = requestOrigin;
    } else {
      value = allowed[0] ?? "*";
    }
    res.header("Access-Control-Allow-Origin", value);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "review-checker-api" });
});

app.use(express.json({ limit: "1mb" }));
app.use("/api", analyzeRouter);

const port = Number(process.env.PORT) || 3005;
const server = app.listen(port, () => {
  console.error(`review-checker-api listening on http://localhost:${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use (another API or \`npm run dev\`?). Stop it or run: PORT=3002 npm start`,
    );
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
