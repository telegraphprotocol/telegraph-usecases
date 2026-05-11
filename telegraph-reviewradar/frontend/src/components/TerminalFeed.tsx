/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { Terminal, Activity, Receipt } from "lucide-react";
import { aggregateItsAiPercentages } from "../api";
import type { AnalyzeSuccess } from "../api";

function formatTime() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function shortHash(hash: string) {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

type LogItem = {
  id: string;
  time: string;
  group: string;
  level: string;
  text: string;
};

type ReceiptData = {
  provider: string;
  timestamp: string;
  reviews: string;
  cost: string;
};

type Props = {
  loading: boolean;
  data: AnalyzeSuccess | null;
  error: string | null;
  onComplete: () => void;
};

const TerminalFeed: React.FC<Props> = ({ loading, data, error, onComplete }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addLog = (logItem: Omit<LogItem, "id" | "time">, delay: number) => {
    const timer = setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        { ...logItem, time: formatTime(), id: Math.random().toString(36).substring(7) },
      ]);
    }, delay);
    timersRef.current.push(timer);
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, receipt]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (loading) {
      setLogs([]);
      setReceipt(null);

      let delay = 100;
      addLog({ group: "Initial Routing", level: "ROUTING", text: "Request broadcasted to Telegraph Subnet #12" }, delay);
      delay += 400;
      addLog({ group: "Initial Routing", level: "SCRAPE", text: "Fetching Amazon product reviews via SerpApi..." }, delay);
      delay += 600;
      addLog({ group: "Initial Routing", level: "STATUS", text: "Handshake established with Telegraph Nodes" }, delay);

    } else if (data) {
      const reviewCount = data.items.length;

      let delay = 200;

      // Per-review ItsAI + payment logs
      data.items.forEach((item, i) => {
        const reviewLabel = `Review ${i + 1} of ${reviewCount}`;
        addLog({ group: reviewLabel, level: "ITSAI", text: `Sending review text to ItsAI for linguistic analysis...` }, delay);
        delay += 450;
        if (item.txHash) {
          addLog({ group: reviewLabel, level: "TX", text: `Settlement confirmed (id: ${shortHash(item.txHash)})` }, delay);
          delay += 350;
        }
        addLog({ group: reviewLabel, level: "STATUS", text: `Analysis complete` }, delay);
        delay += 300;
      });

      addLog({ group: "Proof Verification", level: "PROOF", text: "Verifying cryptographic proofs from subnet nodes" }, delay);
      delay += 700;

      const s = aggregateItsAiPercentages(data.items);
      const signal = s.definitive > 0
        ? `${s.pctHuman}% likely human · ${s.pctAi}% likely AI (${s.definitive} definitive)`
        : "Consensus reached — analysis complete";

      addLog({ group: "Proof Verification", level: "SIGNAL", text: signal }, delay);
      delay += 400;

      const firstTx = data.items.find((it) => it.txHash)?.txHash ?? null;

      const timer = setTimeout(() => {
        setReceipt({
          provider: "TELEGRAPH",
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
          reviews: `${reviewCount} analyzed`,
          cost: firstTx ? `$${(reviewCount * 0.01).toFixed(2)}` : "N/A",
        });
        onComplete();
      }, delay);
      timersRef.current.push(timer);

    } else if (error) {
      addLog({ group: "System Failure", level: "ERROR", text: `Pipeline aborted: ${error}` }, 100);
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
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
        <div className="terminal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Activity size={18} color="#5ca8ff" />
          Live Settlement &amp; Logic Feed
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
              <span className="receipt-label">Reviews:</span>
              <span className="receipt-value">{receipt.reviews}</span>
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
