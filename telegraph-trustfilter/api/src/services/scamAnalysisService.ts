import { AppConfig } from "../config";
import { AnalyzeRequest, AnalyzeResult, ScamVerdict } from "../types";
import { PaymentCapture, withTxCapture } from "../x402Fetch";

const VALID_VERDICTS: ScamVerdict[] = ["scam", "suspicious", "likely_safe"];

function cleanJsonPayload(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
}

function normalizeVerdict(v: unknown): ScamVerdict | null {
  if (typeof v !== "string") return null;
  const normalized = v.toLowerCase() as ScamVerdict;
  return VALID_VERDICTS.includes(normalized) ? normalized : null;
}

function buildPrompt(req: AnalyzeRequest): string {
  const parts: string[] = [];

  parts.push("You are a scam detection expert. Analyze the following input for scam indicators.");
  parts.push("");

  if (req.phone) {
    parts.push(`Phone number: ${req.phone}`);
  }
  if (req.message) {
    parts.push(`SMS / Message text:`);
    parts.push(req.message);
  }

  parts.push("");
  parts.push("Evaluate for:");
  parts.push("- Known scam phone number patterns (toll-free abuse, spoofed numbers, unusual country codes)");
  parts.push("- Urgency or fear language (\"Act now\", \"Your account will be suspended\", \"You owe\")");
  parts.push("- Requests for personal information, passwords, financial details");
  parts.push("- Suspicious links or shortened URLs");
  parts.push("- Prize/lottery scams, impersonation of banks or government agencies");
  parts.push("- Grammatical errors and poor sentence structure common in automated scam messages");
  parts.push("- Any combination of the above patterns");
  parts.push("");
  parts.push("Respond with ONLY a strict JSON object (no markdown, no code fences, no explanation):");
  parts.push('{"verdict":"scam|suspicious|likely_safe","confidence":0.0-1.0,"summary":"one sentence verdict summary","reasons":["reason 1","reason 2"],"redFlags":["red flag 1"]}');
  parts.push("");
  parts.push("Rules:");
  parts.push('- "verdict" must be exactly one of: scam, suspicious, likely_safe');
  parts.push('- "confidence" must be a number between 0.0 and 1.0');
  parts.push('- "reasons" is an array of strings explaining your reasoning (2-5 items)');
  parts.push('- "redFlags" is an array of specific red flag phrases found (empty array if none)');
  parts.push('- "summary" is a single concise sentence');

  return parts.join("\n");
}

export class ScamAnalysisService {
  constructor(private readonly config: AppConfig) {}

  async analyze(req: AnalyzeRequest, paymentFetch: typeof fetch): Promise<AnalyzeResult> {
    const url = `${this.config.telegraphBaseUrl}${this.config.openaiMinerAskPath}`;
    const prompt = buildPrompt(req);

    const capture: PaymentCapture = { txHash: undefined };
    const capturingFetch = withTxCapture(paymentFetch, capture);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.openaiRequestTimeoutMs);

    let response: Response;
    try {
      response = await capturingFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "POST",
          endpoint: "/v1/chat/completions",
          payload: {
            model: "gpt-4o-search-preview",
            messages: [{ role: "user", content: prompt }],
            max_completion_tokens: 512
          }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      throw new Error(`Telegraph OpenAI miner returned HTTP ${response.status}: ${body}`);
    }

    const engineResponse = await response.json() as {
      result?: { choices?: Array<{ message?: { content?: string } }> };
    };

    const content = engineResponse?.result?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("OpenAI LLM returned empty content");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleanJsonPayload(content));
    } catch {
      throw new Error(`OpenAI LLM output was not valid JSON: ${content.slice(0, 200)}`);
    }

    const verdict = normalizeVerdict(parsed.verdict);
    if (!verdict) {
      throw new Error(`OpenAI returned invalid verdict: ${String(parsed.verdict)}`);
    }

    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.5;

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : "No summary provided.";

    const reasons = Array.isArray(parsed.reasons)
      ? (parsed.reasons as unknown[])
          .filter((r): r is string => typeof r === "string")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];

    const redFlags = Array.isArray(parsed.redFlags)
      ? (parsed.redFlags as unknown[])
          .filter((r): r is string => typeof r === "string")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];

    return {
      verdict,
      confidence,
      summary,
      reasons,
      redFlags,
      txHash: capture.txHash ?? null
    };
  }
}
