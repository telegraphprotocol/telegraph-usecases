import { PublicKey } from '@solana/web3.js';

export const DEVNET_RPC =
  import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const DEFAULT_DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export const DEVNET_USDC_MINT_ADDRESS =
  import.meta.env.VITE_DEVNET_USDC_MINT || DEFAULT_DEVNET_USDC_MINT;

export const DEVNET_USDC_MINT = new PublicKey(DEVNET_USDC_MINT_ADDRESS);

export const USDC_DECIMALS = 6;
