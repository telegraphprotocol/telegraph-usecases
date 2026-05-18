export interface AppConfig {
  telegraphBaseUrl: string;
  bitmindSubnetPrefix: string;
  bitmindRequestTimeoutMs: number;
  itsAiSubnetPrefix: string;
  itsAiRequestTimeoutMs: number;
  googleAdsBaseUrl: string;
  googleAdsDeveloperToken: string;
  googleAdsSimulate: boolean;
  contentFetchTimeoutMs: number;
  contentMaxImages: number;
  solanaNetwork: "devnet" | "mainnet";
}

export class ConfigError extends Error {
  readonly code = "SERVICE_MISCONFIGURED";
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function parseTimeoutMs(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const telegraphTimeout = parseTimeoutMs(env.TELEGRAPH_REQUEST_TIMEOUT_MS, 30000);

  return {
    telegraphBaseUrl: env.TELEGRAPH_BASE_URL ?? "http://54.252.48.30:7044",
    bitmindSubnetPrefix: env.BITMIND_SUBNET_PREFIX ?? "/subnet-dispatcher/v1/34",
    bitmindRequestTimeoutMs: parseTimeoutMs(env.BITMIND_REQUEST_TIMEOUT_MS, telegraphTimeout),
    itsAiSubnetPrefix: env.ITSAI_SUBNET_PREFIX ?? "/subnet-dispatcher/v1/32",
    itsAiRequestTimeoutMs: parseTimeoutMs(env.ITSAI_REQUEST_TIMEOUT_MS, telegraphTimeout),
    googleAdsBaseUrl: env.GOOGLE_ADS_BASE_URL ?? "https://googleads.googleapis.com",
    googleAdsDeveloperToken: env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    googleAdsSimulate: env.GOOGLE_ADS_SIMULATE === "true",
    contentFetchTimeoutMs: parseTimeoutMs(env.CONTENT_FETCH_TIMEOUT_MS, 10000),
    contentMaxImages: parsePositiveInt(env.CONTENT_MAX_IMAGES, 5),
    solanaNetwork: env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet"
  };
}
