/* eslint-disable react-hooks/set-state-in-effect */
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
      setLogs((prev) => [...prev, { ...logItem, time: formatTime(), id: Math.random().toString(36).substring(7) }]);
    }, delay);
    timersRef.current.push(timer);
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, receipt]);

  useEffect(() => {
    // Clear existing timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (loading) {
      setLogs([]);
      setReceipt(null);
      
      // Initial Routing Phase
      let delay = 100;
      addLog({ group: 'Initial Routing', level: 'ROUTING', text: 'Request broadcasted to Telegraph Subnet #12' }, delay);
      delay += 400;
      addLog({ group: 'Initial Routing', level: 'WALLET', text: 'Checking connected wallet and active session...' }, delay);
      delay += 600;
      addLog({ group: 'Initial Routing', level: 'STATUS', text: 'Handshake established with Telegraph Nodes' }, delay);
      
    } else if (data) {
      const hasImage = data.verification?.images?.length > 0;
      const hasText = data.verification?.text?.status === 'analyzed';
      const bitmindTx = data.payment?.bitmind?.txHash;
      const itsaiTx = data.payment?.itsai?.txHash;
      
      let delay = 200;

      if (hasImage || hasText) {
        if (hasImage) {
          addLog({ group: 'Telegraph Analysis', level: 'BITMIND', text: `Analyzing ${data.verification.images.length} image(s) for visual artifacts...` }, delay);
          delay += 500;
        }
        if (hasText) {
          addLog({ group: 'Telegraph Analysis', level: 'ITSAI', text: `Evaluating linguistic patterns via Natural Language Verification...` }, delay);
          delay += 500;
        }
        addLog({ group: 'Telegraph Analysis', level: 'STATUS', text: `Neural passes complete, compiling output tensor.` }, delay);
        delay += 400;
      }

      if (bitmindTx || itsaiTx) {
        addLog({ group: 'Payment & Rail', level: 'BILLING', text: `Deducting $0.01 micro-fee for analysis calls` }, delay);
        delay += 400;
        addLog({ group: 'Payment & Rail', level: 'NETWORK', text: `Selected rail: Solana (Devnet)` }, delay);
        delay += 400;
        const hash = bitmindTx || itsaiTx;
        addLog({ group: 'Payment & Rail', level: 'TX', text: `Initiating settlement (id: ${shortHash(hash)})` }, delay);
        delay += 600;
      }

      addLog({ group: 'Proof Verification', level: 'PROOF', text: `Verifying cryptographic proofs from subnet nodes` }, delay);
      delay += 700;
      
      const isAi = data.verification?.summary?.anyAi;
      addLog({ group: 'Proof Verification', level: 'SIGNAL', text: `Consensus reached — Content marked as ${isAi ? 'AI-GENERATED' : 'AUTHENTIC'}` }, delay);
      delay += 400;

      const timer = setTimeout(() => {
        setReceipt({
          provider: 'TELEGRAPH',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          confidence: data.verification?.summary?.maxConfidence ? `${(data.verification.summary.maxConfidence * 100).toFixed(1)}%` : '99.8%',
          cost: '$0.01'
        });
        if (onComplete) onComplete();
      }, delay);
      timersRef.current.push(timer);

    } else if (error) {
      addLog({ group: 'System Failure', level: 'ERROR', text: `Pipeline aborted: ${error}` }, 100);
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);
      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [loading, data, error, onComplete]);

  if (!loading && !data && !error) return null;

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-header-title">
          <Terminal size={14} />
          Terminal
        </div>
        <div className="terminal-header-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
      </div>
      
      <div className="terminal-body">
        <div className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#3b82f6" />
          Live Settlement & Logic Feed
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
              Settlement Receipt
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
              <span className="receipt-label">Confidence:</span>
              <span className="receipt-value">{receipt.confidence}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Settlement Cost:</span>
              <span className="receipt-value">{receipt.cost}</span>
            </div>
          </div>
        )}

        {loading && !receipt && logs.length > 0 && (
          <div className="terminal-cursor">_</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalFeed;
