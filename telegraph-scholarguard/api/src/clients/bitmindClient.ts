import { formatFetchError, UpstreamError } from "../errors";

export interface BitMindDetectImageResponse {
  isAI?: boolean;
  isAi?: boolean;
  confidence?: number;
  [key: string]: unknown;
}

export interface BitMindClientOptions {
  baseUrl: string;
  subnetPrefix?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class BitMindClient {
  private readonly baseUrl: string;
  private readonly subnetPrefix: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: BitMindClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.subnetPrefix = opts.subnetPrefix ?? "/subnet-dispatcher/v1/34";
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async detectImage(image: string): Promise<BitMindDetectImageResponse> {
    const url = `${this.baseUrl}${this.subnetPrefix}/detect-image`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ image }),
        signal: controller.signal
      });
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        throw new UpstreamError(
          "BITMIND_TIMEOUT",
          `BitMind request timed out after ${this.timeoutMs}ms`,
          503
        );
      }
      throw new UpstreamError(
        "BITMIND_NETWORK_ERROR",
        `Network error while calling BitMind: ${formatFetchError(error)}`,
        502
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const hint =
        response.status === 405
          ? " (wrong host/port? Subnet dispatcher is usually on :7044, not plain :80.)"
          : "";
      let detail = "";
      try {
        const t = await response.text();
        if (t.trim()) detail = t.length > 200 ? `${t.slice(0, 200)}…` : t;
      } catch {
        /* ignore */
      }
      throw new UpstreamError(
        "BITMIND_HTTP_ERROR",
        `BitMind returned HTTP ${response.status}${hint}${detail ? `: ${detail}` : ""}`,
        502
      );
    }

    let body: BitMindDetectImageResponse;
    try {
      body = (await response.json()) as BitMindDetectImageResponse;
    } catch {
      throw new UpstreamError(
        "BITMIND_INVALID_JSON",
        "BitMind returned invalid JSON",
        502
      );
    }

    if (
      body.isAI === undefined &&
      body.isAi === undefined &&
      body.confidence === undefined
    ) {
      throw new UpstreamError(
        "BITMIND_INVALID_RESPONSE",
        "BitMind response missing isAI/isAi/confidence",
        502
      );
    }

    return body;
  }
}
