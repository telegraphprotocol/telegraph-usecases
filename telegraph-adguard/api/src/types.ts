export interface ExtractedContent {
  url: string;
  title: string;
  text: string;
  imageUrls: string[];
  extractedAt: string;
}

export interface ImageAnalysis {
  url: string;
  status: "analyzed" | "failed" | "skipped";
  isDeepfake?: boolean;
  confidence?: number;
  error?: { code: string; message: string };
  skippedReason?: string;
}

export interface TextAnalysis {
  status: "analyzed" | "skipped" | "failed";
  characterCount: number;
  isAiGenerated?: boolean;
  answer?: number;
  skippedReason?: string;
  error?: { code: string; message: string };
}

export type ThreatVerdict = "CLEAN" | "SUSPICIOUS" | "HIGH_THREAT";

export interface ThreatAnalysis {
  images: ImageAnalysis[];
  text: TextAnalysis;
  threatScore: number;
  verdict: ThreatVerdict;
  thresholdExceeded: boolean;
  maxImageConfidence: number | null;
  deepfakeImageCount: number;
}

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: string;
}

export interface CampaignAction {
  campaignId: string;
  campaignName: string;
  resourceName: string;
  result: "paused" | "already_paused" | "failed" | "skipped" | "simulated";
  error?: string;
}

export interface CampaignGuardResult {
  triggered: boolean;
  threshold: number;
  threatScore: number;
  simulatedMode: boolean;
  actions: CampaignAction[];
  pausedCount: number;
  failedCount: number;
  reason: string;
}

export interface PaymentProof {
  txHash: string;
  network: "solana-devnet" | "solana-mainnet";
  explorerUrl: string;
}

export interface ScanResult {
  content: {
    url: string;
    title: string;
    textLength: number;
    imageCount: number;
    analyzedImageCount: number;
    extractedAt: string;
  };
  analysis: ThreatAnalysis;
  campaignGuard: CampaignGuardResult;
  payment?: {
    /** One proof per analyzed image, in order. */
    bitmind?: PaymentProof[];
    itsai?: PaymentProof;
  };
}
