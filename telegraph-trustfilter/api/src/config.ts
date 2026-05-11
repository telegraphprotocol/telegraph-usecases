export interface AppConfig {
  telegraphBaseUrl: string;
  groqSubnetPath: string;
  groqRequestTimeoutMs: number;
  solanaNetwork: "devnet" | "mainnet";
}

export class ConfigError extends Error {
  readonly code = "SERVICE_MISCONFIGURED";
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function parseTimeout(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    // Port 80 on this host is nginx (UI); subnet-dispatcher APIs listen on 7044.
    telegraphBaseUrl: env.TELEGRAPH_BASE_URL ?? "http://54.252.48.30:7044",
    groqSubnetPath: env.GROQ_SUBNET_PATH ?? "/subnet-dispatcher/v1/102/chat",
    groqRequestTimeoutMs: parseTimeout(env.GROQ_REQUEST_TIMEOUT_MS, 30000),
    solanaNetwork: env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet"
  };
}
