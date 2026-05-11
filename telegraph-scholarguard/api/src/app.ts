import express, { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { BitMindClientOptions } from "./clients/bitmindClient";
import { ItsAiClientOptions } from "./clients/itsAiClient";
import { createVerifyRoute } from "./routes/verifyRoute";
import { VerificationService } from "./services/verificationService";
import { createPaymentFetch } from "./x402Fetch";

export async function createApp() {
  const app = express();

  // --- CORS ---
  const allowedOrigins = config.frontendOrigin;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = req.headers.origin;
    const allowAnyOrigin = allowedOrigins.length === 0;
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

  // --- Request logging ---
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - started;
      console.log(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  // --- Services ---
  const paymentFetch = await createPaymentFetch();

  const bitmindOpts: Omit<BitMindClientOptions, "fetchImpl"> = {
    baseUrl: config.telegraphBaseUrl,
    subnetPrefix: config.bitmindSubnetPrefix,
    timeoutMs: config.requestTimeoutMs
  };

  const itsAiOpts: Omit<ItsAiClientOptions, "fetchImpl"> = {
    baseUrl: config.telegraphBaseUrl,
    subnetPrefix: config.itsaiSubnetPrefix,
    timeoutMs: config.requestTimeoutMs
  };

  const verificationService = new VerificationService(
    bitmindOpts,
    itsAiOpts,
    paymentFetch,
    config.solanaNetwork
  );

  // --- Routes ---
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/assignment", createVerifyRoute(verificationService));

  // --- Global error handler ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[error]", err.message);
    const status = (err as { status?: number }).status ?? 500;
    const code = (err as { code?: string }).code ?? "INTERNAL_ERROR";
    res.status(status).json({ error: { code, message: err.message } });
  });

  return app;
}
