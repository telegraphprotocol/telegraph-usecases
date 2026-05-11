import { formatFetchError, UpstreamError } from "../errors";

/** ItsAI (subnet 32) requires at least this many characters per `/detect` request. */
export const ITSAI_MIN_TEXT_LENGTH = 200;

export interface ItsAiDetectResponse {
  answer: number;
  status: string;
  [key: string]: unknown;
}

export interface ItsAiClientOptions {
  baseUrl: string;
  subnetPrefix?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class ItsAiClient {
  private readonly baseUrl: string;
  private readonly subnetPrefix: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ItsAiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.subnetPrefix = opts.subnetPrefix ?? "/subnet-dispatcher/v1/32";
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async detectText(text: string): Promise<ItsAiDetectResponse> {
    const url = `${this.baseUrl}${this.subnetPrefix}/detect`;

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
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        throw new UpstreamError(
          "ITSAI_TIMEOUT",
          `ItsAI request timed out after ${this.timeoutMs}ms`,
          503
        );
      }
      throw new UpstreamError(
        "ITSAI_NETWORK_ERROR",
        `Network error while calling ItsAI: ${formatFetchError(error)}`,
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
        "ITSAI_HTTP_ERROR",
        `ItsAI returned HTTP ${response.status}${hint}${detail ? `: ${detail}` : ""}`,
        502
      );
    }

    let body: ItsAiDetectResponse;
    try {
      body = (await response.json()) as ItsAiDetectResponse;
    } catch {
      throw new UpstreamError(
        "ITSAI_INVALID_JSON",
        "ItsAI returned invalid JSON",
        502
      );
    }

    if (typeof body.answer !== "number") {
      throw new UpstreamError(
        "ITSAI_INVALID_RESPONSE",
        "ItsAI response missing numeric answer",
        502
      );
    }
    if (body.status !== "success") {
      throw new UpstreamError(
        "ITSAI_INVALID_RESPONSE",
        `ItsAI response status is not success: ${String(body.status)}`,
        502
      );
    }

    return body;
  }
}
