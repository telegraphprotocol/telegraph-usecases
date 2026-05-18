import { BitMindClient, BitMindClientOptions } from "../clients/bitmindClient";
import { ITSAI_MIN_TEXT_LENGTH, ItsAiClient, ItsAiClientOptions } from "../clients/itsAiClient";
import type { ExtractedContent, ImageAnalysis, PaymentProof, TextAnalysis, ThreatAnalysis, ThreatVerdict } from "../types";
import { PaymentCapture, withTxCapture } from "../x402Fetch";

function computeThreatScore(images: ImageAnalysis[], text: TextAnalysis): number {
  let imageScore = 0;
  let imageWeight = 0;

  const analyzed = images.filter((i) => i.status === "analyzed");
  if (analyzed.length > 0) {
    const maxConf = Math.max(...analyzed.map((i) => i.confidence ?? 0));
    const anyDeepfake = analyzed.some((i) => i.isDeepfake === true);
    imageScore = anyDeepfake ? maxConf * 100 : maxConf * 30;
    imageWeight = 0.7;
  }

  let textScore = 0;
  let textWeight = 0;
  if (text.status === "analyzed") {
    textScore = text.isAiGenerated ? 85 : 10;
    textWeight = 0.3;
  }

  if (imageWeight === 0 && textWeight === 0) return 0;

  const totalWeight = imageWeight + textWeight;
  return Math.min(100, Math.round((imageScore * imageWeight + textScore * textWeight) / totalWeight));
}

function verdictFor(score: number): ThreatVerdict {
  if (score >= 70) return "HIGH_THREAT";
  if (score >= 40) return "SUSPICIOUS";
  return "CLEAN";
}

export class ThreatAnalysisService {
  constructor(
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

  async analyze(
    content: ExtractedContent,
    threshold: number
  ): Promise<{ analysis: ThreatAnalysis; payment?: { bitmind?: PaymentProof[]; itsai?: PaymentProof } }> {
    const itsaiCapture: PaymentCapture = { txHash: undefined };
    const itsAi = new ItsAiClient({
      ...this.itsAiOpts,
      fetchImpl: withTxCapture(this.paymentFetch, itsaiCapture)
    });

    const { images, proofs: bitmindProofList } = await this.analyzeImages(content.imageUrls);
    const text = await this.analyzeText(content.text, itsAi);

    const threatScore = computeThreatScore(images, text);
    const verdict = verdictFor(threatScore);

    const analyzedImages = images.filter((i) => i.status === "analyzed");
    const maxImageConfidence = analyzedImages.length
      ? Math.max(...analyzedImages.map((i) => i.confidence ?? 0))
      : null;

    const analysis: ThreatAnalysis = {
      images,
      text,
      threatScore,
      verdict,
      thresholdExceeded: threatScore >= threshold,
      maxImageConfidence,
      deepfakeImageCount: analyzedImages.filter((i) => i.isDeepfake).length
    };

    const bitmindProofs = bitmindProofList.filter((p): p is PaymentProof => p !== undefined);
    const itsaiProof = this.makeProof(itsaiCapture);
    const payment =
      bitmindProofs.length > 0 || itsaiProof
        ? { bitmind: bitmindProofs.length > 0 ? bitmindProofs : undefined, itsai: itsaiProof }
        : undefined;

    return { analysis, payment };
  }

  private async analyzeImages(imageUrls: string[]): Promise<{ images: ImageAnalysis[]; proofs: (PaymentProof | undefined)[] }> {
    const images: ImageAnalysis[] = [];
    const proofs: (PaymentProof | undefined)[] = [];

    for (const url of imageUrls) {
      const capture: PaymentCapture = { txHash: undefined };
      const bitmind = new BitMindClient({
        ...this.bitmindOpts,
        fetchImpl: withTxCapture(this.paymentFetch, capture)
      });
      try {
        const result = await bitmind.detectImage(url);
        const isDeepfake = result.isAI ?? result.isAi ?? false;
        images.push({
          url,
          status: "analyzed",
          isDeepfake,
          confidence: result.confidence ?? (isDeepfake ? 0.9 : 0.1)
        });
      } catch (error) {
        const err = error as { code?: string; message?: string };
        images.push({
          url,
          status: "failed",
          error: { code: err.code ?? "BITMIND_ERROR", message: err.message ?? "Image analysis failed" }
        });
      }
      proofs.push(this.makeProof(capture));
    }

    return { images, proofs };
  }

  private async analyzeText(rawText: string, itsAi: ItsAiClient): Promise<TextAnalysis> {
    const text = rawText.trim();
    const characterCount = text.length;

    if (characterCount === 0) {
      return { status: "skipped", characterCount: 0, skippedReason: "No text content extracted from page" };
    }

    if (characterCount < ITSAI_MIN_TEXT_LENGTH) {
      return {
        status: "skipped",
        characterCount,
        skippedReason: `ItsAI requires at least ${ITSAI_MIN_TEXT_LENGTH} characters; extracted ${characterCount}`
      };
    }

    // Send up to 5000 chars to keep request size reasonable
    const sample = text.slice(0, 5000);

    try {
      const result = await itsAi.detectText(sample);
      return {
        status: "analyzed",
        characterCount,
        isAiGenerated: result.answer === 1,
        answer: result.answer
      };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      return {
        status: "failed",
        characterCount,
        error: { code: err.code ?? "ITSAI_ERROR", message: err.message ?? "Text analysis failed" }
      };
    }
  }
}
