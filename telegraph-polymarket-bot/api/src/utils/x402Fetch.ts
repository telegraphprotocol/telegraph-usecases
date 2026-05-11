// eslint-disable-next-line @typescript-eslint/no-require-imports
const { x402Client, wrapFetchWithPayment } = require('@x402/fetch');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registerExactEvmScheme } = require('@x402/evm/exact/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { privateKeyToAccount } = require('viem/accounts');

type FetchFn = typeof fetch;

let _fetchWithPayment: FetchFn | null = null;

export function extractTxHash(headers: Headers): string | null {
  const settle = headers.get('x-payment-settle-response');
  if (!settle) return null;
  try {
    const json = JSON.parse(settle);
    return json.tx || json.signature || json.transaction || null;
  } catch {
    if (/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(settle)) return settle;
    if (/^0x[a-fA-F0-9]{64}$/.test(settle)) return settle;
    return settle;
  }
}

export async function getX402Fetch(): Promise<FetchFn> {
  if (_fetchWithPayment) return _fetchWithPayment;

  const rawKey = process.env.ADMIN_EVM_PRIVATE_KEY?.trim();
  if (!rawKey) {
    console.warn('[x402] ADMIN_EVM_PRIVATE_KEY not set — unauthenticated fetch active (Telegraph APIs will return 402)');
    _fetchWithPayment = fetch as FetchFn;
    return _fetchWithPayment;
  }

  const formattedKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
  const signer = privateKeyToAccount(formattedKey as `0x${string}`);

  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  _fetchWithPayment = wrapFetchWithPayment(fetch, client) as FetchFn;
  console.log(`[x402] Signer: ${signer.address}`);
  console.log(`[x402] Polygon mainnet USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`);
  return _fetchWithPayment!;
}
