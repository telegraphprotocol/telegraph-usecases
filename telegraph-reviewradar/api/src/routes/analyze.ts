import { Router } from "express";
import { extractAsinFromUrl } from "../lib/amazon.js";
import { fetchAmazonProductData, SerpApiError } from "../lib/serpapi.js";
import { detectText, prepareTextForDetect } from "../lib/itsai.js";
import { getFetchWithPayment, withTxCapture, type PaymentCapture } from "../lib/x402.js";

function telegraphBaseUrl(): string {
  return (
    process.env.RESOURCE_SERVER_URL?.trim() ||
    process.env.TELEGRAPH_BASE_URL?.trim() ||
    "http://localhost:7044"
  );
}

const REVIEW_LIMIT = 3;

export const analyzeRouter = Router();

/** Browsers open URLs with GET; analysis is POST-only — avoid a confusing empty 404. */
analyzeRouter.get("/analyze", (_req, res) => {
  res.status(405).setHeader("Allow", "POST").json({
    error: "Method Not Allowed",
    hint: 'Use POST with JSON body: { "productUrl": "https://www.amazon.com/dp/…" } (e.g. click Search in the dashboard).',
  });
});

analyzeRouter.post("/analyze", async (req, res) => {
  const productUrl = req.body?.productUrl;
  if (typeof productUrl !== "string" || !productUrl.trim()) {
    res.status(400).json({ error: "Body must include string productUrl" });
    return;
  }

  const asin = extractAsinFromUrl(productUrl);
  if (!asin) {
    res.status(400).json({ error: "Could not parse Amazon product URL" });
    return;
  }

  const serpKey = process.env.SERP_API_KEY?.trim();
  if (!serpKey) {
    res.status(500).json({ error: "SERP_API_KEY is not configured" });
    return;
  }

  console.log(`[analyze] ASIN=${asin} → calling SerpApi`);
  let reviews;
  let product;
  try {
    const data = await fetchAmazonProductData(asin, serpKey);
    reviews = data.reviews;
    product = data.product;
    console.log(`[analyze] SerpApi OK — ${reviews.length} review(s), product title: ${product.title ?? "(none)"}`);
  } catch (e) {
    const msg = e instanceof SerpApiError ? e.message : String(e);
    const status = e instanceof SerpApiError && e.status ? e.status : 502;
    console.error(`[analyze] SerpApi error: ${msg}`);
    res.status(status >= 400 && status < 600 ? status : 502).json({ error: "SerpApi failed", detail: msg });
    return;
  }

  const slice = reviews.slice(0, REVIEW_LIMIT);
  const warning =
    slice.length < REVIEW_LIMIT
      ? `Only ${slice.length} review(s) available from SerpApi (requested ${REVIEW_LIMIT}).`
      : undefined;

  const baseUrl = telegraphBaseUrl();

  let fetchPaid: typeof fetch;
  try {
    fetchPaid = await getFetchWithPayment();
  } catch (e) {
    res.status(500).json({ error: "x402 client init failed", detail: String(e) });
    return;
  }

  const items: Array<{ review: (typeof reviews)[0]; itsAi: unknown; txHash: string | null }> = [];

  for (const review of slice) {
    const text = prepareTextForDetect(review);
    const capture: PaymentCapture = { txHash: undefined };
    const fetchForReview = withTxCapture(fetchPaid, capture);
    try {
      const { data, txHash } = await detectText(text, fetchForReview, baseUrl);
      items.push({
        review,
        itsAi: data,
        txHash: capture.txHash ?? txHash ?? null,
      });
    } catch (e) {
      res.status(502).json({
        error: "ItsAI or x402 payment failed",
        detail: String(e),
        asin,
        product,
        warning,
        partial: items,
      });
      return;
    }
  }

  res.json({ asin, product, warning, items });
});
