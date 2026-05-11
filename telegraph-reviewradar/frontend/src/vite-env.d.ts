/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Production API origin (no trailing slash). Ignored during `vite` dev; use proxy instead. */
  readonly VITE_API_BASE: string | undefined;
  /** Dev-only: proxy target for `/api` (default http://localhost:3001). */
  readonly VITE_DEV_API_PROXY: string | undefined;
  /** Solana explorer cluster query: devnet | testnet | mainnet-beta */
  readonly VITE_SOLANA_CLUSTER: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
