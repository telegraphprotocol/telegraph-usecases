import { Router } from "express";
import { VerificationService } from "../services/verificationService";
import { xPostUrlRequestSchema } from "../validation/xPostUrl";

export function createVerifyRoute(service: VerificationService): Router {
  const router = Router();

  router.post("/verify", async (req, res) => {
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
      const data = await service.verify(parsed.data.url);
      return res.status(200).json(data);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 502;
      const code = (error as { code?: string }).code ?? "UPSTREAM_FAILURE";
      const message = (error as { message?: string }).message ?? "Verification failed";
      return res.status(status).json({
        error: { code, message }
      });
    }
  });

  return router;
}
