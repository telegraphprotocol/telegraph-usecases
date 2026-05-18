import express from "express";
import { AppConfig } from "./config";
import { GoogleAdsClient } from "./clients/googleAdsClient";
import { ContentExtractorService } from "./services/contentExtractorService";
import { ThreatAnalysisService } from "./services/threatAnalysisService";
import { CampaignGuardService } from "./services/campaignGuardService";
import { createScanRoute } from "./routes/scanRoute";
import { createCampaignsRoute } from "./routes/campaignsRoute";
import { createPaymentFetch } from "./x402Fetch";

export async function createApp(config: AppConfig) {
  const app = express();

  const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
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

    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json());

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      console.log(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      simulateMode: config.googleAdsSimulate,
      solanaNetwork: config.solanaNetwork
    });
  });

  const paymentFetch = await createPaymentFetch();

  const contentExtractor = new ContentExtractorService(config.contentFetchTimeoutMs, config.contentMaxImages);

  const threatAnalyzer = new ThreatAnalysisService(
    { baseUrl: config.telegraphBaseUrl, subnetPrefix: config.bitmindSubnetPrefix, timeoutMs: config.bitmindRequestTimeoutMs },
    { baseUrl: config.telegraphBaseUrl, subnetPrefix: config.itsAiSubnetPrefix, timeoutMs: config.itsAiRequestTimeoutMs },
    paymentFetch,
    config.solanaNetwork
  );

  const gadsClient = new GoogleAdsClient({
    baseUrl: config.googleAdsBaseUrl,
    developerToken: config.googleAdsDeveloperToken,
    simulateMode: config.googleAdsSimulate
  });

  const campaignGuard = new CampaignGuardService(gadsClient);

  app.use("/api", createScanRoute(contentExtractor, threatAnalyzer, campaignGuard));
  app.use("/api", createCampaignsRoute(gadsClient));

  return app;
}
