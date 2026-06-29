import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

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
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function TimestampPill({ time }) {
  return <span className="tf-time-pill">{time}</span>;
}

function DetailWithLink({ text, url }) {
  if (!url) return <span className="tf-detail">{text}</span>;
  const isExplorer = /explorer\.solana\.com|basescan\.org|etherscan\.io|polygonscan\.com/i.test(url);
  return (
    <span className="tf-detail">
      {text}{' '}
      <a href={url} target="_blank" rel="noopener noreferrer">
        {isExplorer ? 'View on explorer' : url}
        <ExternalLink size={10} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
      </a>
    </span>
  );
}

function ReceiptFooter({ receipt }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="tf-receipt">
      <button className="tf-receipt-toggle" onClick={() => setOpen(o => !o)}>
        <span>Settlement Receipt</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="tf-receipt-body">
          <div className="tf-receipt-row">
            <span className="tf-receipt-label">Provider</span>
            <span className="tf-receipt-value">{receipt.provider}</span>
          </div>
          <div className="tf-receipt-row">
            <span className="tf-receipt-label">Timestamp</span>
            <span className="tf-receipt-value">{receipt.timestamp}</span>
          </div>
          <div className="tf-receipt-row">
            <span className="tf-receipt-label">Confidence</span>
            <span className="tf-receipt-value">{receipt.confidence}</span>
          </div>
          <div className="tf-receipt-row">
            <span className="tf-receipt-label">Cost</span>
            <span className="tf-receipt-value">{receipt.cost}</span>
          </div>
          {receipt.explorerUrl && (
            <div className="tf-receipt-row">
              <span className="tf-receipt-label">Transaction</span>
              <a
                className="tf-receipt-link"
                href={receipt.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {shortHash(receipt.txHash)}
                <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const addLog = (entry, delay) => {
      const t = setTimeout(() => {
        setLogs(prev => [...prev, { ...entry, time: formatTime(), id: Math.random().toString(36).slice(2) }]);
      }, delay);
      timersRef.current.push(t);
    };

    if (loading) {
      setLogs([]);
      setReceipt(null);

      let d = 100;
      addLog({ section: 'INIT', label: 'ROUTING', detail: 'Request broadcasted to Telegraph Subnet' }, d);
      d += 400;
      addLog({ section: 'INIT', label: 'UPLOAD', detail: 'Document received, extracting content...' }, d);
      d += 600;
      addLog({ section: 'INIT', label: 'STATUS', detail: 'Handshake established with Telegraph Nodes' }, d);

    } else if (data) {
      const v = data.verification;
      const hasText = v?.text?.status === 'analyzed';
      const textError = v?.text?.status === 'error';
      const imageResults = v?.images || [];
      const hasImageSuccess = imageResults.some(i => i.status !== 'failed');
      const hasImageFailed = imageResults.some(i => i.status === 'failed');
      const anySuccess = hasText || hasImageSuccess;
      const itsaiProof = data?.payment?.itsai;
      const txHash = itsaiProof?.txHash;
      const explorerUrl = itsaiProof?.explorerUrl;

      let d = 200;

      if (hasText) {
        addLog({ section: 'ANALYSIS', label: 'ITSAI', detail: 'Evaluating linguistic patterns via Natural Language Verification...' }, d);
        d += 500;
      } else if (textError) {
        addLog({ section: 'ANALYSIS', label: 'ITSAI', detail: `Miner unavailable — ${v.text.error ?? 'text analysis failed'}` }, d);
        d += 500;
      }
      if (imageResults.length > 0) {
        if (hasImageSuccess) {
          addLog({ section: 'ANALYSIS', label: 'BITMIND', detail: `Analyzing ${imageResults.length} embedded image(s) for visual artifacts...` }, d);
        } else if (hasImageFailed) {
          addLog({ section: 'ANALYSIS', label: 'BITMIND', detail: `Miner unavailable — image analysis failed` }, d);
        }
        d += 500;
      }
      if (anySuccess) {
        addLog({ section: 'ANALYSIS', label: 'STATUS', detail: 'Neural passes complete, compiling output tensor.' }, d);
        d += 400;
      }

      if (txHash) {
        addLog({ section: 'PAYMENT', label: 'BILLING', detail: 'Deducting micro-fee for analysis call via x402' }, d);
        d += 400;
        addLog({ section: 'PAYMENT', label: 'NETWORK', detail: 'Rail: Solana Devnet' }, d);
        d += 400;
        addLog({ section: 'PAYMENT', label: 'TX', detail: `Settlement: ${shortHash(txHash)}`, url: explorerUrl }, d);
        d += 600;
      }

      if (anySuccess) {
        addLog({ section: 'PROOF', label: 'VERIFY', detail: 'Verifying cryptographic proofs from subnet nodes' }, d);
        d += 700;
        const isAi = v?.summary?.anyAi;
        addLog({ section: 'PROOF', label: 'SIGNAL', detail: `Consensus — Document marked as ${isAi ? 'AI-GENERATED' : 'LIKELY HUMAN'}` }, d);
        d += 400;
      } else {
        addLog({ section: 'PROOF', label: 'ERROR', detail: 'No miners responded — verification incomplete, no receipt generated' }, d);
        d += 400;
      }

      const t = setTimeout(() => {
        if (anySuccess || txHash) {
          setReceipt({
            provider: 'TELEGRAPH',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
            confidence: (() => {
              const imgConf = v?.summary?.textConfidence ?? v?.summary?.maxConfidence;
              if (imageResults.length > 0 && typeof imgConf === 'number') {
                return `${(imgConf * 100).toFixed(1)}%`;
              }
              if (hasText && v?.text?.result != null) {
                return v.text.result.answer === 1 ? '100% (AI)' : '0% (Human)';
              }
              return 'N/A';
            })(),
            cost: '$0.01',
            txHash,
            explorerUrl,
          });
        }
        onCompleteRef.current?.();
      }, d);
      timersRef.current.push(t);

    } else if (error) {
      addLog({ section: 'ERROR', label: 'ABORT', detail: `Pipeline aborted: ${error}` }, 100);
      const t = setTimeout(() => { onCompleteRef.current?.(); }, 500);
      timersRef.current.push(t);
    }

    return () => { timersRef.current.forEach(clearTimeout); };
  }, [loading, data, error]);

  if (!loading && !data && !error) return null;

  let currentSection = null;

  return (
    <div className="tf-container">
      <div className="tf-header">
        <div className="tf-header-title">
          <Terminal size={13} />
          Telegraph Terminal
        </div>
        <span className="tf-header-status">
          {loading ? 'PROCESSING' : receipt ? 'SETTLED' : error ? 'ERROR' : 'IDLE'}
        </span>
      </div>

      <div className="tf-body">
        {logs.map((log) => {
          const showDivider = log.section !== currentSection;
          if (showDivider) currentSection = log.section;
          return (
            <React.Fragment key={log.id}>
              {showDivider && (
                <div className="tf-section-divider">{log.section}</div>
              )}
              <div className="tf-row">
                <div className="tf-time">
                  <TimestampPill time={log.time} />
                </div>
                <div className="tf-content">
                  <div className="tf-label">{log.label}</div>
                  <DetailWithLink text={log.detail} url={log.url} />
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {loading && logs.length > 0 && !receipt && (
          <span className="tf-cursor" />
        )}

        {receipt && <ReceiptFooter receipt={receipt} />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalFeed;
