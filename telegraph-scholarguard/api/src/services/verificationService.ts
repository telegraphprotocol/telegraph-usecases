import { BitMindClient, BitMindClientOptions } from "../clients/bitmindClient";
import { ITSAI_MIN_TEXT_LENGTH, ItsAiClient, ItsAiClientOptions } from "../clients/itsAiClient";
import { ImageDetectionResult, PaymentCapture, TextDetectionResult, VerifyResponse } from "../types";
import { PaymentCapture as X402Capture, withTxCapture } from "../x402Fetch";

interface RunVerificationInput {
  filename: string;
  mimeType: string;
  text: string;
  images: string[];
}

export class VerificationService {
  private readonly bitmindOpts: Omit<BitMindClientOptions, "fetchImpl">;
  private readonly itsAiOpts: Omit<ItsAiClientOptions, "fetchImpl">;
  private readonly paymentFetch: typeof fetch;
  private readonly solanaNetwork: "devnet" | "mainnet";

  constructor(
    bitmindOpts: Omit<BitMindClientOptions, "fetchImpl">,
    itsAiOpts: Omit<ItsAiClientOptions, "fetchImpl">,
    paymentFetch: typeof fetch,
    solanaNetwork: "devnet" | "mainnet" = "devnet"
  ) {
    this.bitmindOpts = bitmindOpts;
    this.itsAiOpts = itsAiOpts;
    this.paymentFetch = paymentFetch;
    this.solanaNetwork = solanaNetwork;
  }

  private makePaymentCapture(x402: X402Capture): PaymentCapture {
    if (!x402.txHash) {
      return { txHash: null, network: this.solanaNetwork, explorerUrl: null };
    }
    const cluster = this.solanaNetwork === "mainnet" ? "" : "?cluster=devnet";
    return {
      txHash: x402.txHash,
      network: this.solanaNetwork,
      explorerUrl: `https://explorer.solana.com/tx/${x402.txHash}${cluster}`
    };
  }

  async verify(input: RunVerificationInput): Promise<VerifyResponse> {
    const { filename, mimeType, text, images } = input;
    const characterCount = text.trim().length;

    // --- Text detection (ItsAI subnet 32) ---
    const itsaiCapture: X402Capture = { txHash: undefined };
    const itsAi = new ItsAiClient({
      ...this.itsAiOpts,
      fetchImpl: withTxCapture(this.paymentFetch, itsaiCapture)
    });

    let textResult: TextDetectionResult;

    if (characterCount < ITSAI_MIN_TEXT_LENGTH) {
      textResult = {
        status: "skipped",
        characterCount,
        error:
          characterCount === 0
            ? "No text extracted from document"
            : `ItsAI requires at least ${ITSAI_MIN_TEXT_LENGTH} characters; document text is shorter`
      };
    } else {
      try {
        const raw = await itsAi.detectText(text.trim());
        textResult = {
          status: "analyzed",
          characterCount,
          result: { answer: raw.answer as 0 | 1, status: raw.status }
        };
      } catch (err) {
        textResult = {
          status: "error",
          characterCount,
          error: (err as Error).message
        };
      }
    }

    // --- Image detection (BitMind subnet 34) ---
    const imageResults: ImageDetectionResult[] = [];
    const bitmindPayments: PaymentCapture[] = [];

    for (let i = 0; i < images.length; i++) {
      const imgCapture: X402Capture = { txHash: undefined };
      const bitmind = new BitMindClient({
        ...this.bitmindOpts,
        fetchImpl: withTxCapture(this.paymentFetch, imgCapture)
      });

      try {
        const raw = await bitmind.detectImage(images[i]);
        const isAI = raw.isAI ?? raw.isAi ?? false;
        const confidence = raw.confidence ?? 0;
        imageResults.push({
          status: "analyzed",
          imageIndex: i,
          result: { isAI, confidence }
        });
      } catch (err) {
        imageResults.push({
          status: "error",
          imageIndex: i,
          error: (err as Error).message
        });
      }

      bitmindPayments.push(this.makePaymentCapture(imgCapture));
    }

    // --- Summary ---
    const analyzedImages = imageResults.filter((r) => r.status === "analyzed");
    const anyAiText =
      textResult.status === "analyzed" && textResult.result
        ? textResult.result.answer === 1
        : false;
    const anyAiImage = analyzedImages.some((r) => r.result?.isAI === true);
    const anyAi = anyAiText || anyAiImage;

    const maxConfidence =
      analyzedImages.length > 0
        ? Math.max(...analyzedImages.map((r) => r.result?.confidence ?? 0))
        : undefined;

    return {
      document: {
        filename,
        mimeType,
        characterCount,
        imageCount: images.length
      },
      verification: {
        text: textResult,
        images: imageResults,
        summary: {
          anyAiText,
          anyAiImage,
          anyAi,
          textConfidence: maxConfidence,
          analyzedImages: analyzedImages.length
        }
      },
      payment: {
        itsai:
          textResult.status === "analyzed"
            ? this.makePaymentCapture(itsaiCapture)
            : undefined,
        bitmind: bitmindPayments
      }
    };
  }
}
