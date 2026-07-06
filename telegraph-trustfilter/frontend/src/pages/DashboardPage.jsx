import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Copy,
  ExternalLink,
  ShieldCheck as ProofIcon,
} from 'lucide-react';
import TerminalFeed from '../components/TerminalFeed';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function shortHash(hash) {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

const VERDICT_LABEL = { scam: 'SCAM', suspicious: 'SUSPICIOUS', likely_safe: 'LIKELY SAFE' };

function CryptoProofPanel({ txHash }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(txHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const explorerUrl = `https://solscan.io/tx/${txHash}?cluster=devnet`;

  return (
    <>
      <div className="dash-tx-label">
        <ProofIcon size={14} aria-hidden="true" />
        Cryptographic proof · OpenAI LLM (Miner #102)
      </div>
      <a className="dash-tx-link" href={explorerUrl} target="_blank" rel="noopener noreferrer" title={txHash}>
        <ExternalLink size={14} aria-hidden="true" />
        {shortHash(txHash)}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy full tx hash"
        style={{
          marginLeft: '0.5rem',
          background: 'none',
          border: '1px solid var(--dash-border)',
          color: 'var(--dash-text-secondary)',
          padding: '0.4rem 0.6rem',
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied!' : <Copy size={13} />}
      </button>
    </>
  );
}

const DashboardPage = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState({ kind: 'idle' });
  const [terminalFinished, setTerminalFinished] = useState(false);

  const hasInput = phone.trim().length > 0 || message.trim().length > 0;

  const onAnalyze = useCallback(async () => {
    if (!hasInput) return;

    setState({ kind: 'loading' });
    setTerminalFinished(false);

    try {
      const body = {};
      if (phone.trim()) body.phone = phone.trim();
      if (message.trim()) body.message = message.trim();

      const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/analyze` : '/api/analyze';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const raw = await response.text();
      if (!raw.trim()) {
        throw new Error(
          `Empty response from the server (HTTP ${response.status}). Start the API (cd api && npm run dev on port 3006) and use the Vite dev server so /api is proxied — see frontend/vite.config.js.`
        );
      }

      let resultData;
      try {
        resultData = JSON.parse(raw);
      } catch {
        throw new Error(
          `The server did not return JSON (HTTP ${response.status}). Check that the API is running and you are not opening a static build without an /api proxy.`
        );
      }

      if (!response.ok) {
        throw new Error(resultData.error?.message || `Analysis failed (HTTP ${response.status})`);
      }

      setState({ kind: 'ok', data: resultData });
    } catch (err) {
      setState({ kind: 'err', message: err instanceof Error ? err.message : String(err) });
    }
  }, [phone, message, hasInput]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && hasInput && state.kind !== 'loading') {
      e.preventDefault();
      onAnalyze();
    }
  };

  return (
    <div className="dash-page">
      <nav className="dash-nav">
        <Link to="/" className="dash-brand">
          <ShieldAlert size={18} strokeWidth={2.2} />
          <span>TrustFilter</span>
          <span className="dash-brand-sub">by Telegraph</span>
        </Link>
        <a
          href="https://docs.telegraphprotocol.com"
          target="_blank"
          rel="noopener noreferrer"
          className="dash-nav-docs"
        >
          Docs
        </a>
      </nav>

      <main className="dash-main">
        <header className="dash-hero">
          <div className="dash-badge">
            <ShieldAlert size={14} aria-hidden="true" />
            OpenAI · Telegraph · x402 on Solana
          </div>
          <h1>Check a number or message for scams</h1>
          <p className="dash-subtitle">
            Paste a phone number, an SMS message, or both. We run scam-pattern analysis via
            Telegraph, and show an on-chain settlement link as proof of each analysis.
          </p>
        </header>

        <section className="dash-search-shell">
          <div className="dash-label">
            <ShieldAlert size={16} aria-hidden="true" />
            Phone number and/or message
          </div>
          <div className="dash-fields">
            <input
              type="text"
              placeholder="+1-800-123-4567 or any suspicious number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={state.kind === 'loading'}
              autoComplete="off"
            />
            <textarea
              placeholder="Paste the SMS / message content here…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={state.kind === 'loading'}
            />
          </div>
          <div className="dash-form-row">
            <button
              type="button"
              className="dash-btn-primary"
              onClick={onAnalyze}
              disabled={state.kind === 'loading' || !hasInput}
            >
              {state.kind === 'loading' ? (
                <>
                  <Loader2 size={16} className="dash-spin" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles size={16} aria-hidden="true" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </section>

        {(state.kind === 'loading' || state.kind === 'ok' || state.kind === 'err') ? (
          <TerminalFeed
            loading={state.kind === 'loading'}
            data={state.kind === 'ok' ? state.data : null}
            error={state.kind === 'err' ? state.message : null}
            onComplete={() => setTerminalFinished(true)}
          />
        ) : null}

        {terminalFinished && state.kind === 'err' ? (
          <div className="dash-banner err">
            <strong>Error:</strong> {state.message}
          </div>
        ) : null}

        {terminalFinished && state.kind === 'ok' ? (
          <>
            <div className={`dash-verdict ${state.data.verdict}`}>
              {state.data.verdict === 'likely_safe' ? (
                <CheckCircle size={22} aria-hidden="true" />
              ) : (
                <AlertTriangle size={22} aria-hidden="true" />
              )}
              {VERDICT_LABEL[state.data.verdict] ?? String(state.data.verdict).toUpperCase()}
            </div>

            <div className="dash-confidence">
              <div className="dash-confidence-value">{(state.data.confidence * 100).toFixed(1)}%</div>
              <div className="dash-confidence-label">Confidence score</div>
            </div>

            <div className="dash-result-card">
              <div className="dash-section-label">Summary</div>
              <p className="dash-summary-text">{state.data.summary}</p>

              {state.data.redFlags && state.data.redFlags.length > 0 ? (
                <>
                  <div className="dash-divider" />
                  <div className="dash-section-label">
                    <AlertTriangle size={13} aria-hidden="true" />
                    Red flags
                  </div>
                  <ul className="dash-list redflags">
                    {state.data.redFlags.map((flag, i) => (
                      <li key={i}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {state.data.reasons && state.data.reasons.length > 0 ? (
                <>
                  <div className="dash-divider" />
                  <div className="dash-section-label">
                    <Info size={13} aria-hidden="true" />
                    Analysis reasons
                  </div>
                  <ul className="dash-list">
                    {state.data.reasons.map((reason, i) => (
                      <li key={i}>
                        <CheckCircle size={14} aria-hidden="true" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <div className="dash-divider" />

              {state.data.txHash ? (
                <CryptoProofPanel txHash={state.data.txHash} />
              ) : (
                <>
                  <div className="dash-tx-label">
                    <ProofIcon size={14} aria-hidden="true" />
                    Cryptographic proof
                  </div>
                  <span className="dash-tx-missing">No settlement signature for this call.</span>
                </>
              )}
            </div>
          </>
        ) : null}

        {state.kind === 'idle' ? (
          <div className="dash-empty-state">
            <ShieldAlert size={28} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <p>Submit a phone number or message to see results here.</p>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardPage;
