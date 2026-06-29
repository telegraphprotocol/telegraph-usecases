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
  const subnetPrefix = (process.env.ITSAI_SUBNET_PREFIX ?? "/engine/v1/ask/32").replace(/\/$/, "");
  const url = `${base}${subnetPrefix}`;
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
      body: JSON.stringify({ Method: "POST", Endpoint: "/detect", payload: { text } }),
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
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    envelope = { parseError: true, raw: raw.slice(0, 2000) };
  }

  const headerTx = extractTxHashFromHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`ItsAI HTTP ${res.status}: ${raw.slice(0, 800)}`);
  }

  // Engine API wraps subnet response in { result: <actual payload>, ... }
  const data = (typeof envelope.result === "object" && envelope.result !== null
    ? envelope.result
    : envelope) as unknown;

  return { data, txHash: headerTx };
}
