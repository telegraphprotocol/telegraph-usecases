import { Router, Request, Response } from "express";
import { z } from "zod";
import { ScamAnalysisService } from "../services/scamAnalysisService";

const AnalyzeBodySchema = z
  .object({
    phone: z.string().trim().min(1).optional(),
    message: z.string().trim().min(1).optional()
  })
  .refine((d) => d.phone !== undefined || d.message !== undefined, {
    message: "At least one of 'phone' or 'message' must be provided."
  });

export function createAnalyzeRoute(
  service: ScamAnalysisService,
  paymentFetch: typeof fetch
): Router {
  const router = Router();

  router.post("/analyze", async (req: Request, res: Response) => {
    const parsed = AnalyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
      res.status(400).json({ error: { message } });
      return;
    }

    try {
      const result = await service.analyze(parsed.data, paymentFetch);
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[analyze] error:", message);
      res.status(502).json({ error: { message: `Analysis failed: ${message}` } });
    }
  });

  return router;
}
