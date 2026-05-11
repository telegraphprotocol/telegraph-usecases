/**
 * Document parser service.
 *
 * Extraction strategy:
 *   PDF  → text only via pdfjs-dist (legacy CJS build).
 *          Image extraction from PDF requires a canvas shim in Node and is non-trivial;
 *          we skip it deliberately and note it in the result.
 *   DOCX → text + embedded images via mammoth.
 *          mammoth's image handler gives us raw Buffer data for each image, which we
 *          encode as base64 data URLs for BitMind.
 */

export interface ParsedDocument {
  text: string;
  /** Base64 data URLs, e.g. "data:image/png;base64,..." */
  images: string[];
  /** Human-readable notes about what was or was not extracted */
  notes: string[];
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ParsedDocument> {
  if (mimeType === "application/pdf") {
    return parsePdf(buffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return parseDocx(buffer);
  }

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

// ---------------------------------------------------------------------------
// PDF parsing — text only
// ---------------------------------------------------------------------------

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  // pdfjs-dist v4 ships only .mjs — use dynamic import even in a CJS build.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Point workerSrc at the bundled worker file so pdfjs doesn't complain.
  // require.resolve works in CJS builds to get the absolute path.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = require.resolve(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;

  const textParts: string[] = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
  }

  return {
    text: textParts.join("\n").trim(),
    images: [],
    notes: [
      "PDF: image extraction skipped — canvas shim required in Node.js; only text was analysed."
    ]
  };
}

// ---------------------------------------------------------------------------
// DOCX parsing — text + images
// ---------------------------------------------------------------------------

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth") as typeof import("mammoth");

  const images: string[] = [];

  // Extract text
  const textResult = await mammoth.extractRawText({ buffer });
  const text = textResult.value.trim();

  // Extract images by converting the document with a custom image handler
  await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imgBuffer = await image.read();
        const contentType: string =
          (image as { contentType?: string }).contentType ?? "image/png";
        const b64 = Buffer.from(imgBuffer).toString("base64");
        images.push(`data:${contentType};base64,${b64}`);
        // Return an empty src — we only care about the side-effect above
        return { src: "" };
      })
    }
  );

  const notes: string[] = [];
  if (images.length > 0) {
    notes.push(`DOCX: extracted ${images.length} embedded image(s) for BitMind analysis.`);
  } else {
    notes.push("DOCX: no embedded images found.");
  }

  return { text, images, notes };
}
