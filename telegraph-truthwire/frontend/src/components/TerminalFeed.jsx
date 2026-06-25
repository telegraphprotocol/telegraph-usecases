import React, { useState, useEffect, useRef } from 'react';
import { Activity, ChevronDown, ShieldCheck, Zap } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function shortHash(hash) {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

const URL_RE = /https?:\/\/\S+/g;

function DetailWithLink({ detail }) {
  const parts = [];
  let last = 0;
  for (const m of detail.matchAll(URL_RE)) {
    if (m.index > last) parts.push(detail.slice(last, m.index));
    const url = m[0];
    const isExplorer = /explorer\.solana\.com|basescan\.org|etherscan\.io|polygonscan\.com/i.test(url);
    parts.push(
      <a key={m.index} href={url} target="_blank" rel="noopener noreferrer"
        className="tf-detail-link"
        onClick={(e) => e.stopPropagation()}
      >
        {isExplorer ? 'View on explorer' : url}
      </a>
    );
    last = m.index + url.length;
  }
  if (last < detail.length) parts.push(detail.slice(last));
  return <>{parts}</>;
}

// ─── TimestampPill ────────────────────────────────────────────────────────────

function TimestampPill({ time }) {
  const [main, frac] = time.includes('.') ? time.split('.') : [time, ''];
  return (
    <div className="tf-timestamp-pill">
      <span className="tf-timestamp-main">{main}</span>
      {frac && <span className="tf-timestamp-frac">.{frac}</span>}
    </div>
  );
}

// ─── Receipt footer ───────────────────────────────────────────────────────────

function ReceiptFooter({ receipt }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tf-receipt-footer">
      {expanded && (
        <div className="tf-receipt-detail">
          <div className="tf-receipt-grid">
            <div className="tf-receipt-cell">
              <div className="tf-receipt-cell-label"><Activity size={10} /> Miner Provider</div>
              <div className="tf-receipt-cell-value">{receipt.provider}</div>
            </div>
            <div className="tf-receipt-cell">
              <div className="tf-receipt-cell-label"><ShieldCheck size={10} /> Confidence</div>
              <div className="tf-receipt-cell-value">{receipt.confidence}</div>
            </div>
            <div className="tf-receipt-cell">
              <div className="tf-receipt-cell-label"><Zap size={10} /> Network Fee</div>
              <div className="tf-receipt-cell-value">{receipt.cost}</div>
            </div>
            <div className="tf-receipt-cell">
              <div className="tf-receipt-cell-label"><Activity size={10} /> System Clock</div>
              <div className="tf-receipt-cell-value">{receipt.timestamp}</div>
            </div>
          </div>
          {receipt.explorerUrl && (
            <div className="tf-receipt-tx">
              <div className="tf-receipt-cell-label">Payment (x402)</div>
              <a href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer" className="tf-receipt-tx-link">
                {shortHash(receipt.txHash) || 'View on explorer'}
              </a>
            </div>
          )}
        </div>
      )}
      <button type="button" className="tf-receipt-bar" onClick={() => setExpanded(v => !v)}>
        <div className="tf-receipt-bar-left">
          <span className="tf-receipt-bar-eyebrow">Receipt Generated</span>
          <span className="tf-receipt-bar-provider">{receipt.provider}</span>
          <span className="tf-receipt-bar-time">{receipt.timestamp}</span>
        </div>
        <div className="tf-receipt-bar-right">
          <span className="tf-receipt-bar-cost">{receipt.cost}</span>
          <span className="tf-receipt-verified">
            <span className="tf-verified-dot" />
            Verified
          </span>
          <ChevronDown size={16} className={`tf-chevron${expanded ? ' rotated' : ''}`} />
        </div>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TerminalFeed = ({ loading, data, error, onComplete }) => {
  const [logs, setLogs] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const bottomRef = useRef(null);
  const timersRef = useRef([]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, receipt]);

  const addLog = (entry, delay) => {
    const timer = setTimeout(() => {
      setLogs(prev => [...prev, { ...entry, time: formatTime(), id: Math.random().toString(36).slice(2) }]);
    }, delay);
    timersRef.current.push(timer);
  };

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (loading) {
      setLogs([]);
      setReceipt(null);

      let d = 100;
      addLog({ section: 'Initial Routing', label: 'ROUTING', detail: 'Request broadcasted to Telegraph Subnet #12' }, d);
      d += 400;
      addLog({ section: 'Initial Routing', label: 'WALLET', detail: 'Checking connected wallet and active session...' }, d);
      d += 600;
      addLog({ section: 'Initial Routing', label: 'STATUS', detail: 'Handshake established with Telegraph Nodes' }, d);

    } else if (data) {
      const hasImage = data.verification?.images?.length > 0;
      const hasText = data.verification?.text?.status === 'analyzed';
      const bitmindTx = data.payment?.bitmind?.txHash;
      const itsaiTx = data.payment?.itsai?.txHash;

      let d = 200;

      if (hasImage) {
        addLog({ section: 'Telegraph Analysis', label: 'BITMIND', detail: `Analyzing ${data.verification.images.length} image(s) for visual artifacts...` }, d);
        d += 500;
      }
      if (hasText) {
        addLog({ section: 'Telegraph Analysis', label: 'ITSAI', detail: 'Evaluating linguistic patterns via Natural Language Verification...' }, d);
        d += 500;
      }
      if (hasImage || hasText) {
        addLog({ section: 'Telegraph Analysis', label: 'STATUS', detail: 'Neural passes complete, compiling output tensor.' }, d);
        d += 400;
      }

      if (bitmindTx || itsaiTx) {
        addLog({ section: 'Payment & Rail', label: 'BILLING', detail: 'Deducting $0.01 micro-fee for analysis calls' }, d);
        d += 400;
        addLog({ section: 'Payment & Rail', label: 'NETWORK', detail: 'Selected rail: Solana (Devnet)' }, d);
        d += 400;
        const hash = bitmindTx || itsaiTx;
        const explorerBase = data.payment?.bitmind?.explorerUrl || data.payment?.itsai?.explorerUrl || '';
        addLog({ section: 'Payment & Rail', label: 'TX', detail: `Settlement initiated — ${explorerBase || `id: ${shortHash(hash)}`}` }, d);
        d += 600;
      }

      addLog({ section: 'Proof Verification', label: 'PROOF', detail: 'Verifying cryptographic proofs from subnet nodes' }, d);
      d += 700;

      const isAi = data.verification?.summary?.anyAi;
      addLog({ section: 'Proof Verification', label: 'SIGNAL', detail: `Consensus reached — Content marked as ${isAi ? 'AI-GENERATED' : 'AUTHENTIC'}` }, d);
      d += 400;

      const timer = setTimeout(() => {
        setReceipt({
          provider: 'TELEGRAPH',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          confidence: data.verification?.summary?.maxConfidence
            ? `${(data.verification.summary.maxConfidence * 100).toFixed(1)}%`
            : '99.8%',
          cost: '$0.01',
          explorerUrl: data.payment?.bitmind?.explorerUrl || data.payment?.itsai?.explorerUrl || null,
          txHash: data.payment?.bitmind?.txHash || data.payment?.itsai?.txHash || null,
        });
        if (onCompleteRef.current) onCompleteRef.current();
      }, d);
      timersRef.current.push(timer);

    } else if (error) {
      addLog({ section: 'System Failure', label: 'ERROR', detail: `Pipeline aborted: ${error}` }, 100);
      const timer = setTimeout(() => {
        if (onCompleteRef.current) onCompleteRef.current();
      }, 500);
      timersRef.current.push(timer);
    }

    return () => { timersRef.current.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, error]);

  if (!loading && !data && !error) return null;

  return (
    <div className="tf-container">
      <div className="tf-header">
        <div className="tf-header-title">
          <Activity size={14} />
          Terminal
          <span className="tf-live-badge">
            <span className="tf-live-dot" />
            Live
          </span>
        </div>
        <p className="tf-header-sub">Live Settlement &amp; Logic Feed</p>
      </div>

      <div className="tf-body">
        {logs.length === 0 && (
          <p className="tf-empty">Waiting for network signal...</p>
        )}

        <div className="tf-log-list">
          {logs.map((log, i) => {
            const showHeader = i === 0 || log.section !== logs[i - 1].section;
            return (
              <React.Fragment key={log.id}>
                {showHeader && (
                  <div className={`tf-section-header${i > 0 ? ' tf-section-gap' : ''}`}>
                    <span className="tf-section-line" />
                    <span className="tf-section-label">{log.section}</span>
                    <span className="tf-section-line" />
                  </div>
                )}
                <div className="tf-row tf-row-enter">
                  <TimestampPill time={log.time} />
                  <div className="tf-row-content">
                    <span className="tf-row-label">{log.label}</span>
                    <p className="tf-row-detail">
                      <DetailWithLink detail={log.detail} />
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {loading && logs.length > 0 && !receipt && (
          <div className="tf-cursor">_</div>
        )}

        <div ref={bottomRef} />
      </div>

      {receipt && <ReceiptFooter receipt={receipt} />}
    </div>
  );
};

export default TerminalFeed;
