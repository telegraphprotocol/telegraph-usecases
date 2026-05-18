import { Router, Request, Response } from "express";
import { GoogleAdsClient } from "../clients/googleAdsClient";
import { UpstreamError } from "../errors";

export function createCampaignsRoute(gadsClient: GoogleAdsClient): Router {
  const router = Router();

  router.get("/ads/campaigns", async (req: Request, res: Response) => {
    const customerId = (req.query.customerId as string | undefined)?.trim();
    if (!customerId) {
      res.status(400).json({ error: { code: "MISSING_CUSTOMER_ID", message: "customerId query parameter is required" } });
      return;
    }

    const authHeader = req.headers.authorization ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

    try {
      const campaigns = await gadsClient.listCampaigns(customerId, accessToken);
      res.status(200).json({ campaigns, customerId });
    } catch (error) {
      if (error instanceof UpstreamError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
        return;
      }
      console.error("[campaigns] Unexpected error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch campaigns" } });
    }
  });

  return router;
}
