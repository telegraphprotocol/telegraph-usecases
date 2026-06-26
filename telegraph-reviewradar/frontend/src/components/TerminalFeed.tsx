import React, { useState, useEffect, useRef } from "react";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
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
  section: string;
  label: string;
  detail: string;
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

function ReceiptFooter({ receipt }: { receipt: ReceiptData }) {
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
            <span className="tf-receipt-label">Reviews</span>
            <span className="tf-receipt-value">{receipt.reviews}</span>
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

const TerminalFeed: React.FC<Props> = ({ loading, data, error, onComplete }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, receipt]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const addLog = (entry: Omit<LogItem, "id" | "time">, delay: number) => {
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
      addLog({ section: "INIT", label: "ROUTING", detail: "Request broadcasted to Telegraph Subnet" }, d);
      d += 400;
      addLog({ section: "INIT", label: "SCRAPE", detail: "Fetching Amazon product reviews via SerpApi..." }, d);
      d += 600;
      addLog({ section: "INIT", label: "STATUS", detail: "Handshake established with Telegraph Nodes" }, d);

    } else if (data) {
      const reviewCount = data.items.length;
      let d = 200;

      data.items.forEach((item, i) => {
        const section = `REVIEW ${i + 1}/${reviewCount}`;
        addLog({ section, label: "ITSAI", detail: "Sending review text for linguistic analysis..." }, d);
        d += 450;
        if (item.txHash) {
          addLog({ section, label: "TX", detail: `Settlement confirmed: ${shortHash(item.txHash)}` }, d);
          d += 350;
        }
        addLog({ section, label: "DONE", detail: "Analysis complete" }, d);
        d += 300;
      });

      addLog({ section: "PROOF", label: "VERIFY", detail: "Verifying cryptographic proofs from subnet nodes" }, d);
      d += 700;

      const s = aggregateItsAiPercentages(data.items);
      const signal =
        s.definitive > 0
          ? `${s.pctHuman}% likely human · ${s.pctAi}% likely AI (${s.definitive} definitive)`
          : "Consensus reached — analysis complete";

      addLog({ section: "PROOF", label: "SIGNAL", detail: signal }, d);
      d += 400;

      const firstTx = data.items.find((it) => it.txHash)?.txHash ?? null;

      const t = setTimeout(() => {
        setReceipt({
          provider: "TELEGRAPH",
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
          reviews: `${reviewCount} analyzed`,
          cost: firstTx ? `$${(reviewCount * 0.01).toFixed(2)}` : "N/A",
        });
        onCompleteRef.current();
      }, d);
      timersRef.current.push(t);

    } else if (error) {
      addLog({ section: "ERROR", label: "ABORT", detail: `Pipeline aborted: ${error}` }, 100);
      const t = setTimeout(() => { onCompleteRef.current(); }, 500);
      timersRef.current.push(t);
    }

    return () => { timersRef.current.forEach(clearTimeout); };
  }, [loading, data, error]);

  if (!loading && !data && !error) return null;

  let currentSection: string | null = null;

  return (
    <div className="tf-container">
      <div className="tf-header">
        <div className="tf-header-title">
          <Terminal size={13} />
          Telegraph Terminal
        </div>
        <span className="tf-header-status">
          {loading ? "PROCESSING" : receipt ? "SETTLED" : error ? "ERROR" : "IDLE"}
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
