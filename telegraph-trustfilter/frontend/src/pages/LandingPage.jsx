import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  PhoneOff,
  MessageSquareWarning,
  Gift,
  Landmark,
  Gauge,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  CircleCheck,
  HelpCircle,
} from 'lucide-react';

const LandingPage = () => {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const onMouseMove = (event) => {
      setMouse({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div
      className="rr-page"
      style={{ '--mouse-x': `${mouse.x}%`, '--mouse-y': `${mouse.y}%` }}
    >
      <div
        className="rr-orb rr-orb-one"
        style={{ '--mx': `${(mouse.x - 50) * 1.2}px`, '--my': `${(mouse.y - 50) * 1.1}px` }}
      />
      <div
        className="rr-orb rr-orb-two"
        style={{ '--mx': `${(50 - mouse.x) * 1.4}px`, '--my': `${(50 - mouse.y) * 1.2}px` }}
      />
      <div className="rr-grid-overlay" />

      <nav className="rr-navbar rr-glass">
        <div className="rr-brand">
          <span className="rr-brand-icon" aria-hidden="true">
            <ShieldAlert size={18} />
          </span>
          <span>TrustFilter</span>
        </div>
        <div className="rr-nav-links">
          <a href="#signals">Signals</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#contact">FAQ</a>
        </div>
        <Link to="/dashboard" className="rr-nav-cta">
          Check Now
        </Link>
      </nav>

      <div className="rr-viewport-group" id="top">
        <main className="rr-hero-section">
          <p className="rr-badge rr-glass">AI-powered scam detection, verified on-chain</p>
          <h1>Spot scams before they spot you.</h1>
          <p className="rr-subtitle">
            TrustFilter analyzes phone numbers and SMS messages for scam patterns using OpenAI
            inference on the Telegraph network — every call paid and settled on-chain via x402,
            with a cryptographic transaction hash returned as proof.
          </p>
          <div className="rr-hero-actions">
            <Link to="/dashboard" className="rr-primary">
              <Sparkles size={18} aria-hidden="true" />
              Check a Number or Message
            </Link>
            <a href="#how" className="rr-secondary">
              See How It Works
            </a>
          </div>
        </main>

        <section id="signals" className="rr-section-shell">
          <div className="rr-section-head">
            <h2>Signals we detect</h2>
            <p>TrustFilter looks for the patterns that give scams away.</p>
          </div>
          <div className="rr-signal-grid">
            <article className="rr-glass rr-signal-card">
              <div className="rr-signal-icon">
                <PhoneOff size={18} />
              </div>
              <h3>Spoofed numbers</h3>
            </article>
            <article className="rr-glass rr-signal-card">
              <div className="rr-signal-icon">
                <MessageSquareWarning size={18} />
              </div>
              <h3>Urgency &amp; fear language</h3>
            </article>
            <article className="rr-glass rr-signal-card">
              <div className="rr-signal-icon">
                <Gift size={18} />
              </div>
              <h3>Prize &amp; lottery scams</h3>
            </article>
            <article className="rr-glass rr-signal-card">
              <div className="rr-signal-icon">
                <Landmark size={18} />
              </div>
              <h3>Bank impersonation</h3>
            </article>
          </div>
        </section>

        <section id="features" className="rr-feature-grid">
          <article className="rr-glass rr-card">
            <h3>
              <ShieldAlert size={18} />
              Analyze phone &amp; SMS instantly
            </h3>
            <p>Paste a number, a message, or both — no formatting required.</p>
          </article>
          <article className="rr-glass rr-card">
            <h3>
              <Gauge size={18} />
              Confidence-scored verdict
            </h3>
            <p>Get a scam / suspicious / likely-safe verdict with a confidence score and reasoning.</p>
          </article>
          <article className="rr-glass rr-card">
            <h3>
              <ShieldCheck size={18} />
              Paid, on-chain proof
            </h3>
            <p>Every analysis call is settled via x402 on Solana — a transaction hash proves it ran.</p>
          </article>
        </section>
      </div>

      <div className="rr-viewport-group" id="how">
        <section className="rr-section-shell">
          <div className="rr-section-head">
            <h2>How TrustFilter helps you stay safe</h2>
          </div>
          <div className="rr-steps-grid">
            <article className="rr-glass rr-step-card">
              <span className="rr-step-number">1</span>
              <h3>Paste a number or message</h3>
              <p>Add a phone number, an SMS body, or both.</p>
            </article>
            <article className="rr-glass rr-step-card">
              <span className="rr-step-number">2</span>
              <h3>Get an instant verdict</h3>
              <p>OpenAI inference on Telegraph analyzes the content for scam indicators.</p>
            </article>
            <article className="rr-glass rr-step-card">
              <span className="rr-step-number">3</span>
              <h3>Act with confidence</h3>
              <p>See red flags, reasoning, and a cryptographic payment receipt as proof.</p>
            </article>
          </div>
        </section>

        <section className="rr-section-shell">
          <div className="rr-section-head">
            <h2>What you get</h2>
          </div>
          <div className="rr-benefits-grid">
            <article className="rr-glass rr-benefit-card">
              <ShieldCheck size={18} />
              <p>A trust verdict to help you avoid scam traps.</p>
            </article>
            <article className="rr-glass rr-benefit-card">
              <TriangleAlert size={18} />
              <p>Specific red-flag phrases identified in the message.</p>
            </article>
            <article className="rr-glass rr-benefit-card">
              <CircleCheck size={18} />
              <p>Clear reasoning so you understand why, not just what.</p>
            </article>
          </div>
        </section>
      </div>

      <div className="rr-viewport-group" id="contact">
        <section className="rr-section-shell">
          <div className="rr-section-head">
            <h2>Frequently asked questions</h2>
          </div>
          <div className="rr-faq-list">
            <article className="rr-glass rr-faq-item">
              <h3>
                <HelpCircle size={18} />
                Does TrustFilter only check phone numbers?
              </h3>
              <p>No — you can submit a phone number, an SMS message, or both together.</p>
            </article>
            <article className="rr-glass rr-faq-item">
              <h3>
                <HelpCircle size={18} />
                How is each analysis verified?
              </h3>
              <p>
                Every call is paid on-chain via x402 on Solana. The transaction hash is returned
                as cryptographic proof that a real, paid inference ran.
              </p>
            </article>
            <article className="rr-glass rr-faq-item">
              <h3>
                <HelpCircle size={18} />
                What model powers the analysis?
              </h3>
              <p>OpenAI inference (gpt-4o-search-preview), served through the Telegraph network.</p>
            </article>
          </div>
        </section>

        <section className="rr-section-shell">
          <div className="rr-glass rr-cta-panel">
            <h2>Ready to stop falling for scams?</h2>
            <p>Try TrustFilter and check your next suspicious call or text with confidence.</p>
            <div className="rr-hero-actions">
              <Link to="/dashboard" className="rr-primary">
                Try TrustFilter Free
              </Link>
              <a
                href="https://docs.telegraphprotocol.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rr-secondary"
              >
                View Docs
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
