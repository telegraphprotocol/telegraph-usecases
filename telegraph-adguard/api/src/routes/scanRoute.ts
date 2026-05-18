import { Router, Request, Response } from "express";
import { z } from "zod";
import { UpstreamError } from "../errors";
import { ContentExtractorService } from "../services/contentExtractorService";
import { ThreatAnalysisService } from "../services/threatAnalysisService";
import { CampaignGuardService } from "../services/campaignGuardService";
import type { ScanResult } from "../types";

const ScanRequestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  googleAdsToken: z.string().optional().default(""),
  customerId: z.string().optional().default(""),
  campaignIds: z.array(z.string()).optional().default([]),
  threshold: z.number().min(0).max(100).optional().default(70)
});

export function createScanRoute(
  contentExtractor: ContentExtractorService,
  threatAnalyzer: ThreatAnalysisService,
  campaignGuard: CampaignGuardService
): Router {
  const router = Router();

  router.post("/scan", async (req: Request, res: Response) => {
    let parsed;
    try {
      parsed = ScanRequestSchema.parse(req.body);
    } catch (error) {
      const msg = error instanceof z.ZodError
        ? error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
        : "Invalid request body";
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: msg } });
      return;
    }

    const { url, googleAdsToken, customerId, campaignIds, threshold } = parsed;

    try {
      // Step 1: Extract content from URL
      const content = await contentExtractor.extract(url);

      // Step 2: Analyze for deepfakes and fake news (with x402 payments)
      const { analysis, payment } = await threatAnalyzer.analyze(content, threshold);

      // Step 3: Guard campaigns if configured
      const campaignGuardResult = await campaignGuard.guard(analysis, {
        customerId,
        campaignIds,
        accessToken: googleAdsToken,
        threshold
      });

      const result: ScanResult = {
        content: {
          url: content.url,
          title: content.title,
          textLength: content.text.length,
          imageCount: content.imageUrls.length,
          analyzedImageCount: analysis.images.filter((i) => i.status === "analyzed").length,
          extractedAt: content.extractedAt
        },
        analysis,
        campaignGuard: campaignGuardResult,
        payment
      };

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof UpstreamError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
        return;
      }
      console.error("[scan] Unexpected error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
    }
  });

  return router;
}
