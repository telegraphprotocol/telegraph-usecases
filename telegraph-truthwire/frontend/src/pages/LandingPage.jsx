import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';

const LandingPage = () => {
  return (
    <>
      <GlobalMouseTracker />
      <div className="landing-page">
        <header className="top-nav">
          <div className="logo">
            <ShieldCheck size={18} />
            <span>TruthWire</span>
            <span style={{ opacity: 0.35, fontSize: '0.6rem', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>
              by Telegraph
            </span>
          </div>
          <Link to="/dashboard" className="btn-primary" style={{ padding: '0.4rem 1rem' }}>
            Dashboard
          </Link>
        </header>

        <main className="landing-main container">
          <section className="text-center landing-hero">
            <div className="landing-badges">
              <div className="badge">
                <Zap size={11} />
                <span>Powered by Telegraph</span>
              </div>
              <div className="badge">
                <span style={{ fontWeight: 700 }}>$</span>
                <span>Pay via X402</span>
              </div>
              <div className="badge">
                <ShieldAlert size={11} />
                <span>Fast risk signals</span>
              </div>
            </div>

            <h1 className="landing-title">
              Truth in the age of <br />
              <span className="gradient-text">Generative AI</span>
            </h1>

            <p className="landing-subtitle">
              Instantly verify if an X (Twitter) post contains real content or AI-generated media.
              Paste a link, run the AI analysis, and get to the truth.
            </p>

            <Link to="/dashboard" className="btn-primary landing-cta">
              Start Verifying <ArrowRight size={16} />
            </Link>
          </section>
        </main>
      </div>
    </>
  );
};

export default LandingPage;
