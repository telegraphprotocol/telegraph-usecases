export type ScamVerdict = "scam" | "suspicious" | "likely_safe";

export interface AnalyzeRequest {
  phone?: string;   // optional
  message?: string; // optional — at least one must be provided
}

export interface AnalyzeResult {
  verdict: ScamVerdict;
  confidence: number; // 0–1
  summary: string;
  reasons: string[];
  redFlags: string[];
  txHash: string | null;
}
