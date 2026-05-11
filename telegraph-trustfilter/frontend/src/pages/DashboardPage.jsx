import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Search, ArrowLeft, AlertTriangle, CheckCircle, Info, Copy, ExternalLink, ShieldCheck as ProofIcon } from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';
import TerminalFeed from '../components/TerminalFeed';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function shortHash(hash) {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function verdictColor(verdict) {
  if (verdict === 'scam') return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171', label: 'SCAM' };
  if (verdict === 'suspicious') return { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(250, 204, 21, 0.4)', text: '#facc15', label: 'SUSPICIOUS' };
  return { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.4)', text: '#4ade80', label: 'LIKELY SAFE' };
}

function CryptoProofPanel({ txHash, network }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(txHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const explorerUrl = `https://solscan.io/tx/${txHash}?cluster=${network === 'mainnet' ? 'mainnet' : 'devnet'}`;

  return (
    <div className="crypto-proof-panel">
      <div className="crypto-proof-header">
        <ProofIcon size={14} />
        <span>Cryptographic Proof</span>
        <span className="crypto-proof-network-badge">Solana Devnet</span>
      </div>
      <p className="crypto-proof-desc">
        This analysis call was paid on-chain via x402. Click the transaction to verify on Solana Explorer.
      </p>
      <div className="crypto-proof-row">
        <div className="crypto-proof-service">
          <span className="crypto-proof-service-name">Groq LLM (Subnet #102)</span>
          <span className="crypto-proof-service-sub">Scam pattern analysis</span>
        </div>
        <div className="crypto-proof-tx-block">
          <a
            className="crypto-proof-tx-link"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={txHash}
          >
            {shortHash(txHash)}
            <ExternalLink size={11} />
          </a>
          <button className="crypto-proof-copy-btn" onClick={copy} title="Copy full tx hash" aria-label="Copy tx hash">
            {copied ? <span className="crypto-proof-copied">Copied!</span> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [terminalFinished, setTerminalFinished] = useState(false);

  const hasInput = phone.trim().length > 0 || message.trim().length > 0;

  const handleAnalyze = async () => {
    if (!hasInput) return;

    setData(null);
    setError(null);
    setTerminalFinished(false);
    setLoading(true);

    try {
      const body = {};
      if (phone.trim()) body.phone = phone.trim();
      if (message.trim()) body.message = message.trim();

      const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/analyze` : '/api/analyze';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

      setData(resultData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && hasInput && !loading) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="dashboard-layout">
      <GlobalMouseTracker />

      <header className="top-nav">
        <Link to="/" className="logo">
          <ShieldAlert size={28} color="var(--accent-color)" />
          <span>TrustFilter</span>
        </Link>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-split">

          {/* Left Side: Form */}
          <div className="dashboard-split-left">
            <div className="verify-box">
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} /> Back to Home
              </Link>

              <h2 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>Check for Scams</h2>
              <p style={{ marginBottom: '2rem' }}>Enter a phone number, SMS message, or both.</p>

              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      className="input-premium"
                      placeholder="+1-800-123-4567 or any suspicious number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      SMS / Message Text
                    </label>
                    <textarea
                      className="textarea-premium"
                      placeholder="Paste the message content here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {!hasInput && (phone !== '' || message !== '') && (
                    <p style={{ color: '#f87171', fontSize: '0.875rem' }}>
                      Please enter at least a phone number or a message.
                    </p>
                  )}

                  <button
                    className="btn-primary"
                    style={{ alignSelf: 'center', padding: '1rem 3rem', fontSize: '1.125rem' }}
                    onClick={handleAnalyze}
                    disabled={loading || !hasInput}
                  >
                    {loading ? 'Analyzing via Telegraph...' : 'Analyze with Telegraph'}
                    {!loading && <Search size={20} />}
                  </button>
                </div>

                {loading && (
                  <div className="search-loader" style={{ marginTop: '1.5rem' }}>
                    <div className="search-loader-spinner" aria-hidden="true"></div>
                    <div>
                      <div className="search-loader-title">Analyzing with Telegraph Groq</div>
                      <div className="search-loader-subtitle">Running scam pattern analysis...</div>
                    </div>
                    <div className="search-loader-dots" aria-hidden="true">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Terminal + Result */}
          <div className="dashboard-split-right">
            {(data || error || loading) ? (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Live Logic Feed</h3>

                <TerminalFeed
                  loading={loading}
                  data={data}
                  error={error}
                  onComplete={() => setTerminalFinished(true)}
                />

                {terminalFinished && (
                  <div className="animate-in" style={{ marginTop: '2rem' }}>
                    {error && (
                      <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                        Error: {error}
                      </div>
                    )}

                    {data && (() => {
                      const vc = verdictColor(data.verdict);
                      return (
                        <>
                          {/* Verdict badge */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            padding: '1.25rem',
                            borderRadius: '0.75rem',
                            background: vc.bg,
                            border: `1px solid ${vc.border}`,
                            marginBottom: '1.25rem'
                          }}>
                            {data.verdict === 'scam' && <AlertTriangle size={28} color={vc.text} />}
                            {data.verdict === 'suspicious' && <AlertTriangle size={28} color={vc.text} />}
                            {data.verdict === 'likely_safe' && <CheckCircle size={28} color={vc.text} />}
                            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: vc.text, letterSpacing: '0.04em' }}>
                              {vc.label}
                            </span>
                          </div>

                          {/* Confidence */}
                          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <span className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
                              {(data.confidence * 100).toFixed(1)}%
                            </span>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                              Confidence score
                            </p>
                          </div>

                          {/* Summary */}
                          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0 }}>
                              {data.summary}
                            </p>
                          </div>

                          {/* Red Flags */}
                          {data.redFlags && data.redFlags.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <AlertTriangle size={14} /> Red Flags
                              </h4>
                              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {data.redFlags.map((flag, i) => (
                                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#fca5a5' }}>
                                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#f87171' }} />
                                    {flag}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Reasons */}
                          {data.reasons && data.reasons.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Info size={14} /> Analysis Reasons
                              </h4>
                              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {data.reasons.map((reason, i) => (
                                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    <CheckCircle size={14} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--accent-color)' }} />
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Cryptographic Proof */}
                          {data.txHash && (
                            <CryptoProofPanel txHash={data.txHash} network="devnet" />
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                <ShieldAlert size={64} style={{ marginBottom: '1rem' }} />
                <p>Submit a phone number or message to see results here.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
