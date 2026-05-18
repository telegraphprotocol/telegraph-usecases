import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, Search, ArrowLeft, Bot, CheckCircle, AlertTriangle,
  Copy, ExternalLink, ShieldCheck as ProofIcon, PauseCircle, RefreshCw, Check
} from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { GlobalMouseTracker } from '../useMousePosition';
import { WalletBalances } from '../solana/WalletBalances';
import TerminalFeed from '../components/TerminalFeed';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
function api(path) { return API_BASE ? `${API_BASE}${path}` : path; }

function shortHash(hash) {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function CryptoProofBlock({ label, sublabel, proof }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(proof.txHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="crypto-proof-row">
      <div className="crypto-proof-service">
        <span className="crypto-proof-service-name">{label}</span>
        <span className="crypto-proof-service-sub">{sublabel}</span>
      </div>
      <div className="crypto-proof-tx-block">
        <a className="crypto-proof-tx-link" href={proof.explorerUrl} target="_blank" rel="noopener noreferrer" title={proof.txHash}>
          {shortHash(proof.txHash)} <ExternalLink size={11} />
        </a>
        <button className="crypto-proof-copy-btn" onClick={copy} title="Copy tx hash">
          {copied ? <span className="crypto-proof-copied">Copied!</span> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const [articleUrl, setArticleUrl] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [terminalFinished, setTerminalFinished] = useState(false);
  const [proofsExpanded, setProofsExpanded] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!customerId.trim()) { setCampaignsError('Enter a Customer ID first'); return; }
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken.trim()) headers['Authorization'] = `Bearer ${accessToken.trim()}`;
      const res = await fetch(api(`/api/ads/campaigns?customerId=${encodeURIComponent(customerId.trim())}`), { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
      setCampaigns(json.campaigns ?? []);
      setSelectedIds([]);
      if ((json.campaigns ?? []).length === 0) setCampaignsError('No campaigns found for this account');
    } catch (err) {
      setCampaignsError(err instanceof Error ? err.message : String(err));
    } finally {
      setCampaignsLoading(false);
    }
  }, [customerId, accessToken]);

  const toggleCampaign = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleScan = async () => {
    if (!articleUrl.trim()) return;
    setData(null);
    setError(null);
    setTerminalFinished(false);
    setLoading(true);
    try {
      const res = await fetch(api('/api/scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: articleUrl.trim(),
          googleAdsToken: accessToken.trim(),
          customerId: customerId.trim(),
          campaignIds: selectedIds,
          threshold
        })
      });
      const raw = await res.text();
      if (!raw.trim()) throw new Error(`Empty response (HTTP ${res.status}). Is the API running on port 3001?`);
      let json;
      try { json = JSON.parse(raw); } catch { throw new Error(`Server did not return JSON (HTTP ${res.status})`); }
      if (!res.ok) throw new Error(json.error?.message || `Request failed (HTTP ${res.status})`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const analysis = data?.analysis;
  const guard = data?.campaignGuard;
  const hasImageScore = analysis && typeof analysis.maxImageConfidence === 'number';
  const threatVerdict = analysis?.verdict;

  return (
    <div className="dashboard-layout">
      <GlobalMouseTracker />

      <header className="top-nav">
        <div className="logo">
          <ShieldAlert size={28} color="var(--accent-color)" />
          <span>AdGuard</span>
        </div>
        <div className="nav-wallet">
          <WalletBalances />
          <WalletMultiButton className="wallet-connect-btn" />
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-split">

          {/* ── Left: Config ── */}
          <div className="dashboard-split-left">
            <div className="verify-box">
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} /> Back to Home
              </Link>

              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Scan &amp; Guard</h2>
              <p style={{ marginBottom: '2rem', fontSize: '1rem' }}>
                Paste a suspicious article URL. AdGuard analyzes it via Telegraph and auto-pauses your configured Google Ads campaigns if a threat is found.
              </p>

              {/* Article URL */}
              <div className="glass-panel" style={{ marginBottom: '1rem' }}>
                <label className="form-section-label">Article URL to Scan</label>
                <input
                  type="url"
                  className="input-premium"
                  placeholder="https://example.com/news/article"
                  value={articleUrl}
                  onChange={e => setArticleUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleScan()}
                />
              </div>

              {/* Google Ads config */}
              <div className="glass-panel" style={{ marginBottom: '1rem' }}>
                <label className="form-section-label" style={{ marginBottom: '1rem', display: 'block' }}>
                  Google Ads &mdash; Optional
                </label>
                <div className="input-row">
                  <label className="form-section-label" style={{ fontSize: '0.65rem' }}>Customer ID</label>
                  <input
                    type="text"
                    className="input-premium sm mono"
                    placeholder="123-456-7890"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                  />
                </div>
                <div className="input-row" style={{ marginBottom: '1rem' }}>
                  <label className="form-section-label" style={{ fontSize: '0.65rem' }}>OAuth2 Access Token</label>
                  <input
                    type="password"
                    className="input-premium sm mono"
                    placeholder="ya29.a0..."
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Get from{' '}
                    <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer">
                      Google OAuth Playground
                    </a>
                    {' '}with <code>adwords</code> scope
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="form-section-label" style={{ margin: 0 }}>Campaigns to protect</span>
                  <button
                    onClick={fetchCampaigns}
                    disabled={campaignsLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-color)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <RefreshCw size={12} style={campaignsLoading ? { animation: 'spin 0.8s linear infinite' } : {}} />
                    {campaigns.length > 0 ? 'Refresh' : 'Fetch Campaigns'}
                  </button>
                </div>

                {campaignsError && (
                  <div style={{ fontSize: '0.78rem', color: '#fca5a5', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                    {campaignsError}
                  </div>
                )}

                {campaigns.length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedIds.length} selected</span>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setSelectedIds(campaigns.filter(c => c.status === 'ENABLED').map(c => c.id))}
                          style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          All enabled
                        </button>
                        <button onClick={() => setSelectedIds([])}
                          style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          None
                        </button>
                      </div>
                    </div>
                    <div className="campaign-list">
                      {campaigns.map(c => (
                        <div key={c.id} className={`campaign-item ${selectedIds.includes(c.id) ? 'selected' : ''}`} onClick={() => toggleCampaign(c.id)}>
                          <div className="campaign-checkbox">
                            {selectedIds.includes(c.id) && <Check size={9} color={selectedIds.includes(c.id) ? '#000' : 'transparent'} />}
                          </div>
                          <span className="campaign-name">{c.name}</span>
                          <span className={`campaign-status-pill ${c.status === 'ENABLED' ? 'status-enabled' : 'status-paused'}`}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {campaigns.length === 0 && !campaignsError && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Set <code>GOOGLE_ADS_SIMULATE=true</code> in API <code>.env</code> for demo campaigns, or connect a real account above.
                  </p>
                )}
              </div>

              {/* Threshold */}
              <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-section-label" style={{ margin: 0 }}>Pause Threshold</label>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-color)' }}>{threshold}%</span>
                </div>
                <input type="range" className="threshold-slider" min={0} max={100} step={5} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  <span>0% — always pause</span>
                  <span>100% — never pause</span>
                </div>
              </div>

              {/* Scan button */}
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '0.75rem' }}
                onClick={handleScan}
                disabled={loading || !articleUrl.trim()}
              >
                {loading ? 'Scanning via Telegraph...' : 'Scan & Guard'}
                {!loading && <Search size={20} />}
              </button>

              {loading && (
                <div className="search-loader" style={{ marginTop: '1rem' }}>
                  <div className="search-loader-spinner" />
                  <div>
                    <div className="search-loader-title">Analyzing with Telegraph</div>
                    <div className="search-loader-subtitle">BitMind + ItsAI subnets running...</div>
                  </div>
                  <div className="search-loader-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="dashboard-split-right">
            {(data || error || loading) ? (
              <div className="post-preview visible">
                <h3 style={{ marginBottom: '1rem' }}>Live Analysis Feed</h3>

                <TerminalFeed loading={loading} data={data} error={error} onComplete={() => setTerminalFinished(true)} />

                {terminalFinished && (
                  <div className="results-container animate-in" style={{ marginTop: '2rem' }}>

                    {error && (
                      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                        Error: {error}
                      </div>
                    )}

                    {data && analysis && (
                      <>
                        {/* Threat score */}
                        <div className="confidence-score text-center">
                          <span className="gradient-text">{analysis.threatScore}%</span>
                          <p className="confidence-caption">
                            Threat Score &mdash; {hasImageScore ? `${(analysis.maxImageConfidence * 100).toFixed(1)}% max deepfake confidence` : 'image analysis unavailable'}
                          </p>
                          {analysis.text.status === 'analyzed' && (
                            <p className="confidence-subcaption">
                              Text: {analysis.text.isAiGenerated ? 'AI-generated' : 'Human-written'}
                            </p>
                          )}
                        </div>

                        {/* Verdict banner */}
                        <div className={`ai-result ${threatVerdict === 'HIGH_THREAT' ? 'ai' : threatVerdict === 'SUSPICIOUS' ? 'suspicious' : 'real'}`}>
                          {threatVerdict === 'HIGH_THREAT'
                            ? <><Bot size={24} /><span>Warning: High Threat Detected — Campaigns Paused</span></>
                            : threatVerdict === 'SUSPICIOUS'
                              ? <><AlertTriangle size={24} /><span>Suspicious Content Detected — Review Recommended</span></>
                              : <><CheckCircle size={24} /><span>Content Appears Authentic — Campaigns Safe</span></>
                          }
                        </div>

                        {/* Campaign guard */}
                        {guard && (
                          <div className="guard-panel" style={{ marginTop: '1.5rem' }}>
                            <div className="guard-panel-header" style={{
                              color: guard.triggered ? '#f87171' : '#4ade80',
                              background: guard.triggered ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)'
                            }}>
                              <PauseCircle size={13} />
                              Campaign Guard &mdash; {guard.triggered
                                ? (guard.simulatedMode ? 'Triggered (Simulated)' : 'Triggered')
                                : 'No Action'}
                            </div>
                            <div className="guard-panel-body">
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: guard.actions.length > 0 ? '0.75rem' : 0 }}>
                                {guard.reason}
                              </p>
                              {guard.actions.map((action, i) => (
                                <div key={i} className="guard-action-row">
                                  <span>{action.campaignName || action.campaignId}</span>
                                  <span className={`guard-badge ${action.result}`}>{action.result.toUpperCase()}</span>
                                </div>
                              ))}
                              {guard.actions.length === 0 && selectedIds.length === 0 && (
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                  No campaigns selected. Fetch campaigns and select which to protect.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Provider detail */}
                        <div style={{ marginTop: '1.5rem' }}>
                          <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Powered by Telegraph</h4>

                          {/* BitMind */}
                          <div className="provider-status">
                            <div>
                              <div className="provider-label">BitMind</div>
                              <div className="provider-info">Deepfake Image Detection</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {analysis.images.filter(i => i.status === 'analyzed').length > 0 ? (
                                <>
                                  <div style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 'bold' }}>ACTIVE</div>
                                  <div className="provider-info">
                                    {analysis.images.filter(i => i.status === 'analyzed').length}/{data.content.imageCount} images analyzed
                                  </div>
                                </>
                              ) : analysis.images.length > 0 ? (
                                <>
                                  <div style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 'bold' }}>FAILED</div>
                                  <div className="provider-info">
                                    {analysis.images.filter(i => i.status === 'failed').length} image(s) failed — check payment key
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold' }}>NO IMAGES</div>
                                  <div className="provider-info">No images found in article</div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* ItsAI */}
                          <div className="provider-block">
                            <div className="provider-status">
                              <div>
                                <div className="provider-label">ItsAI</div>
                                <div className="provider-info">Natural Language Verification</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{
                                  color: analysis.text.status === 'analyzed' ? '#4ade80'
                                    : analysis.text.status === 'skipped' ? '#eab308' : '#f87171',
                                  fontSize: '0.75rem', fontWeight: 'bold'
                                }}>
                                  {analysis.text.status.toUpperCase()}
                                </div>
                                <div className="provider-info">
                                  {analysis.text.status === 'analyzed'
                                    ? `${analysis.text.characterCount.toLocaleString()} chars verified`
                                    : analysis.text.status === 'skipped' ? 'Text check not run'
                                    : 'Analysis failed — check payment key'}
                                </div>
                              </div>
                            </div>
                            {analysis.text.status === 'skipped' && analysis.text.skippedReason && (
                              <div className="itsai-skip-warning" role="status">
                                <AlertTriangle size={18} aria-hidden />
                                <span>{analysis.text.skippedReason}</span>
                              </div>
                            )}
                            {analysis.text.status === 'failed' && analysis.text.error && (
                              <div className="itsai-skip-warning" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }} role="status">
                                <AlertTriangle size={18} aria-hidden />
                                <span>{analysis.text.error.code}: {analysis.text.error.message}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cryptographic proof */}
                        {(() => {
                          const bitmindProofs = Array.isArray(data.payment?.bitmind) ? data.payment.bitmind : [];
                          const itsaiProof = data.payment?.itsai;
                          const totalCount = bitmindProofs.length + (itsaiProof ? 1 : 0);
                          if (totalCount === 0) return null;
                          return (
                            <div className="crypto-proof-panel">
                              <div className="crypto-proof-header">
                                <ProofIcon size={14} />
                                <span>Cryptographic Proof</span>
                                <span className="crypto-proof-network-badge">Solana Devnet</span>
                              </div>
                              <p className="crypto-proof-desc">
                                Each inference call was settled on-chain via x402 micropayment.
                              </p>
                              <button
                                onClick={() => setProofsExpanded(e => !e)}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)',
                                  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', cursor: 'pointer',
                                  color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem'
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#2dd4bf' }}>
                                  <ProofIcon size={12} color="#2dd4bf" />
                                  {totalCount} on-chain settlement{totalCount > 1 ? 's' : ''}
                                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
                                    {bitmindProofs.length > 0 && `· BitMind ×${bitmindProofs.length}`}
                                    {itsaiProof && ` · ItsAI ×1`}
                                  </span>
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  {proofsExpanded ? 'Hide proofs ↑' : 'View proofs ↓'}
                                </span>
                              </button>
                              {proofsExpanded && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  {bitmindProofs.map((proof, i) => (
                                    <CryptoProofBlock
                                      key={i}
                                      label={`BitMind #${i + 1}`}
                                      sublabel={`Image ${i + 1} — deepfake analysis`}
                                      proof={proof}
                                    />
                                  ))}
                                  {itsaiProof && (
                                    <CryptoProofBlock label="ItsAI" sublabel="AI text detection" proof={itsaiProof} />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                <Search size={64} style={{ marginBottom: '1rem' }} />
                <p>Paste an article URL and click Scan &amp; Guard to analyze.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
