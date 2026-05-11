export type AnalyzeItem = {
  review: Record<string, unknown>;
  itsAi: unknown;
  txHash: string | null;
};

/** Mirrors API `product` from SerpApi amazon_product. */
export type AmazonProductPreview = {
  title: string | null;
  image: string | null;
  link: string | null;
  rating: number | null;
  reviewCount: number | null;
};

export type AnalyzeSuccess = {
  asin: string;
  product?: AmazonProductPreview;
  warning?: string;
  items: AnalyzeItem[];
};

export type AnalyzeErrorBody = {
  error?: string;
  detail?: string;
  asin?: string;
  product?: AmazonProductPreview;
  warning?: string;
  partial?: AnalyzeItem[];
};

/**
 * If `VITE_API_BASE` is set (e.g. http://127.0.0.1:3001), the browser calls the API directly
 * (Network tab shows :3001). Enable CORS on the API (`CORS_ORIGIN=*` or your Vite origin).
 * If unset, uses `/api/analyze` (Vite dev proxy to `VITE_DEV_API_PROXY`).
 */
export function analyzeEndpoint(): string {
  const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? "";
  if (base) {
    return `${base}/api/analyze`;
  }
  return "/api/analyze";
}

export function solanaExplorerTxUrl(signature: string): string {
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER?.trim() || "devnet";
  if (cluster === "mainnet" || cluster === "mainnet-beta") {
    return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}`;
  }
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${encodeURIComponent(cluster)}`;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function formatReviewSummary(review: Record<string, unknown>): {
  title: string;
  author: string;
  date: string;
  rating: string;
  text: string;
} {
  return {
    title: asString(review.title) ?? "—",
    author: asString(review.author) ?? "—",
    date: asString(review.date) ?? "—",
    rating: typeof review.rating === "number" ? String(review.rating) : (asString(review.rating) ?? "—"),
    text: asString(review.text) ?? "",
  };
}

export function itsAiSummary(itsAi: unknown): { answer: number | null; status: string | null } {
  if (!itsAi || typeof itsAi !== "object") return { answer: null, status: null };
  const o = itsAi as Record<string, unknown>;
  const answer = typeof o.answer === "number" ? o.answer : null;
  const status = typeof o.status === "string" ? o.status : null;
  return { answer, status };
}

/** Percentages among reviews with a definitive ItsAI answer (0 = human, 1 = AI). */
export function aggregateItsAiPercentages(items: AnalyzeItem[]): {
  total: number;
  definitive: number;
  aiCount: number;
  humanCount: number;
  inconclusiveCount: number;
  pctAi: number | null;
  pctHuman: number | null;
} {
  let aiCount = 0;
  let humanCount = 0;
  let inconclusiveCount = 0;
  for (const item of items) {
    const { answer } = itsAiSummary(item.itsAi);
    if (answer === 1) aiCount++;
    else if (answer === 0) humanCount++;
    else inconclusiveCount++;
  }
  const definitive = aiCount + humanCount;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    total: items.length,
    definitive,
    aiCount,
    humanCount,
    inconclusiveCount,
    pctAi: definitive > 0 ? round1((aiCount / definitive) * 100) : null,
    pctHuman: definitive > 0 ? round1((humanCount / definitive) * 100) : null,
  };
}
