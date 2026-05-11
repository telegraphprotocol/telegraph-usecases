
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
            <ShieldCheck size={28} color="var(--accent-color)" />
            <span>TruthWire</span>
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
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>$</span>
                <span>Pay via X402</span>
              </div>
              <div className="badge">
                <ShieldAlert size={14} color="var(--accent-secondary)" />
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
              Start Verifying <ArrowRight size={20} />
            </Link>
          </section>
        </main>
      </div>
    </>
  );
};

export default LandingPage;
