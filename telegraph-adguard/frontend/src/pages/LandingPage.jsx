import { Link } from 'react-router-dom';
import { ShieldAlert, Zap, ArrowRight, PauseCircle } from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';

const LandingPage = () => {
  return (
    <>
      <GlobalMouseTracker />
      <div className="landing-page">
        <header className="top-nav">
          <div className="logo">
            <ShieldAlert size={28} color="var(--accent-color)" />
            <span>AdGuard</span>
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
                <PauseCircle size={14} color="var(--accent-secondary)" />
                <span>Google Ads Auto-Pause</span>
              </div>
            </div>

            <h1 className="landing-title">
              Protect Ad Spend from <br />
              <span className="gradient-text">Deepfakes & Fake News</span>
            </h1>

            <p className="landing-subtitle">
              Telegraph's AI subnets scan any article for deepfake images and AI-generated text.
              When a threat is detected, your Google Ads campaigns pause automatically — before brand damage happens.
            </p>

            <Link to="/dashboard" className="btn-primary landing-cta">
              Start Protecting <ArrowRight size={20} />
            </Link>
          </section>
        </main>
      </div>
    </>
  );
};

export default LandingPage;
