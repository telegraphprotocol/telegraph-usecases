import type { SerpReview } from "./serpapi.js";
import { extractTxHashFromHeaders } from "./x402.js";

export const ITSAI_MIN_TEXT_LENGTH = 200;

const PADDING =
  " Additional context for length requirements only; this padding does not change the review meaning above.";

/** ItsAI requires at least 200 characters per request. */
export function prepareTextForDetect(review: SerpReview): string {
  const title = typeof review.title === "string" ? review.title : "";
  const body = typeof review.text === "string" ? review.text : "";
  let s = [title, body].filter(Boolean).join("\n\n").trim();
  if (!s) s = "Empty review.";
  if (s.length >= ITSAI_MIN_TEXT_LENGTH) return s;
  s = `${s}\n\n${PADDING}`;
  const filler = body || title || s;
  while (s.length < ITSAI_MIN_TEXT_LENGTH) {
    s += `\n${filler}`;
  }
  if (s.length < ITSAI_MIN_TEXT_LENGTH) s = s.padEnd(ITSAI_MIN_TEXT_LENGTH, ".");
  return s;
}

function parseTimeoutMs(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function detectText(
  text: string,
  fetchWithPayment: typeof fetch,
  resourceBaseUrl: string,
): Promise<{ data: unknown; txHash: string | null }> {
  const base = resourceBaseUrl.replace(/\/$/, "");
  const url = `${base}/subnet-dispatcher/v1/32/detect`;
  const timeoutMs = parseTimeoutMs(process.env.ITSAI_REQUEST_TIMEOUT_MS, 60_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetchWithPayment(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      throw new Error(`ItsAI request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    data = { parseError: true, raw: raw.slice(0, 2000) };
  }

  const headerTx = extractTxHashFromHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`ItsAI HTTP ${res.status}: ${raw.slice(0, 800)}`);
  }

  return { data, txHash: headerTx };
}
