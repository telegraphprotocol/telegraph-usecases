export interface AppConfig {
  vxApiBase: string;
  telegraphBaseUrl: string;
  bitmindSubnetPrefix: string;
  bitmindRequestTimeoutMs: number;
  itsAiSubnetPrefix: string;
  itsAiRequestTimeoutMs: number;
  // x402 Solana payment — read directly from process.env in x402Fetch.ts
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const telegraphTimeout = parseTimeoutMs(env.TELEGRAPH_REQUEST_TIMEOUT_MS, 30000);

  return {
    vxApiBase: env.VX_API_BASE ?? "https://api.vxtwitter.com",
    // Port 80 on this host is nginx (UI); subnet-dispatcher APIs listen on 7044 (see example scripts).
    telegraphBaseUrl: env.TELEGRAPH_BASE_URL ?? "http://54.252.48.30:7044",
    bitmindSubnetPrefix: env.BITMIND_SUBNET_PREFIX ?? "/subnet-dispatcher/v1/34",
    bitmindRequestTimeoutMs: parseTimeoutMs(env.BITMIND_REQUEST_TIMEOUT_MS, telegraphTimeout),
    itsAiSubnetPrefix: env.ITSAI_SUBNET_PREFIX ?? "/subnet-dispatcher/v1/32",
    itsAiRequestTimeoutMs: parseTimeoutMs(env.ITSAI_REQUEST_TIMEOUT_MS, telegraphTimeout),
    solanaNetwork: env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet"
  };
}
