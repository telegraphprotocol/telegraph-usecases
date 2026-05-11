export interface ImageDetectionResult {
  status: 'analyzed' | 'skipped' | 'error';
  imageIndex: number;
  result?: { isAI: boolean; confidence: number };
  error?: string;
}

export interface TextDetectionResult {
  status: 'analyzed' | 'skipped' | 'error';
  characterCount: number;
  result?: { answer: 0 | 1; status: string };
  error?: string;
}

export interface PaymentCapture {
  txHash: string | null;
  network: string;
  explorerUrl: string | null;
}

export interface VerifyResponse {
  document: {
    filename: string;
    mimeType: string;
    characterCount: number;
    imageCount: number;
  };
  verification: {
    text: TextDetectionResult;
    images: ImageDetectionResult[];
    summary: {
      anyAiText: boolean;
      anyAiImage: boolean;
      anyAi: boolean;
      textConfidence?: number;
      analyzedImages: number;
    };
  };
  payment: {
    itsai?: PaymentCapture;
    bitmind: PaymentCapture[];
  };
}
