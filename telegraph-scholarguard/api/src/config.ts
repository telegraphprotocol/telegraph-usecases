// Env config
export const config = {
  port: process.env.PORT ?? '3000',
  telegraphBaseUrl: process.env.TELEGRAPH_BASE_URL ?? 'http://13.237.89.59:7044',
  bitmindSubnetPrefix: process.env.BITMIND_SUBNET_PREFIX ?? '/engine/v1/ask/34',
  itsaiSubnetPrefix: process.env.ITSAI_SUBNET_PREFIX ?? '/engine/v1/ask/32',
  requestTimeoutMs: Number(process.env.TELEGRAPH_REQUEST_TIMEOUT_MS ?? 30000),
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ?? '',
  solanaNetwork: (process.env.SOLANA_NETWORK ?? 'devnet') as 'devnet' | 'mainnet',
  frontendOrigin: (process.env.FRONTEND_ORIGIN ?? '').split(',').filter(Boolean),
}
