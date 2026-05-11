import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DEVNET_USDC_MINT, USDC_DECIMALS } from './devnet';

function formatSol(lamports) {
  if (lamports == null) return '--';
  return (lamports / LAMPORTS_PER_SOL).toLocaleString(undefined, {
    maximumFractionDigits: 4
  });
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
    if (!publicKey) {
      return undefined;
    }

    let cancelled = false;

    async function loadSol() {
      try {
        const lamports = await connection.getBalance(publicKey, 'confirmed');
        if (!cancelled) setSolLamports(lamports);
      } catch (err) {
        console.warn('Failed to fetch SOL balance', err);
        if (!cancelled) setSolLamports(null);
      }
    }

    async function loadUsdc() {
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: DEVNET_USDC_MINT },
          'confirmed'
        );
        const tokenAmount =
          accounts.value[0]?.account.data.parsed.info.tokenAmount.amount ?? '0';
        if (!cancelled) setUsdcAmount(tokenAmount);
      } catch (err) {
        console.warn('Failed to fetch USDC balance', err);
        if (!cancelled) setUsdcAmount(null);
      }
    }

    loadSol();
    loadUsdc();

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  if (!connected || !publicKey) {
    return null;
  }

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
