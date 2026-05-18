export interface PaymentCapture {
  txHash: string | undefined;
}

function extractTxHash(settleHeader: string): string | undefined {
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

export function withTxCapture(
  paymentFetch: typeof fetch,
  capture: PaymentCapture
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await paymentFetch(input, init);
    // x402 spec uses PAYMENT-RESPONSE; some servers also emit X-PAYMENT-RESPONSE
    const settle =
      res.headers.get("payment-response") ??
      res.headers.get("x-payment-response");
    if (settle) {
      const extracted = extractTxHash(settle);
      if (extracted) {
        capture.txHash = extracted;
      } else {
        console.warn("[x402] Settlement header present but tx hash not extracted:", settle.slice(0, 120));
      }
    } else if (process.env.DEBUG_X402) {
      const headers: Record<string, string> = {};
      res.headers.forEach((v: string, k: string) => { headers[k] = v; });
      console.warn("[x402] No settlement header on response. Status:", res.status, "Headers:", JSON.stringify(headers));
    }
    return res;
  };
}

export async function createPaymentFetch(): Promise<typeof fetch> {
  const solKey = process.env.SOLANA_PRIVATE_KEY?.trim();
  if (!solKey) {
    console.warn("[x402] SOLANA_PRIVATE_KEY not set — requests will proceed without payment");
    return fetch;
  }

  try {
    const [x402Fetch, x402Svm, solanaKit, scureBase] = await Promise.all([
      import("@x402/fetch"),
      import("@x402/svm/exact/client"),
      import("@solana/kit"),
      import("@scure/base")
    ]);

    const { x402Client, wrapFetchWithPayment } = x402Fetch;
    const { registerExactSvmScheme } = x402Svm;
    const { createKeyPairSignerFromBytes } = solanaKit;
    const { base58 } = scureBase;

    const client = new x402Client();
    const signer = await createKeyPairSignerFromBytes(base58.decode(solKey));
    registerExactSvmScheme(client, { signer });

    console.log("[x402] Payment fetch initialised — Solana SVM scheme registered");
    return wrapFetchWithPayment(fetch, client) as typeof fetch;
  } catch (err) {
    console.error("[x402] Failed to initialise payment fetch:", (err as Error).message);
    console.warn("[x402] Falling back to plain fetch — API calls may fail if gated");
    return fetch;
  }
}
