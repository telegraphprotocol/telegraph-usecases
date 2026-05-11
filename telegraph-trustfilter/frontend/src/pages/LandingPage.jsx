import { Link } from 'react-router-dom';
import { ShieldAlert, Zap, ArrowRight, Brain, Link2 } from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';

const LandingPage = () => {
  return (
    <>
      <GlobalMouseTracker />
      <div className="landing-page">
        <header className="top-nav">
          <div className="logo">
            <ShieldAlert size={28} color="var(--accent-color)" />
            <span>TrustFilter</span>
          </div>
          <Link to="/dashboard" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
            Dashboard
          </Link>
        </header>

        <main className="landing-main container">
          <section className="text-center landing-hero">
            <div className="landing-badges">
              <div className="badge">
                <Zap size={14} color="#f59e0b" />
                <span>Powered by Telegraph</span>
              </div>
              <div className="badge">
                <Brain size={14} color="var(--accent-color)" />
                <span>Groq LLM Analysis</span>
              </div>
              <div className="badge">
                <Link2 size={14} color="#10b981" />
                <span>x402 On-Chain Proof</span>
              </div>
            </div>

            <h1 className="landing-title">
              AI-powered scam detection for <br />
              <span className="gradient-text">phone numbers &amp; SMS</span>
            </h1>

            <p className="landing-subtitle">
              Instantly analyze suspicious phone numbers and SMS messages.
              Submit any combination and get a verdict backed by Groq LLM inference
              via the Telegraph decentralized subnet.
            </p>

            <Link to="/dashboard" className="btn-primary landing-cta">
              Check for Scams <ArrowRight size={20} />
            </Link>
          </section>
        </main>
      </div>
    </>
  );
};

export default LandingPage;
