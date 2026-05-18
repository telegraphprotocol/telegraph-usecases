/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Receipt } from 'lucide-react';

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

const TerminalFeed = ({ loading, data, error, onComplete }) => {
  const [logs, setLogs] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const bottomRef = useRef(null);
  const timersRef = useRef([]);

  const addLog = (logItem, delay) => {
    const timer = setTimeout(() => {
      setLogs(prev => [...prev, { ...logItem, time: formatTime(), id: Math.random().toString(36).substring(7) }]);
    }, delay);
    timersRef.current.push(timer);
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, receipt]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (loading) {
      setLogs([]);
      setReceipt(null);

      let delay = 100;
      addLog({ group: 'Content Fetch', level: 'ROUTING', text: 'Fetching article URL and extracting content...' }, delay);
      delay += 450;
      addLog({ group: 'Content Fetch', level: 'PARSE', text: 'Extracting images and article text from page...' }, delay);
      delay += 500;
      addLog({ group: 'Telegraph Analysis', level: 'BITMIND', text: 'Submitting images to BitMind subnet 34 via x402...' }, delay);
      delay += 600;
      addLog({ group: 'Telegraph Analysis', level: 'ITSAI', text: 'Submitting article text to ItsAI subnet 32 via x402...' }, delay);
      delay += 500;
      addLog({ group: 'Campaign Guard', level: 'EVAL', text: 'Evaluating threat score against campaign threshold...' }, delay);

    } else if (data) {
      const a = data.analysis;
      const g = data.campaignGuard;
      const bitmindTxList = Array.isArray(data.payment?.bitmind) ? data.payment.bitmind : [];
      const bitmindTx = bitmindTxList[0]?.txHash;
      const itsaiTx = data.payment?.itsai?.txHash;

      const analyzedImgs = a.images.filter(i => i.status === 'analyzed');
      const failedImgs   = a.images.filter(i => i.status === 'failed');
      const fakeImgs     = analyzedImgs.filter(i => i.isDeepfake);
      const allFailed    = failedImgs.length > 0 && analyzedImgs.length === 0 && a.text.status === 'failed';

      // ── Fast-fail path: every subnet call returned an error ──────────────
      if (allFailed) {
        const errMsg = a.text.error?.message || a.images[0]?.error?.message || 'subnet returned an error';
        const is402  = errMsg.includes('402');
        addLog({ group: 'Telegraph Analysis', level: 'ERROR',
          text: is402
            ? 'All subnet calls failed: HTTP 402 — x402 payment required'
            : `All subnet calls failed: ${errMsg}`
        }, 150);
        addLog({ group: 'Telegraph Analysis', level: 'ERROR',
          text: is402
            ? 'Set SOLANA_PRIVATE_KEY in api/.env to enable automatic micro-payments'
            : `BitMind: ${failedImgs.length} image(s) failed | ItsAI: ${a.text.error?.code || 'failed'}`
        }, 550);
        const t = setTimeout(() => { onComplete?.(); }, 800);
        timersRef.current.push(t);
        return;
      }

      // ── Normal path ───────────────────────────────────────────────────────
      let delay = 200;

      addLog({ group: 'Content Fetch', level: 'STATUS',
        text: `Extracted ${data.content.imageCount} image(s) and ${data.content.textLength.toLocaleString()} chars from: ${data.content.title || data.content.url}`
      }, delay);
      delay += 500;

      if (a.images.length > 0) {
        if (failedImgs.length > 0 && analyzedImgs.length === 0) {
          addLog({ group: 'Telegraph Analysis', level: 'BITMIND',
            text: `All ${failedImgs.length} image(s) failed — ${a.images[0]?.error?.message || 'check payment key'}`
          }, delay);
        } else if (fakeImgs.length > 0) {
          addLog({ group: 'Telegraph Analysis', level: 'BITMIND',
            text: `${fakeImgs.length}/${analyzedImgs.length} image(s) flagged as deepfake — max confidence ${(a.maxImageConfidence * 100).toFixed(1)}%`
          }, delay);
        } else {
          addLog({ group: 'Telegraph Analysis', level: 'BITMIND',
            text: `${analyzedImgs.length}/${data.content.imageCount} image(s) analyzed — no deepfakes detected`
          }, delay);
        }
      } else {
        addLog({ group: 'Telegraph Analysis', level: 'BITMIND', text: 'No images found in article' }, delay);
      }
      delay += 500;

      if (a.text.status === 'analyzed') {
        addLog({ group: 'Telegraph Analysis', level: 'ITSAI',
          text: `Article text classified as ${a.text.isAiGenerated ? 'AI-GENERATED' : 'HUMAN-WRITTEN'} (${a.text.characterCount.toLocaleString()} chars)`
        }, delay);
      } else if (a.text.status === 'skipped') {
        addLog({ group: 'Telegraph Analysis', level: 'ITSAI', text: `Text analysis skipped — ${a.text.skippedReason}` }, delay);
      } else if (a.text.status === 'failed') {
        addLog({ group: 'Telegraph Analysis', level: 'ITSAI',
          text: `Text analysis failed — ${a.text.error?.message || 'check payment key'}`
        }, delay);
      }
      delay += 500;

      addLog({ group: 'Telegraph Analysis', level: 'SIGNAL',
        text: `Threat score: ${a.threatScore}% — verdict: ${a.verdict}`
      }, delay);
      delay += 400;

      if (bitmindTx || itsaiTx) {
        addLog({ group: 'Payment & Rail', level: 'BILLING', text: 'Deducting micro-fee for Telegraph inference calls' }, delay);
        delay += 400;
        addLog({ group: 'Payment & Rail', level: 'NETWORK', text: 'Selected rail: Solana (Devnet)' }, delay);
        delay += 400;
        addLog({ group: 'Payment & Rail', level: 'TX',
          text: `Settlement initiated (id: ${shortHash(bitmindTx || itsaiTx)})`
        }, delay);
        delay += 500;
      }

      if (g.triggered) {
        addLog({ group: 'Campaign Guard', level: 'ACTION',
          text: `Threshold exceeded — pausing ${g.pausedCount} campaign(s)${g.simulatedMode ? ' [SIMULATED]' : ''}`
        }, delay);
      } else {
        addLog({ group: 'Campaign Guard', level: 'STATUS', text: g.reason }, delay);
      }
      delay += 400;

      const timer = setTimeout(() => {
        setReceipt({
          provider: 'TELEGRAPH',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          threatScore: `${a.threatScore}% (${a.verdict})`,
          cost: (bitmindTx || itsaiTx) ? '$0.01' : 'N/A'
        });
        onComplete?.();
      }, delay);
      timersRef.current.push(timer);

    } else if (error) {
      addLog({ group: 'System Failure', level: 'ERROR', text: `Pipeline aborted: ${error}` }, 100);
      const timer = setTimeout(() => { onComplete?.(); }, 500);
      timersRef.current.push(timer);
    }

    return () => { timersRef.current.forEach(clearTimeout); };
  }, [loading, data, error]);

  if (!loading && !data && !error) return null;

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-header-title">
          <Terminal size={14} />
          Terminal
        </div>
        <div className="terminal-header-dots">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
      </div>

      <div className="terminal-body">
        <div className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#3b82f6" />
          Live Analysis &amp; Settlement Feed
        </div>

        {logs.map((log, index) => {
          const showGroup = index === 0 || log.group !== logs[index - 1].group;
          return (
            <React.Fragment key={log.id}>
              {showGroup && (
                <div className="terminal-group-header">
                  <span className="terminal-col-time">Time</span>
                  <span className="terminal-col-group">{log.group}</span>
                </div>
              )}
              <div className="terminal-row">
                <div className="terminal-col-time">
                  <span className="terminal-time-badge">{log.time}</span>
                </div>
                <div className="terminal-col-content">
                  <div className={`terminal-level level-${log.level.toLowerCase()}`}>{log.level}</div>
                  <div className="terminal-text">{log.text}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {receipt && (
          <div className="terminal-receipt animate-in">
            <div className="receipt-title">
              <Receipt size={18} />
              Analysis Receipt
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Provider:</span>
              <span className="receipt-value">{receipt.provider}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Timestamp:</span>
              <span className="receipt-value">{receipt.timestamp}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Threat Score:</span>
              <span className="receipt-value">{receipt.threatScore}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Settlement Cost:</span>
              <span className="receipt-value">{receipt.cost}</span>
            </div>
          </div>
        )}

        {loading && logs.length > 0 && <div className="terminal-cursor">_</div>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalFeed;
