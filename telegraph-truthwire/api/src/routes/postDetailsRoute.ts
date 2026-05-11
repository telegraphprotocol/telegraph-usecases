import { Router } from "express";
import { XPostService } from "../services/xPostService";
import { xPostUrlRequestSchema } from "../validation/xPostUrl";

export function createPostDetailsRoute(service: XPostService): Router {
  const router = Router();

  router.post("/post-details", async (req, res) => {
    const parsed = xPostUrlRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Invalid request payload",
          details: parsed.error.issues
        }
      });
    }

    try {
      const data = await service.getPostDetails(parsed.data.url);
      return res.status(200).json(data);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 502;
      const code = (error as { code?: string }).code ?? "UPSTREAM_FAILURE";
      return res.status(status).json({
        error: {
          code,
          message: "Failed to fetch post details"
        }
      });
    }
  });

  return router;
}
