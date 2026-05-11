import { useEffect, useState, type CSSProperties } from 'react'
import {
  Radar,
  ShoppingCart,
  Gauge,
  SearchCheck,
  Store,
  Smartphone,
  PlayCircle,
  ShieldCheck,
  TriangleAlert,
  CircleCheck,
  HelpCircle,
} from 'lucide-react'
import './App.css'

function App() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 100
      const y = (event.clientY / window.innerHeight) * 100
      setMouse({ x, y })
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  return (
    <div
      className="page"
      style={
        {
          '--mouse-x': `${mouse.x}%`,
          '--mouse-y': `${mouse.y}%`,
        } as CSSProperties
      }
    >
      <div
        className="bg-orb orb-one"
        style={
          ({
            '--mx': `${(mouse.x - 50) * 1.2}px`,
            '--my': `${(mouse.y - 50) * 1.1}px`,
          } as CSSProperties)
        }
      />
      <div
        className="bg-orb orb-two"
        style={
          ({
            '--mx': `${(50 - mouse.x) * 1.4}px`,
            '--my': `${(50 - mouse.y) * 1.2}px`,
          } as CSSProperties)
        }
      />
      <div className="grid-overlay" />

      <nav className="navbar glass">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            <Radar size={18} />
          </span>
          <span>ReviewRadar</span>
        </div>
        <div className="nav-links">
          <a href="#platforms">Platforms</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#contact">Contact</a>
        </div>
        <button className="nav-cta">Request Demo</button>
      </nav>

      <div className="viewport-group" id="top">
        <main className="hero-section">
          <p className="badge glass">AI-powered shopping trust assistant</p>
          <h1>Spot products with fake reviews before you buy.</h1>
          <p className="subtitle">
            ReviewRadar analyzes review patterns from Amazon, eBay, Google Play and
            the App Store to help you quickly tell real feedback from fake hype.
          </p>
          <div className="hero-actions">
            <button className="primary">Check a Product Now</button>
            <button className="secondary">See How It Works</button>
          </div>
        </main>

        <section id="platforms" className="section-shell">
          <div className="section-head">
            <h2>Platforms we support</h2>
            <p>Check listings and apps across popular stores before making a purchase.</p>
          </div>
          <div className="platform-grid">
            <article className="glass platform-card">
              <div className="platform-icon">
                <ShoppingCart size={18} />
              </div>
              <h3>Amazon</h3>
            </article>
            <article className="glass platform-card">
              <div className="platform-icon">
                <Store size={18} />
              </div>
              <h3>eBay</h3>
            </article>
            <article className="glass platform-card">
              <div className="platform-icon">
                <PlayCircle size={18} />
              </div>
              <h3>Google Play</h3>
            </article>
            <article className="glass platform-card">
              <div className="platform-icon">
                <Smartphone size={18} />
              </div>
              <h3>App Store</h3>
            </article>
          </div>
        </section>

        <section id="features" className="feature-grid">
          <article className="glass card">
            <h3>
              <ShoppingCart size={18} />
              Scan top shopping platforms
            </h3>
            <p>Review products and apps from major marketplaces in one place.</p>
          </article>
          <article className="glass card">
            <h3>
              <Gauge size={18} />
              Instant fake-review signal
            </h3>
            <p>Get a quick trust score before spending money on a product.</p>
          </article>
          <article className="glass card">
            <h3>
              <SearchCheck size={18} />
              Shop with confidence
            </h3>
            <p>Understand why a listing looks suspicious and choose better options.</p>
          </article>
        </section>
      </div>

      <div className="viewport-group" id="how">
        <section className="section-shell">
          <div className="section-head">
            <h2>How ReviewRadar helps you shop better</h2>
          </div>
          <div className="steps-grid">
            <article className="glass step-card">
              <span className="step-number">1</span>
              <h3>Paste a product or app link</h3>
              <p>Add the listing URL and let ReviewRadar fetch a review sample.</p>
            </article>
            <article className="glass step-card">
              <span className="step-number">2</span>
              <h3>Get instant trust insights</h3>
              <p>We analyze review language and behavior patterns for suspicious signals.</p>
            </article>
            <article className="glass step-card">
              <span className="step-number">3</span>
              <h3>Buy smarter with confidence</h3>
              <p>Compare products and avoid listings that look manipulated or risky.</p>
            </article>
          </div>
        </section>

        <section className="section-shell">
          <div className="section-head">
            <h2>What you get</h2>
          </div>
          <div className="benefits-grid">
            <article className="glass benefit-card">
              <ShieldCheck size={18} />
              <p>Trust score to help avoid fake-review traps.</p>
            </article>
            <article className="glass benefit-card">
              <TriangleAlert size={18} />
              <p>Suspicious pattern alerts before you spend.</p>
            </article>
            <article className="glass benefit-card">
              <CircleCheck size={18} />
              <p>Clear signals so you can compare products faster.</p>
            </article>
          </div>
        </section>
      </div>

      <div className="viewport-group" id="contact">
        <section className="section-shell">
          <div className="section-head">
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            <article className="glass faq-item">
              <h3>
                <HelpCircle size={18} />
                Is ReviewRadar only for products?
              </h3>
              <p>
                No. You can also check app listings from Google Play and the App Store.
              </p>
            </article>
            <article className="glass faq-item">
              <h3>
                <HelpCircle size={18} />
                Does it read every review?
              </h3>
              <p>
                It analyzes a smart sample to produce a fast and useful authenticity signal.
              </p>
            </article>
            <article className="glass faq-item">
              <h3>
                <HelpCircle size={18} />
                Can I compare two listings?
              </h3>
              <p>
                Yes. Run both links and compare trust indicators before buying.
              </p>
            </article>
          </div>
        </section>

        <section className="section-shell">
          <div className="glass cta-panel">
            <h2>Ready to stop buying from fake-review products?</h2>
            <p>Try ReviewRadar and make your next purchase with more confidence.</p>
            <div className="hero-actions">
              <button className="primary">Try ReviewRadar Free</button>
              <button className="secondary">Join Waitlist</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
