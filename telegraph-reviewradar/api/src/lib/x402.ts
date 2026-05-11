import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

/** Per-request tx capture; use with {@link withTxCapture} (same pattern as telegraph-truthwire). */
export interface PaymentCapture {
  txHash: string | undefined;
}

/**
 * Parse settlement payload from Telegraph / x402 (may be JSON or base64-wrapped JSON).
 * Mirrors telegraph-truthwire `x402Fetch.ts`.
 */
export function extractTxHashFromSettleHeader(settleHeader: string): string | undefined {
  const candidates = [settleHeader, Buffer.from(settleHeader, "base64").toString("utf8")];
  for (const candidate of candidates) {
    try {
      const json = JSON.parse(candidate) as Record<string, unknown>;
      const val = json["transaction"] ?? json["tx"] ?? json["signature"];
      if (typeof val === "string") return val;
    } catch {
      if (/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(candidate)) return candidate;
      if (/^0x[a-fA-F0-9]{64}$/.test(candidate)) return candidate;
    }
  }
  return undefined;
}

export function extractTxHashFromHeaders(headers: Headers): string | null {
  const settle =
    headers.get("payment-response") ?? headers.get("x-payment-settle-response");
  if (!settle) return null;
  return extractTxHashFromSettleHeader(settle) ?? null;
}

/**
 * Wraps payment fetch so each response can record the settlement tx (independent capture per request).
 */
export function withTxCapture(paymentFetch: typeof fetch, capture: PaymentCapture): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await paymentFetch(input, init);
    const settle = res.headers.get("payment-response") ?? res.headers.get("x-payment-settle-response");
    if (settle) {
      capture.txHash = extractTxHashFromSettleHeader(settle);
    }
    return res;
  };
}

/**
 * Solana x402-wrapped fetch — same setup as telegraph-truthwire `createPaymentFetch`:
 * plain `x402Client()`, `registerExactSvmScheme` without `networks` (registers `solana:*`).
 */
export async function createSolanaX402Fetch(): Promise<typeof fetch> {
  const solKey = process.env.SOLANA_PRIVATE_KEY?.trim();
  if (!solKey) {
    console.warn("[x402] SOLANA_PRIVATE_KEY not set — using plain fetch (ItsAI may fail if gated)");
    return fetch;
  }

  try {
    const client = new x402Client();
    const signer = await createKeyPairSignerFromBytes(base58.decode(solKey));
    registerExactSvmScheme(client, { signer });
    console.error("[x402] Payment fetch initialised — Solana SVM scheme registered");
    return wrapFetchWithPayment(fetch, client) as typeof fetch;
  } catch (err) {
    const e = err as Error;
    console.error("[x402] Failed to initialise payment fetch:", e.message);
    console.warn("[x402] Falling back to plain fetch");
    return fetch;
  }
}

let fetchWithPaymentCache: typeof fetch | null = null;

export async function getFetchWithPayment(): Promise<typeof fetch> {
  if (!fetchWithPaymentCache) {
    fetchWithPaymentCache = await createSolanaX402Fetch();
  }
  return fetchWithPaymentCache;
}
