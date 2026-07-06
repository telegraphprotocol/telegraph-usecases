export interface AppConfig {
  telegraphBaseUrl: string;
  openaiMinerAskPath: string;
  openaiRequestTimeoutMs: number;
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
    // Port 80 on this host is nginx (UI); the engine API listens on 7044.
    // Direct-mode ask: POST {base}/engine/v1/ask/{minerId} with { method, endpoint, payload }
    // forwards `payload` straight to the miner's own API (see tg-terminal-backend chat.service.ts).
    telegraphBaseUrl: env.TELEGRAPH_BASE_URL ?? "http://13.237.89.59:7044",
    openaiMinerAskPath: env.OPENAI_MINER_ASK_PATH ?? "/engine/v1/ask/102",
    openaiRequestTimeoutMs: parseTimeout(env.OPENAI_REQUEST_TIMEOUT_MS, 30000),
    solanaNetwork: env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet"
  };
}
