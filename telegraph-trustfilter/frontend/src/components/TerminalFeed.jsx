/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

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

function ReceiptFooter({ receipt }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="tf-receipt">
      <button className="tf-receipt-toggle" onClick={() => setOpen((o) => !o)}>
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
            <span className="tf-receipt-label">Verdict</span>
            <span className="tf-receipt-value">{receipt.verdict}</span>
          </div>
          <div className="tf-receipt-row">
            <span className="tf-receipt-label">Cost</span>
            <span className="tf-receipt-value">{receipt.cost}</span>
          </div>
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
        setLogs((prev) => [
          ...prev,
          { ...entry, time: formatTime(), id: Math.random().toString(36).slice(2) },
        ]);
      }, delay);
      timersRef.current.push(t);
    };

    if (loading) {
      setLogs([]);
      setReceipt(null);

      let d = 100;
      addLog({ section: 'INIT', label: 'ROUTING', detail: 'Request broadcasted to Telegraph Miner #102' }, d);
      d += 400;
      addLog({ section: 'INIT', label: 'INPUT', detail: 'Validating submitted phone/message data...' }, d);
      d += 600;
      addLog({ section: 'INIT', label: 'STATUS', detail: 'Handshake established with Telegraph OpenAI Node' }, d);

    } else if (data) {
      const txHash = data.txHash;
      const verdict = data.verdict;
      const confidence = data.confidence;

      let d = 200;

      addLog({ section: 'ANALYSIS', label: 'MODEL', detail: 'Deploying gpt-4o-search-preview for scam pattern analysis...' }, d);
      d += 500;
      addLog({ section: 'ANALYSIS', label: 'SCAN', detail: 'Analyzing linguistic patterns and known scam indicators...' }, d);
      d += 500;
      addLog({ section: 'ANALYSIS', label: 'STATUS', detail: 'LLM inference complete, parsing verdict...' }, d);
      d += 400;

      if (txHash) {
        addLog({ section: 'PAYMENT', label: 'BILLING', detail: 'Deducting $0.01 micro-fee for LLM call' }, d);
        d += 400;
        addLog({ section: 'PAYMENT', label: 'NETWORK', detail: 'Selected rail: Solana (Devnet)' }, d);
        d += 400;
        addLog({ section: 'PAYMENT', label: 'TX', detail: `Initiating settlement (id: ${shortHash(txHash)})` }, d);
        d += 600;
      }

      addLog({
        section: 'VERDICT',
        label: 'SIGNAL',
        detail: `Consensus reached — ${verdict ? verdict.toUpperCase() : 'UNKNOWN'} (${confidence !== undefined ? (confidence * 100).toFixed(1) : '?'}% confidence)`,
      }, d);
      d += 400;

      const t = setTimeout(() => {
        setReceipt({
          provider: 'TELEGRAPH / OPENAI',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          verdict: verdict ? verdict.toUpperCase().replace('_', ' ') : 'UNKNOWN',
          cost: txHash ? '$0.01' : 'N/A',
        });
        onCompleteRef.current();
      }, d);
      timersRef.current.push(t);

    } else if (error) {
      addLog({ section: 'ERROR', label: 'ABORT', detail: `Pipeline aborted: ${error}` }, 100);
      const t = setTimeout(() => { onCompleteRef.current(); }, 500);
      timersRef.current.push(t);
    }

    return () => { timersRef.current.forEach(clearTimeout); };
  }, [loading, data, error]);

  if (!loading && !data && !error) return null;

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
        {logs.map((log, index) => {
          const showDivider = index === 0 || log.section !== logs[index - 1].section;
          return (
            <React.Fragment key={log.id}>
              {showDivider && <div className="tf-section-divider">{log.section}</div>}
              <div className="tf-row">
                <div className="tf-time">
                  <span className="tf-time-pill">{log.time}</span>
                </div>
                <div className="tf-content">
                  <div className="tf-label">{log.label}</div>
                  <span className="tf-detail">{log.detail}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {loading && logs.length > 0 && !receipt && <span className="tf-cursor" />}
        {receipt && <ReceiptFooter receipt={receipt} />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalFeed;
