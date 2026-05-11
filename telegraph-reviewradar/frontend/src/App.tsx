import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  Radar,
  Search,
  Loader2,
  User,
  Calendar,
  Star,
  Sparkles,
  FileJson,
  Link2,
  ShoppingCart,
  Shield,
  Bot,
  ExternalLink,
} from "lucide-react";
import {
  aggregateItsAiPercentages,
  analyzeEndpoint,
  formatReviewSummary,
  itsAiSummary,
  solanaExplorerTxUrl,
  type AmazonProductPreview,
  type AnalyzeErrorBody,
  type AnalyzeItem,
  type AnalyzeSuccess,
} from "./api";
import "./App.css";
import TerminalFeed from "./components/TerminalFeed";

type UiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: AnalyzeSuccess }
  | {
      kind: "err";
      message: string;
      detail?: string;
      partial?: AnalyzeItem[];
      asin?: string;
      product?: AmazonProductPreview;
      warning?: string;
    };

export default function App() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [url, setUrl] = useState("");
  const [state, setState] = useState<UiState>({ kind: "idle" });
  const [terminalFinished, setTerminalFinished] = useState(false);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  const onSearch = useCallback(async () => {
    const productUrl = url.trim();
    if (!productUrl) return;

    setState({ kind: "loading" });
    setTerminalFinished(false);
    try {
      const res = await fetch(analyzeEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl }),
      });

      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = null;
      }

      console.log("[analyze] HTTP", res.status, "body:", body);
      if (res.ok && body && typeof body === "object" && "items" in body) {
        setState({ kind: "ok", data: body as AnalyzeSuccess });
        return;
      }

      const err = (body && typeof body === "object" ? body : {}) as AnalyzeErrorBody;
      setState({
        kind: "err",
        message: err.error ?? `Request failed (${res.status})`,
        detail: err.detail,
        partial: err.partial,
        asin: err.asin,
        product: err.product,
        warning: err.warning,
      });
    } catch (e) {
      setState({
        kind: "err",
        message: "Network error",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }, [url]);

  return (
    <div
      className="dash-page"
      style={
        {
          "--mouse-x": `${mouse.x}%`,
          "--mouse-y": `${mouse.y}%`,
        } as CSSProperties
      }
    >
      <div
        className="bg-orb orb-one"
        style={
          {
            "--mx": `${(mouse.x - 50) * 1.2}px`,
            "--my": `${(mouse.y - 50) * 1.1}px`,
          } as CSSProperties
        }
      />
      <div
        className="bg-orb orb-two"
        style={
          {
            "--mx": `${(50 - mouse.x) * 1.3}px`,
            "--my": `${(50 - mouse.y) * 1.15}px`,
          } as CSSProperties
        }
      />
      <div className="grid-overlay" aria-hidden="true" />

      <nav className="dash-nav glass">
        <div className="dash-brand">
          <span className="dash-brand-icon" aria-hidden="true">
            <Radar size={20} strokeWidth={2.2} />
          </span>
          <span>ReviewRadar</span>
        </div>
        <span className="dash-nav-tag">Live analysis</span>
      </nav>

      <main className="dash-main">
        <header className="dash-hero">
          <p className="dash-badge glass">
            <ShoppingCart size={14} aria-hidden="true" />
            Amazon · ItsAI · x402 on Solana
          </p>
          <h1>Check reviews before you buy</h1>
          <p className="dash-subtitle">
            Paste an Amazon product link. We pull recent reviews, run AI-vs-human detection via
            Telegraph, and show an on-chain settlement link as proof of each analysis.
          </p>
        </header>

        <section className="dash-search-shell glass">
          <p className="dash-label">
            <Search size={18} aria-hidden="true" />
            Product URL
          </p>
          <div className="dash-form-row">
            <input
              type="url"
              name="productUrl"
              placeholder="https://www.amazon.com/dp/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              disabled={state.kind === "loading"}
              autoComplete="off"
            />
            <button
              type="button"
              className="dash-btn-primary"
              onClick={onSearch}
              disabled={state.kind === "loading" || !url.trim()}
            >
              {state.kind === "loading" ? (
                <>
                  <Loader2 size={18} className="dash-spin" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles size={18} aria-hidden="true" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </section>

        {(state.kind === "loading" || state.kind === "ok" || state.kind === "err") ? (
          <TerminalFeed
            loading={state.kind === "loading"}
            data={state.kind === "ok" ? state.data : null}
            error={state.kind === "err" ? state.message : null}
            onComplete={() => setTerminalFinished(true)}
          />
        ) : null}

        {terminalFinished && state.kind === "ok" && state.data.warning ? (
          <div className="dash-banner warn glass">{state.data.warning}</div>
        ) : null}

        {terminalFinished && state.kind === "err" && state.warning ? (
          <div className="dash-banner warn glass">{state.warning}</div>
        ) : null}

        {terminalFinished && state.kind === "err" ? (
          <div className="dash-banner err glass">
            <strong>{state.message}</strong>
            {state.detail ? <div style={{ marginTop: "0.4rem" }}>{state.detail}</div> : null}
            {state.asin ? (
              <div className="dash-meta" style={{ marginTop: "0.5rem" }}>
                ASIN <span className="dash-asin-pill">{state.asin}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {terminalFinished && state.kind === "err" && state.product && state.asin ? (
          <ProductPreviewPanel product={state.product} asin={state.asin} />
        ) : null}

        {terminalFinished && state.kind === "ok" ? (
          <>
            <div className="dash-meta">
              <span className="dash-asin-pill">{state.data.asin}</span>
              <span>
                · {state.data.items.length} review{state.data.items.length === 1 ? "" : "s"} analyzed
              </span>
            </div>
            <div className="dash-results-overview">
              <ProductPreviewPanel product={state.data.product} asin={state.data.asin} />
              <SignalSummary items={state.data.items} />
            </div>
            <div className="dash-cards">
              {state.data.items.map((item, i) => (
                <ResultCard key={i} index={i + 1} item={item} />
              ))}
            </div>
          </>
        ) : null}

        {terminalFinished && state.kind === "err" && state.partial && state.partial.length > 0 ? (
          <>
            <SignalSummary items={state.partial} />
            <p className="dash-section-label" style={{ marginTop: "1.5rem" }}>
              Partial results
            </p>
            <div className="dash-cards">
              {state.partial.map((item, i) => (
                <ResultCard key={i} index={i + 1} item={item} />
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function ProductPreviewPanel({
  product,
  asin,
}: {
  product: AmazonProductPreview | undefined;
  asin: string;
}) {
  const link = product?.link?.trim() || `https://www.amazon.com/dp/${encodeURIComponent(asin)}`;
  const title = product?.title?.trim() || `Amazon product · ${asin}`;
  const rating = product?.rating;
  const reviewCount = product?.reviewCount;
  const image = product?.image?.trim();

  return (
    <section className="dash-product-card glass" aria-label="Product preview">
      <div className="dash-product-thumb-wrap">
        {image ? (
          <img className="dash-product-thumb" src={image} alt="" loading="lazy" />
        ) : (
          <div className="dash-product-thumb-fallback" aria-hidden="true">
            <ShoppingCart size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="dash-product-body">
        <h2 className="dash-product-title">{title}</h2>
        {(rating != null || reviewCount != null) && (
          <p className="dash-product-stats">
            {rating != null ? (
              <span>
                <Star size={14} aria-hidden="true" className="dash-product-star" />
                {rating.toFixed(1)} average
              </span>
            ) : null}
            {reviewCount != null ? (
              <span>
                {rating != null ? " · " : ""}
                {reviewCount.toLocaleString()} reviews (listing)
              </span>
            ) : null}
          </p>
        )}
        <a className="dash-product-link" href={link} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} aria-hidden="true" />
          View on Amazon
        </a>
      </div>
    </section>
  );
}

function SignalSummary({ items }: { items: AnalyzeItem[] }) {
  const s = aggregateItsAiPercentages(items);
  if (items.length === 0) return null;

  return (
    <section className="dash-signal-summary glass" aria-label="AI vs human breakdown">
      <div className="dash-section-label">This sample · ItsAI</div>
      <p className="dash-signal-lead">
        {s.definitive > 0 ? (
          <>
            <strong>{s.pctHuman}%</strong> likely human-written · <strong>{s.pctAi}%</strong> likely
            AI-generated
            <span className="dash-signal-sub">
              {" "}
              (among {s.definitive} review{s.definitive === 1 ? "" : "s"} with a clear score)
            </span>
          </>
        ) : (
          <>No definitive AI vs human scores in this sample.</>
        )}
      </p>
      {s.definitive > 0 ? (
        <div className="dash-signal-bar" role="img" aria-label="Human versus AI share">
          {s.pctHuman != null && s.pctHuman > 0 ? (
            <div
              className="dash-signal-seg human"
              style={{ flex: Math.max(s.pctHuman, 0.5) }}
              title={`Human ~${s.pctHuman}%`}
            />
          ) : null}
          {s.pctAi != null && s.pctAi > 0 ? (
            <div
              className="dash-signal-seg ai"
              style={{ flex: Math.max(s.pctAi, 0.5) }}
              title={`AI ~${s.pctAi}%`}
            />
          ) : null}
        </div>
      ) : null}
      {s.inconclusiveCount > 0 ? (
        <p className="dash-signal-inconclusive">
          {s.inconclusiveCount} inconclusive(s) not included in the percentages above.
        </p>
      ) : null}
    </section>
  );
}

function ResultCard({ index, item }: { index: number; item: AnalyzeItem }) {
  const r = formatReviewSummary(item.review);
  const ai = itsAiSummary(item.itsAi);
  const pill =
    ai.answer === 1 ? (
      <span className="dash-pill ai">
        <Bot size={14} aria-hidden="true" />
        Likely AI-generated
      </span>
    ) : ai.answer === 0 ? (
      <span className="dash-pill human">
        <User size={14} aria-hidden="true" />
        Likely human-written
      </span>
    ) : (
      <span className="dash-pill unknown">Inconclusive</span>
    );

  return (
    <article className="dash-result-card glass">
      <div className="dash-result-head">
        <h2>
          <span className="dash-result-index">{index}</span>
          Review
        </h2>
      </div>

      <div className="dash-section-label">From Amazon</div>
      <div className="dash-review-title">{r.title}</div>
      <div className="dash-review-meta">
        <span>
          <User size={13} aria-hidden="true" />
          {r.author}
        </span>
        <span>
          <Calendar size={13} aria-hidden="true" />
          {r.date}
        </span>
        <span>
          <Star size={13} aria-hidden="true" />
          {r.rating}
        </span>
      </div>
      {r.text ? (
        <p className="dash-review-body">{r.text}</p>
      ) : (
        <p className="dash-tx-missing">No review body.</p>
      )}

      <div className="dash-divider" />

      <div className="dash-section-label">ItsAI signal</div>
      <div className="dash-ai-row">
        {pill}
        {ai.status ? <span className="dash-status">status: {ai.status}</span> : null}
      </div>
      <details className="dash-raw">
        <summary>
          <FileJson size={14} style={{ verticalAlign: "-2px", marginRight: "0.35rem" }} />
          Raw JSON response
        </summary>
        <pre>{JSON.stringify(item.itsAi, null, 2)}</pre>
      </details>

      <div className="dash-divider" />

      <div className="dash-tx-label">
        <Shield size={14} aria-hidden="true" />
        Cryptographic proof
      </div>
      {item.txHash ? (
        <a
          className="dash-tx-link"
          href={solanaExplorerTxUrl(item.txHash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Link2 size={16} aria-hidden="true" />
          {item.txHash}
        </a>
      ) : (
        <span className="dash-tx-missing">No settlement signature for this call.</span>
      )}
    </article>
  );
}
