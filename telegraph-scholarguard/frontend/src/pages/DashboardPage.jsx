import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ArrowLeft,
  Upload,
  FileText,
  Bot,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Hash,
} from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';
import TerminalFeed from '../components/TerminalFeed';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function shortHash(hash) {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CryptoProofBlock({ label, sublabel, txHash, explorerUrl }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(txHash).then(() => {
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
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={txHash}
        >
          {shortHash(txHash)}
          <ExternalLink size={11} />
        </a>
        <button
          className="crypto-proof-copy-btn"
          onClick={copy}
          title="Copy full tx hash"
          aria-label="Copy tx hash"
        >
          {copied ? <span className="crypto-proof-copied">Copied!</span> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

function collectAllProofs(result) {
  const proofs = [];
  const v = result?.verification;
  if (!v) return proofs;

  // Text proof
  if (v.text?.payment) {
    proofs.push({
      label: 'ItsAI',
      sublabel: 'Text Analysis',
      txHash: v.text.payment.txHash,
      explorerUrl: v.text.payment.explorerUrl,
    });
  }

  // Image proofs
  if (Array.isArray(v.images)) {
    v.images.forEach((img, idx) => {
      if (img.payment) {
        proofs.push({
          label: `BitMind — Image ${idx + 1}`,
          sublabel: 'Image Analysis',
          txHash: img.payment.txHash,
          explorerUrl: img.payment.explorerUrl,
        });
      }
    });
  }

  // Top-level payment object fallback — only include entries with actual tx hashes
  if (result?.payment) {
    const p = result.payment;
    if (p.itsai?.txHash && !proofs.find(pr => pr.label === 'ItsAI')) {
      proofs.push({ label: 'ItsAI', sublabel: 'Text Analysis', ...p.itsai });
    }
    if (Array.isArray(p.bitmind)) {
      p.bitmind.forEach((b, idx) => {
        if (b?.txHash && !proofs.find(pr => pr.label === `BitMind — Image ${idx + 1}`)) {
          proofs.push({ label: `BitMind — Image ${idx + 1}`, sublabel: 'Image Analysis', ...b });
        }
      });
    }
  }

  return proofs;
}

const DashboardPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [proofsOpen, setProofsOpen] = useState(false);
  const [terminalFinished, setTerminalFinished] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is 10 MB (this file is ${formatBytes(selectedFile.size)}).`);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  }, []);

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setProofsOpen(false);
    setTerminalFinished(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = API_BASE_URL
        ? `${API_BASE_URL}/api/assignment/verify`
        : '/api/assignment/verify';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();
      if (!raw.trim()) {
        throw new Error(
          `Empty response from the server (HTTP ${response.status}). Ensure the API is running on port 3000 and the Vite dev proxy is active.`
        );
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `The server did not return JSON (HTTP ${response.status}). Check the API server logs.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error?.message || `Verification failed (HTTP ${response.status})`);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const anyAi = result?.verification?.summary?.anyAi;
  const summary = result?.verification?.summary;
  const textResult = result?.verification?.text;
  const imageResults = result?.verification?.images || [];
  const docInfo = result?.document;
  const allProofs = collectAllProofs(result);

  return (
    <div className="dashboard-layout">
      <GlobalMouseTracker />

      <header className="top-nav">
        <Link to="/" className="logo">
          <Shield size={28} color="var(--accent-color)" />
          <span>ScholarGuard</span>
        </Link>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={15} /> Back to Home
        </Link>
      </header>

      <main className="dashboard-main container">
        <div className="center-panel">
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Analyze Assignment</h2>
          <p style={{ marginBottom: '2rem', fontSize: '1rem' }}>
            Upload a PDF or DOCX file to detect AI-generated content using Telegraph&apos;s subnet network.
          </p>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={handleZoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleZoneClick()}
            aria-label="Upload assignment file"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />

            {file ? (
              <div>
                <div className="upload-icon">
                  <FileText size={40} color="var(--accent-green)" />
                </div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatBytes(file.size)}</span>
                </div>
                <button
                  className="change-file-btn"
                  style={{ marginTop: '1rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
                    setError(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Change file
                </button>
              </div>
            ) : (
              <div>
                <div className="upload-icon">
                  <Upload size={40} />
                </div>
                <h3>Drop your PDF or DOCX here</h3>
                <p>or click to browse</p>
                <p className="upload-hint">Accepted: .pdf, .docx · Max 10 MB</p>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              className="btn-primary"
              style={{ padding: '0.9rem 3rem', fontSize: '1.05rem' }}
              onClick={handleAnalyze}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Analyze Assignment
                </>
              )}
            </button>
          </div>

          {/* Terminal Feed */}
          {(loading || result || error) && (
            <TerminalFeed
              loading={loading}
              data={result}
              error={error}
              onComplete={() => setTerminalFinished(true)}
            />
          )}

          {/* Error */}
          {terminalFinished && error && (
            <div className="error-box" style={{ marginTop: '1rem' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Results Panel */}
          {terminalFinished && result && (
            <div className="results-panel" style={{ marginTop: '2rem' }}>

              {/* Document info */}
              {docInfo && (
                <div className="doc-info-card">
                  <div className="doc-info-item">
                    <div className="doc-info-label">Filename</div>
                    <div className="doc-info-value" style={{ fontSize: '0.85rem' }}>
                      {docInfo.filename || file?.name || '—'}
                    </div>
                  </div>
                  <div className="doc-info-item">
                    <div className="doc-info-label">Type</div>
                    <div className="doc-info-value">
                      {docInfo.mimeType
                        ? docInfo.mimeType.includes('pdf') ? 'PDF' : 'DOCX'
                        : '—'}
                    </div>
                  </div>
                  <div className="doc-info-item">
                    <div className="doc-info-label">Characters</div>
                    <div className="doc-info-value">
                      {typeof docInfo.characterCount === 'number'
                        ? docInfo.characterCount.toLocaleString()
                        : '—'}
                    </div>
                  </div>
                  <div className="doc-info-item">
                    <div className="doc-info-label">Images Found</div>
                    <div className="doc-info-value">
                      {typeof docInfo.imageCount === 'number'
                        ? docInfo.imageCount
                        : imageResults.length}
                    </div>
                  </div>
                </div>
              )}

              {/* Overall verdict */}
              <div className={`overall-verdict ${anyAi ? 'ai-generated' : 'likely-human'}`}>
                {anyAi ? (
                  <>
                    <Bot size={26} />
                    AI Generated
                  </>
                ) : (
                  <>
                    <CheckCircle size={26} />
                    Likely Human
                  </>
                )}
              </div>

              {/* Text Analysis */}
              {textResult && (
                <div className="analysis-section">
                  <div className="analysis-section-title">Text Analysis — ItsAI</div>

                  <div className="analysis-row">
                    <div>
                      <div className="analysis-label">ItsAI Verdict</div>
                      <div className="analysis-sub">Natural language detection</div>
                    </div>
                    <div className="analysis-value">
                      {textResult.status === 'analyzed' && textResult.result ? (
                        <span className={textResult.result.answer === 1 ? 'verdict-ai' : 'verdict-human'}>
                          {textResult.result.answer === 1 ? 'AI Generated' : 'Likely Human'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {textResult.status === 'skipped' ? 'Skipped' : 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  {textResult.status === 'analyzed' && textResult.result && (
                    <div className="analysis-row">
                      <div>
                        <div className="analysis-label">AI Probability</div>
                        <div className="analysis-sub">ItsAI binary signal</div>
                      </div>
                      <div className="analysis-value gradient-text">
                        {textResult.result.answer === 1 ? '100%' : '0%'}
                      </div>
                    </div>
                  )}

                  {textResult.status === 'skipped' && textResult.skippedReason && (
                    <div className="error-box" style={{ background: 'rgba(234,179,8,0.08)', color: '#fbbf24', borderColor: 'rgba(234,179,8,0.25)' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <span>{textResult.skippedReason}</span>
                    </div>
                  )}

                  {textResult.payment?.txHash && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <CryptoProofBlock
                        label="ItsAI · Text"
                        sublabel="Solana x402 payment"
                        txHash={textResult.payment.txHash}
                        explorerUrl={textResult.payment.explorerUrl}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Image Analysis */}
              {imageResults.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-title">
                    Image Analysis — BitMind ({imageResults.length} image{imageResults.length !== 1 ? 's' : ''})
                  </div>

                  {imageResults.map((img, idx) => (
                    <div key={idx} className="image-result-row">
                      <div className="image-result-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ImageIcon size={15} color="var(--text-secondary)" />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Image {idx + 1}</span>
                        </div>
                        <span
                          className={
                            img.result?.isAI || img.isAI ? 'verdict-ai' : 'verdict-human'
                          }
                          style={{ fontSize: '0.875rem', fontWeight: 700 }}
                        >
                          {img.result?.isAI || img.isAI ? 'AI Generated' : 'Likely Human'}
                        </span>
                      </div>
                      {typeof (img.result?.confidence ?? img.confidence) === 'number' && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Confidence:{' '}
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                            {((img.result?.confidence ?? img.confidence) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {img.payment?.txHash && (
                        <CryptoProofBlock
                          label={`BitMind · Image ${idx + 1}`}
                          sublabel="Solana x402 payment"
                          txHash={img.payment.txHash}
                          explorerUrl={img.payment.explorerUrl}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsible all proofs */}
              {allProofs.length > 0 && (
                <>
                  <button
                    className="proofs-toggle"
                    onClick={() => setProofsOpen((o) => !o)}
                    aria-expanded={proofsOpen}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Hash size={15} />
                      Cryptographic Proofs ({allProofs.length})
                    </span>
                    {proofsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {proofsOpen && (
                    <div className="crypto-proof-panel" style={{ marginTop: '0.5rem' }}>
                      <div className="crypto-proof-header">
                        <Shield size={14} />
                        <span>On-Chain Verification</span>
                        <span className="crypto-proof-network-badge">Solana Devnet</span>
                      </div>
                      <p className="crypto-proof-desc">
                        Each analysis call was paid on-chain via x402. Click a transaction to
                        verify on Solana Explorer.
                      </p>
                      {allProofs.map((proof, idx) => (
                        <CryptoProofBlock key={idx} {...proof} />
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
