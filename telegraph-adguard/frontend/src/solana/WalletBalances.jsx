import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DEVNET_USDC_MINT, USDC_DECIMALS } from './devnet';

function formatSol(lamports) {
  if (lamports == null) return '--';
  return (lamports / LAMPORTS_PER_SOL).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatUsdc(amount) {
  if (amount == null) return '--';
  return (Number(amount) / 10 ** USDC_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function WalletBalances() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [solLamports, setSolLamports] = useState(null);
  const [usdcAmount, setUsdcAmount] = useState(null);

  useEffect(() => {
    if (!publicKey) return undefined;
    let cancelled = false;

    connection.getBalance(publicKey, 'confirmed')
      .then(l => { if (!cancelled) setSolLamports(l); })
      .catch(() => { if (!cancelled) setSolLamports(null); });

    connection.getParsedTokenAccountsByOwner(publicKey, { mint: DEVNET_USDC_MINT }, 'confirmed')
      .then(accounts => {
        const amount = accounts.value[0]?.account.data.parsed.info.tokenAmount.amount ?? '0';
        if (!cancelled) setUsdcAmount(amount);
      })
      .catch(() => { if (!cancelled) setUsdcAmount(null); });

    return () => { cancelled = true; };
  }, [connection, publicKey]);

  if (!connected || !publicKey) return null;

  return (
    <div className="wallet-balances" aria-live="polite">
      <span className="wallet-balance-pill">
        <span className="wallet-balance-label">SOL</span>
        <span className="wallet-balance-value">{formatSol(solLamports)}</span>
      </span>
      <span className="wallet-balance-pill">
        <span className="wallet-balance-label">USDC</span>
        <span className="wallet-balance-value">{formatUsdc(usdcAmount)}</span>
      </span>
    </div>
  );
}

export default WalletBalances;
