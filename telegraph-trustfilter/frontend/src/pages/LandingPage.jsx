import { Link } from 'react-router-dom';
import { ShieldAlert, Sparkles } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="dash-page">
      <nav className="dash-nav">
        <div className="dash-brand">
          <ShieldAlert size={18} strokeWidth={2.2} />
          <span>TrustFilter</span>
          <span className="dash-brand-sub">by Telegraph</span>
        </div>
        <a
          href="https://docs.telegraphprotocol.com"
          target="_blank"
          rel="noopener noreferrer"
          className="dash-nav-docs"
        >
          Docs
        </a>
      </nav>

      <main className="dash-landing-main">
        <header className="dash-hero" style={{ width: '100%' }}>
          <div className="dash-badge">
            <ShieldAlert size={14} aria-hidden="true" />
            OpenAI · Telegraph · x402 on Solana
          </div>
          <h1>Spot scams before they spot you.</h1>
          <p className="dash-subtitle">
            Paste a phone number, an SMS message, or both. TrustFilter runs scam-pattern analysis
            via Telegraph's OpenAI miner — every call paid and settled on-chain, with a
            cryptographic transaction hash returned as proof.
          </p>
          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'center' }}>
            <Link to="/dashboard" className="dash-btn-primary" style={{ marginLeft: 0 }}>
              <Sparkles size={16} aria-hidden="true" />
              Check for Scams
            </Link>
          </div>
        </header>
      </main>
    </div>
  );
};

export default LandingPage;
