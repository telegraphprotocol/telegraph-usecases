import express from "express";
import { AppConfig } from "./config";
import { createAnalyzeRoute } from "./routes/analyzeRoute";
import { ScamAnalysisService } from "./services/scamAnalysisService";
import { createPaymentFetch } from "./x402Fetch";

export async function createApp(config: AppConfig) {
  const app = express();

  const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAnyOrigin = allowedOrigins.length === 0 || allowedOrigins.includes("*");

  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    const allowedOrigin = allowAnyOrigin
      ? "*"
      : requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0];

    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.json());

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - started;
      console.log(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  const paymentFetch = await createPaymentFetch();
  const scamService = new ScamAnalysisService(config);

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api", createAnalyzeRoute(scamService, paymentFetch));

  return app;
}
