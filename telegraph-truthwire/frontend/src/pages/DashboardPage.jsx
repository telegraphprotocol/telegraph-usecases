import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, ArrowLeft, Bot, CheckCircle, AlertTriangle, Copy, ExternalLink, ShieldCheck as ProofIcon } from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';
import TerminalFeed from '../components/TerminalFeed';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function textAnswerLabel(answer) {
  if (answer === 0) return 'Likely human-written';
  if (answer === 1) return 'Likely AI-generated';
  return null;
}

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
        <a
          className="crypto-proof-tx-link"
          href={proof.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={proof.txHash}
        >
          {shortHash(proof.txHash)}
          <ExternalLink size={11} />
        </a>
        <button className="crypto-proof-copy-btn" onClick={copy} title="Copy full tx hash" aria-label="Copy tx hash">
          {copied ? <span className="crypto-proof-copied">Copied!</span> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [terminalFinished, setTerminalFinished] = useState(false);

  const validateUrl = (input) => {
    const xRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/[0-9]+(\?.*)?$/;
    return xRegex.test(input);
  };

  const handleCheck = async () => {
    if (!url) return;
    
    if (!validateUrl(url)) {
      setError('Please provide a valid X (Twitter) status URL.');
      setData(null);
      return;
    }

    setData(null);
    setError(null);
    setTerminalFinished(false);
    setLoading(true);

    try {
      const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/x/verify` : '/api/x/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const raw = await response.text();
      if (!raw.trim()) {
        throw new Error(
          `Empty response from the server (HTTP ${response.status}). Start the API (e.g. cd api && npm run dev on port 3000) and use the Vite dev server so /api is proxied — see frontend/vite.config.js.`
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
        throw new Error(resultData.error?.message || `Verification failed (HTTP ${response.status})`);
      }

      setData(resultData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <GlobalMouseTracker />
      
      <header className="top-nav">
        <Link to="/" className="logo">
          <ShieldCheck size={18} />
          <span>TruthWire</span>
        </Link>
        <div className="nav-wallet">
          <a
            href="https://docs.telegraphprotocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ padding: '0.35rem 0.9rem', fontSize: '0.65rem' }}
          >
            Docs
          </a>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-split">
          
          {/* Left Side: Form */}
          <div className="dashboard-split-left">
            <div className="verify-box">
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} /> Back to Home
              </Link>

              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Verify a Post</h2>
              <p style={{ marginBottom: '2rem' }}>Paste the URL of the X post below to analyze its images and text context.</p>

              <div className="glass-panel text-center" style={{ padding: '3rem 2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="https://x.com/username/status/1234567890..." 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  
                  <button 
                    className="btn-primary" 
                    style={{ alignSelf: 'center', padding: '1rem 3rem', fontSize: '1.125rem' }}
                    onClick={handleCheck}
                    disabled={loading || !url}
                  >
                    {loading ? 'Scanning via Telegraph...' : 'Check if AI or Real'}
                    {!loading && <Search size={20} />}
                  </button>
                </div>

                {loading && (
                  <div className="search-loader">
                    <div className="search-loader-spinner" aria-hidden="true"></div>
                    <div>
                      <div className="search-loader-title">Analyzing with Telegraph</div>
                      <div className="search-loader-subtitle">Checking media and text signals...</div>
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

          {/* Right Side: Preview Result */}
          <div className="dashboard-split-right">
            {(data || error || loading) ? (
              <div className={`post-preview visible`}>
                <h3 style={{ marginBottom: '1rem' }}>Live Logic Feed</h3>
                
                <TerminalFeed loading={loading} data={data} error={error} onComplete={() => setTerminalFinished(true)} />

                {terminalFinished && (
                  <div className="results-container animate-in" style={{ marginTop: '2rem' }}>
                    {error && (
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                    Error: {error}
                  </div>
                )}

                {data && data.post && (
                  <div className="x-post-mockup">
                    <div className="x-header">
                      <div className="x-avatar" style={{ backgroundImage: `url(https://unavatar.io/twitter/${data.post.authorHandle})`, backgroundSize: 'cover' }}></div>
                      <div>
                        <div className="x-name">@{data.post.authorHandle}</div>
                        <Link to={data.post.sourceUrl} target="_blank" className="x-handle">Original Post</Link>
                      </div>
                    </div>
                    <div className="x-content">
                      {data.post.text}
                    </div>
                    {data.post.media && data.post.media.map((m, idx) => {
                      if (m.type === 'image') {
                        return (
                          <div key={idx} className="x-image-container" style={{ marginBottom: '0.5rem' }}>
                            <img src={m.previewUrl || m.url} alt="Post media" className="x-image" />
                          </div>
                        );
                      }
                      if (m.type === 'video') {
                        return (
                          <div key={idx} className="x-video-container" style={{ marginBottom: '0.5rem', position: 'relative' }}>
                            <video
                              className="x-video"
                              controls
                              playsInline
                              poster={m.previewUrl}
                              src={m.url}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '0.5rem',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              zIndex: 2
                            }}>
                              <AlertTriangle size={12} />
                              Analysis Unsupported
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Analysis Result */}
                {!loading && data && data.verification && data.verification.summary && (
                  <div style={{ marginTop: '2rem' }}>
                    {(() => {
                      const s = data.verification.summary;
                      const maxC = s.maxConfidence;
                      const hasImageScore = typeof maxC === 'number' && !Number.isNaN(maxC);
                      const text = data.verification.text;
                      const textAns = text?.status === 'analyzed' && text?.result ? text.result.answer : null;
                      const textLabel = textAns !== null && textAns !== undefined ? textAnswerLabel(textAns) : null;

                      return (
                    <div className="confidence-score text-center">
                      {hasImageScore ? (
                        <>
                          <span className="gradient-text">{(maxC * 100).toFixed(1)}%</span>
                          <p className="confidence-caption">Image confidence (Bitmind)</p>
                          {textLabel && (
                            <p className="confidence-subcaption">Text check: {textLabel}</p>
                          )}
                        </>
                      ) : textLabel ? (
                        <>
                          <span className="gradient-text confidence-verdict">{textLabel}</span>
                          <p className="confidence-caption">Verdict from the post text only</p>
                        </>
                      ) : (
                        <>
                          <span className="gradient-text confidence-verdict">—</span>
                          <p className="confidence-caption">No confidence score available</p>
                        </>
                      )}
                    </div>
                      );
                    })()}

                    <div className={`ai-result ${data.verification.summary.anyAi === null ? 'error' : data.verification.summary.anyAi ? 'ai' : 'real'}`}>
                      {data.verification.summary.anyAi === null ? (
                        <>
                          <AlertTriangle size={24} />
                          <span>Verification Unavailable: Miners offline</span>
                        </>
                      ) : data.verification.summary.anyAi ? (
                        <>
                          <Bot size={24} />
                          <span>Warning: High Probability of AI Generated Content</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={24} />
                          <span>Verified: Content Appears Authentic</span>
                        </>
                      )}
                    </div>

                    {/* Cryptographic Proof */}
                    {data.payment && (data.payment.bitmind || data.payment.itsai) && (
                      <div className="crypto-proof-panel">
                        <div className="crypto-proof-header">
                          <ProofIcon size={14} />
                          <span>Cryptographic Proof</span>
                          <span className="crypto-proof-network-badge">Solana Devnet</span>
                        </div>
                        <p className="crypto-proof-desc">
                          Each analysis call was paid on-chain via x402. Click a transaction to verify on Solana Explorer.
                        </p>
                        {data.payment.bitmind && (
                          <CryptoProofBlock
                            label="Bitmind"
                            sublabel="Image Analysis"
                            proof={data.payment.bitmind}
                          />
                        )}
                        {data.payment.itsai && (
                          <CryptoProofBlock
                            label="ItsAI"
                            sublabel="Text Analysis"
                            proof={data.payment.itsai}
                          />
                        )}
                      </div>
                    )}

                    {/* Provider Details */}
                    <div style={{ marginTop: '1.5rem' }}>
                       <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Powered by Telegraph</h4>

                       {data.verification.skipped?.some((x) => x.type === 'video') && (
                          <div className="provider-status" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <AlertTriangle size={20} color="#f87171" />
                                <div>
                                   <div className="provider-label" style={{ color: '#f87171' }}>Bitmind</div>
                                   <div className="provider-info" style={{ color: '#fca5a5' }}>Video analysis not supported</div>
                                </div>
                             </div>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>UNSUPPORTED</div>
                                <div className="provider-info">Images/Text only</div>
                             </div>
                          </div>
                       )}
                       
                       {/* Bitmind - Image Analysis */}
                       {data.verification.images && data.verification.images.length > 0 && (() => {
                          const failed = data.verification.images.filter(i => i.status === 'failed');
                          const analyzed = data.verification.images.filter(i => i.status !== 'failed');
                          const allFailed = failed.length === data.verification.images.length;
                          return (
                            <div className="provider-status" style={allFailed ? { borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' } : {}}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  {allFailed && <AlertTriangle size={20} color="#f87171" />}
                                  <div>
                                     <div className="provider-label" style={allFailed ? { color: '#f87171' } : {}}>Bitmind</div>
                                     <div className="provider-info" style={allFailed ? { color: '#fca5a5' } : {}}>Deep Image Analysis</div>
                                  </div>
                               </div>
                               <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: allFailed ? '#ef4444' : '#4ade80', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                     {allFailed ? 'FAILED' : 'ACTIVE'}
                                  </div>
                                  <div className="provider-info">
                                     {allFailed
                                       ? failed[0]?.error?.message ?? 'Miner unavailable'
                                       : `${analyzed.length} image${analyzed.length !== 1 ? 's' : ''} analyzed`}
                                  </div>
                               </div>
                            </div>
                          );
                       })()}

                       {/* ItsAI - Text Analysis */}
                       {data.verification.text && (
                          <div className="provider-block">
                            <div className="provider-status">
                               <div>
                                  <div className="provider-label">ItsAI</div>
                                  <div className="provider-info">Natural Language Verification</div>
                               </div>
                               <div style={{ textAlign: 'right' }}>
                                  <div
                                    style={{
                                      color:
                                        data.verification.text.status === 'analyzed'
                                          ? '#4ade80'
                                          : data.verification.text.status === 'skipped'
                                            ? '#eab308'
                                            : '#94a3b8',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                     {data.verification.text.status.toUpperCase()}
                                  </div>
                                  <div className="provider-info">
                                     {data.verification.text.status === 'skipped' ? 'Text check not run' : 'Text sequence verified'}
                                  </div>
                               </div>
                            </div>
                            {data.verification.text.status === 'skipped' && data.verification.text.skippedReason && (
                              <div className="itsai-skip-warning" role="status">
                                <AlertTriangle size={18} aria-hidden />
                                <span>{data.verification.text.skippedReason}</span>
                              </div>
                            )}
                          </div>
                       )}
                     </div>
                  </div>
                )}
                </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                 <Search size={64} style={{ marginBottom: '1rem' }} />
                 <p>Paste a link to see the preview and results here.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
