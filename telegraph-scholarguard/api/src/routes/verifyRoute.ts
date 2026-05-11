import { Router } from "express";
import multer from "multer";
import { parseDocument } from "../services/documentParserService";
import { VerificationService } from "../services/verificationService";

const ACCEPTED_MIMETYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ACCEPTED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type "${file.mimetype}". Accepted: PDF, DOCX`
        )
      );
    }
  }
});

export function createVerifyRoute(service: VerificationService): Router {
  const router = Router();

  // POST /api/assignment/verify
  router.post(
    "/verify",
    upload.single("file"),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: "NO_FILE",
            message: "No file uploaded. Send a PDF or DOCX as multipart/form-data with field name 'file'."
          }
        });
      }

      let parsed: Awaited<ReturnType<typeof parseDocument>>;
      try {
        parsed = await parseDocument(req.file.buffer, req.file.mimetype);
      } catch (err) {
        return res.status(422).json({
          error: {
            code: "PARSE_ERROR",
            message: `Failed to parse document: ${(err as Error).message}`
          }
        });
      }

      try {
        const result = await service.verify({
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          text: parsed.text,
          images: parsed.images
        });

        return res.status(200).json({ ...result, parserNotes: parsed.notes });
      } catch (err) {
        const status = (err as { status?: number }).status ?? 502;
        const code = (err as { code?: string }).code ?? "UPSTREAM_FAILURE";
        const message = (err as { message?: string }).message ?? "Verification failed";
        return res.status(status).json({ error: { code, message } });
      }
    }
  );

  return router;
}
