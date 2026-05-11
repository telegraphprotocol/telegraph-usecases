import express from "express";
import { AppConfig } from "./config";
import { VxTwitterPostProvider } from "./providers/vxTwitterPostProvider";
import { createPostDetailsRoute } from "./routes/postDetailsRoute";
import { createVerifyRoute } from "./routes/verifyRoute";
import { VerificationService } from "./services/verificationService";
import { XPostService } from "./services/xPostService";
import { createPaymentFetch } from "./x402Fetch";

export async function createApp(config: AppConfig) {
  const app = express();
  const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
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

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - started;
      console.log(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  const xProvider = new VxTwitterPostProvider({
    apiBase: config.vxApiBase
  });
  const xPostService = new XPostService(xProvider, "vx-twitter");

  const paymentFetch = await createPaymentFetch();

  const bitmindOpts = {
    baseUrl: config.telegraphBaseUrl,
    subnetPrefix: config.bitmindSubnetPrefix,
    timeoutMs: config.bitmindRequestTimeoutMs
  };

  const itsAiOpts = {
    baseUrl: config.telegraphBaseUrl,
    subnetPrefix: config.itsAiSubnetPrefix,
    timeoutMs: config.itsAiRequestTimeoutMs
  };

  const verificationService = new VerificationService(
    xPostService,
    bitmindOpts,
    itsAiOpts,
    paymentFetch,
    config.solanaNetwork
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/x", createPostDetailsRoute(xPostService));
  app.use("/api/x", createVerifyRoute(verificationService));

  return app;
}
