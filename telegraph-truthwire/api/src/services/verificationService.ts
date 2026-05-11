import { BitMindClient, BitMindClientOptions, BitMindDetectImageResponse } from "../clients/bitmindClient";
import { ITSAI_MIN_TEXT_LENGTH, ItsAiClient, ItsAiClientOptions, ItsAiDetectResponse } from "../clients/itsAiClient";
import { FetchMeta, PostMedia, XPostDetails } from "../types";
import { PaymentCapture, withTxCapture } from "../x402Fetch";
import { XPostService } from "./xPostService";

export interface ImageVerification {
  mediaUrl: string;
  status: "analyzed" | "failed";
  result?: BitMindDetectImageResponse;
  error?: { code: string; message: string };
}

export interface SkippedMedia {
  mediaUrl: string;
  type: PostMedia["type"];
  reason: string;
}

export interface TextVerification {
  status: "analyzed" | "skipped" | "failed" | "empty";
  characterCount: number;
  skippedReason?: string;
  result?: ItsAiDetectResponse;
  error?: { code: string; message: string };
}

export interface VerificationSummary {
  totalMedia: number;
  analyzedCount: number;
  skippedCount: number;
  failedCount: number;
  /** True if any analyzed image indicates AI (BitMind). Null if no image was analyzed. */
  anyAiMedia: boolean | null;
  maxConfidence: number | null;
  textOnly: boolean;
  /** ItsAI `answer` when text was analyzed (typically 0 = human, 1 = AI — confirm with subnet docs). */
  textAnswer: number | null;
  /** True when text was analyzed and answer indicates AI; null if text not analyzed. */
  anyAiText: boolean | null;
  /** Combined: true if any analyzed modality suggests AI. */
  anyAi: boolean | null;
}

export interface PaymentProof {
  txHash: string;
  network: "solana-devnet" | "solana-mainnet";
  explorerUrl: string;
}

export interface VerificationResult {
  post: XPostDetails;
  meta: FetchMeta;
  verification: {
    images: ImageVerification[];
    skipped: SkippedMedia[];
    text: TextVerification;
    summary: VerificationSummary;
  };
  payment?: {
    bitmind?: PaymentProof;
    itsai?: PaymentProof;
  };
}

export class VerificationService {
  constructor(
    private readonly xPostService: XPostService,
    private readonly bitmindOpts: Omit<BitMindClientOptions, "fetchImpl">,
    private readonly itsAiOpts: Omit<ItsAiClientOptions, "fetchImpl">,
    private readonly paymentFetch: typeof fetch,
    private readonly solanaNetwork: "devnet" | "mainnet" = "devnet"
  ) {}

  private makeProof(capture: PaymentCapture): PaymentProof | undefined {
    if (!capture.txHash) return undefined;
    const network: PaymentProof["network"] = this.solanaNetwork === "mainnet" ? "solana-mainnet" : "solana-devnet";
    const cluster = this.solanaNetwork === "mainnet" ? "" : "?cluster=devnet";
    return {
      txHash: capture.txHash,
      network,
      explorerUrl: `https://explorer.solana.com/tx/${capture.txHash}${cluster}`
    };
  }

  async verify(url: string): Promise<VerificationResult> {
    const { post, meta } = await this.xPostService.getPostDetails(url);

    const bitmindCapture: PaymentCapture = { txHash: undefined };
    const itsaiCapture: PaymentCapture = { txHash: undefined };

    const bitmind = new BitMindClient({ ...this.bitmindOpts, fetchImpl: withTxCapture(this.paymentFetch, bitmindCapture) });
    const itsAi = new ItsAiClient({ ...this.itsAiOpts, fetchImpl: withTxCapture(this.paymentFetch, itsaiCapture) });

    const images: ImageVerification[] = [];
    const skipped: SkippedMedia[] = [];

    for (const media of post.media) {
      if (media.type !== "image") {
        skipped.push({
          mediaUrl: media.url,
          type: media.type,
          reason:
            media.type === "video"
              ? "Video analysis not implemented in v1 (detect-video pending)"
              : "Animated GIF not analyzed via detect-image in v1"
        });
        continue;
      }

      try {
        const result = await bitmind.detectImage(media.url);
        images.push({ mediaUrl: media.url, status: "analyzed", result });
      } catch (error) {
        const err = error as { code?: string; message?: string };
        images.push({
          mediaUrl: media.url,
          status: "failed",
          error: {
            code: err.code ?? "BITMIND_ERROR",
            message: err.message ?? "Failed to analyze image"
          }
        });
      }
    }

    const text = await this.verifyText(post.text, itsAi);

    const bitmindProof = this.makeProof(bitmindCapture);
    const itsaiProof = this.makeProof(itsaiCapture);
    const payment = (bitmindProof || itsaiProof)
      ? { bitmind: bitmindProof, itsai: itsaiProof }
      : undefined;

    return {
      post,
      meta,
      verification: {
        images,
        skipped,
        text,
        summary: this.summarize(post, images, skipped, text)
      },
      payment
    };
  }

  private async verifyText(rawText: string, itsAi: ItsAiClient): Promise<TextVerification> {
    const text = rawText.trim();
    const characterCount = text.length;

    if (characterCount === 0) {
      return { status: "empty", characterCount: 0 };
    }

    if (characterCount < ITSAI_MIN_TEXT_LENGTH) {
      return {
        status: "skipped",
        characterCount,
        skippedReason: `ItsAI requires at least ${ITSAI_MIN_TEXT_LENGTH} characters; post text is shorter`
      };
    }

    try {
      const result = await itsAi.detectText(text);
      return { status: "analyzed", characterCount, result };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      return {
        status: "failed",
        characterCount,
        error: {
          code: err.code ?? "ITSAI_ERROR",
          message: err.message ?? "Failed to analyze text"
        }
      };
    }
  }

  private summarize(
    post: XPostDetails,
    images: ImageVerification[],
    skipped: SkippedMedia[],
    text: TextVerification
  ): VerificationSummary {
    const analyzed = images.filter((i) => i.status === "analyzed");
    const failed = images.filter((i) => i.status === "failed");

    const aiFlags = analyzed
      .map((i) => i.result?.isAI ?? i.result?.isAi)
      .filter((v): v is boolean => typeof v === "boolean");

    const confidences = analyzed
      .map((i) => i.result?.confidence)
      .filter((v): v is number => typeof v === "number");

    const anyAiMedia = aiFlags.length ? aiFlags.some((v) => v) : null;

    let textAnswer: number | null = null;
    let anyAiText: boolean | null = null;
    if (text.status === "analyzed" && text.result) {
      textAnswer = text.result.answer;
      anyAiText = text.result.answer === 1;
    }

    const signals: boolean[] = [];
    if (anyAiMedia === true || anyAiMedia === false) signals.push(anyAiMedia);
    if (anyAiText === true || anyAiText === false) signals.push(anyAiText);
    const anyAi = signals.length ? signals.some(Boolean) : null;

    return {
      totalMedia: post.media.length,
      analyzedCount: analyzed.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      anyAiMedia,
      maxConfidence: confidences.length ? Math.max(...confidences) : null,
      textOnly: post.media.length === 0,
      textAnswer,
      anyAiText,
      anyAi
    };
  }
}
