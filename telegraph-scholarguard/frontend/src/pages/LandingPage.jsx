import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, FileCheck, Hash, ArrowRight, Lock } from 'lucide-react';
import { GlobalMouseTracker } from '../useMousePosition';
import { useScrollObserver } from '../useScrollObserver';

const LandingPage = () => {
  useScrollObserver();

  return (
    <>
      <GlobalMouseTracker />
      <div className="landing-page">

        {/* Above the fold */}
        <div className="landing-above-fold">
          <header className="top-nav">
            <div className="logo">
              <Shield size={28} color="var(--accent-color)" />
              <span>ScholarGuard</span>
            </div>
            <Link
              to="/dashboard"
              className="btn-primary"
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
            >
              Launch Dashboard
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
                  <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>✦</span>
                  <span>AI Detection via ItsAI</span>
                </div>
                <div className="badge">
                  <Lock size={13} color="var(--accent-green)" />
                  <span>Cryptographic Proof</span>
                </div>
                <div className="badge">
                  <Zap size={13} color="#60a5fa" />
                  <span>Instant Results</span>
                </div>
              </div>

              <h1 className="landing-title">
                Guard Academic<br />
                <span className="gradient-text">Integrity with AI</span>
              </h1>

              <p className="landing-subtitle">
                Upload any assignment and instantly detect AI-generated content with
                cryptographic proof of verification — powered by Telegraph&apos;s decentralized
                subnet network.
              </p>

              <Link to="/dashboard" className="btn-primary landing-cta">
                Analyze Assignment <ArrowRight size={20} />
              </Link>
            </section>
          </main>
        </div>

        {/* Feature Cards */}
        <section className="features-section">
          <div className="container">
            <div className="text-center animate-on-scroll">
              <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: '0.75rem' }}>
                How ScholarGuard Works
              </h2>
              <p style={{ maxWidth: '520px', margin: '0 auto', fontSize: '1rem' }}>
                Three layers of verification — text, images, and on-chain payment proofs —
                deliver a complete academic integrity report in seconds.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card animate-on-scroll delay-100">
                <div className="feature-icon">
                  <Shield size={22} color="var(--accent-color)" />
                </div>
                <h3>AI Content Detection</h3>
                <p>
                  Detects AI-generated text and images using ItsAI and BitMind subnets
                  running on Telegraph&apos;s decentralized network.
                </p>
              </div>

              <div className="feature-card animate-on-scroll delay-200">
                <div className="feature-icon">
                  <FileCheck size={22} color="var(--accent-secondary)" />
                </div>
                <h3>PDF &amp; DOCX Support</h3>
                <p>
                  Upload assignments in any standard format. Both PDF and DOCX files are
                  parsed server-side to extract text and embedded images for analysis.
                </p>
              </div>

              <div className="feature-card animate-on-scroll delay-300">
                <div className="feature-icon">
                  <Hash size={22} color="var(--accent-green)" />
                </div>
                <h3>Cryptographic Proof</h3>
                <p>
                  Every analysis is verifiably paid via Solana x402 with on-chain transaction
                  hashes — providing tamper-proof evidence of verification.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default LandingPage;
