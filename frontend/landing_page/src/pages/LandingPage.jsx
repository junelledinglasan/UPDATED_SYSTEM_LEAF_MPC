import { useState, useEffect } from "react";
import "./LandingPage.css";

// ─── PWA Install ──────────────────────────────────────────────────────────────
function useInstallPrompt() {
  const [prompt,    setPrompt]    = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const handler = e => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };
  return { canInstall: !!prompt, install, installed };
}

// ─── URLs ng dalawang apps ────────────────────────────────────────────────────
// Palitan ng actual deployed URLs later
const ADMIN_APP_URL  = "http://localhost:5174";
const MEMBER_APP_URL = "http://localhost:5175";

// ─── Mock Announcements ───────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  {
    id: 1, type: "Activity",
    title: "Annual General Assembly 2026",
    body:  "Matagumpay na naidaos ang ating Annual General Assembly ngayong Marso 15, 2026 sa Lucena City Hall. Maraming salamat sa lahat ng dumalo! 🎉",
    author: "Admin", date: "March 15, 2026",
  },
  {
    id: 2, type: "Seminar",
    title: "Financial Literacy Seminar — April 5",
    body:  "Inaanyayahan ang lahat ng miyembro na dumalo sa aming Financial Literacy Seminar sa Abril 5, 2026, 9:00 AM – 12:00 PM. Libre ang pagpasok. 📚",
    author: "Admin", date: "March 18, 2026",
  },
  {
    id: 3, type: "Notice",
    title: "March Collection Schedule",
    body:  "Paalala sa lahat ng miyembro: Ang schedule ng koleksyon para sa buwan ng Marso ay sa mga araw na 3, 7, 10, 14, 17, 20, 24, at 28.",
    author: "Staff", date: "March 1, 2026",
  },
];

const TYPE_STYLE = {
  Activity: { bg: "#e8f5e9", color: "#1b5e20" },
  Seminar:  { bg: "#e3f2fd", color: "#0d47a1" },
  Notice:   { bg: "#fff3e0", color: "#e65100" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { canInstall, install, installed } = useInstallPrompt();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="lnd-root">

      {/* ── Navbar ── */}
      <nav className={`lnd-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="lnd-nav-inner">
          <div className="lnd-nav-brand">
            <span className="lnd-nav-logo">🌿</span>
            <span className="lnd-nav-name">Leaf MPC</span>
          </div>
          <div className={`lnd-nav-links ${menuOpen ? "open" : ""}`}>
            <button className="lnd-nav-link" onClick={() => scrollTo("home")}>Home</button>
            <button className="lnd-nav-link" onClick={() => scrollTo("about")}>About Us</button>
            <button className="lnd-nav-link" onClick={() => scrollTo("services")}>Services</button>
            <button className="lnd-nav-link" onClick={() => scrollTo("announcements")}>Announcements</button>
            <button className="lnd-nav-link" onClick={() => scrollTo("contact")}>Contact</button>
          </div>
          <div className="lnd-nav-actions">
            <a className="lnd-btn-member" href={MEMBER_APP_URL}>Member Login</a>
            <a className="lnd-btn-office" href={ADMIN_APP_URL}>Office Login</a>
          </div>
          <button
            className={`lnd-hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(m => !m)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="home" className="lnd-hero">
        <div className="lnd-hero-bg">
          <div className="lnd-blob lnd-blob-1" />
          <div className="lnd-blob lnd-blob-2" />
        </div>
        <div className="lnd-hero-content">
          <div className="lnd-hero-badge">🌿 Lucena City, Quezon Province</div>
          <h1 className="lnd-hero-title">
            Welcome to<br />
            <span className="lnd-hero-accent">LEAF MPC</span>
          </h1>
          <p className="lnd-hero-sub">
            LEAF Multi-Purpose Cooperative — empowering members through accessible
            financial services, community development, and environmental stewardship.
          </p>
          <div className="lnd-hero-btns">
            <a className="lnd-btn-primary" href={`${MEMBER_APP_URL}/register`}>
              Join as Member
            </a>
            <button className="lnd-btn-ghost" onClick={() => scrollTo("about")}>
              Learn More ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── About Us ── */}
      <section id="about" className="lnd-section lnd-about">
        <div className="lnd-container">
          <div className="lnd-section-label">About Us</div>
          <h2 className="lnd-section-title">Who We Are</h2>
          <p className="lnd-about-intro">
            LEAF Multi-Purpose Cooperative (LEAF MPC) has been serving the community
            of Lucena City and surrounding areas for over a decade. We believe that
            financial empowerment and environmental responsibility go hand in hand.
            Our cooperative is member-owned, community-driven, and committed to
            sustainable growth.
          </p>
          <div className="lnd-vmc-grid">
            <div className="lnd-vmc-card">
              <div className="lnd-vmc-title">VISION</div>
              <div className="lnd-vmc-body">
                A sustainable and trusted cooperative anchored in its concern for the
                environment and community development.
              </div>
            </div>
            <div className="lnd-vmc-card">
              <div className="lnd-vmc-title">MISSION</div>
              <div className="lnd-vmc-body">
                Provide responsive financial and non-financial services to members
                and the community it serve.
              </div>
            </div>
            <div className="lnd-vmc-card">
              <div className="lnd-vmc-title">CORE VALUES</div>
              <div className="lnd-vmc-values">
                <div className="lnd-vmc-value-item"><span className="lnd-vmc-letter">L</span><span>Loyalty and Servant-Leadership</span></div>
                <div className="lnd-vmc-value-item"><span className="lnd-vmc-letter">E</span><span>Environment</span></div>
                <div className="lnd-vmc-value-item"><span className="lnd-vmc-letter">A</span><span>Accountability</span></div>
                <div className="lnd-vmc-value-item"><span className="lnd-vmc-letter">F</span><span>Fairness and Faith</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="lnd-section lnd-services">
        <div className="lnd-container">
          <div className="lnd-section-label lnd-label-white">Services</div>
          <h2 className="lnd-section-title lnd-title-white">What We Offer</h2>
          <div className="lnd-services-layout">
            <div className="lnd-svc-top-grid">
              <div className="lnd-svc-card">
                <div className="lnd-svc-heading">A. PAUTANG</div>
                <div className="lnd-svc-list">
                  <div className="lnd-svc-item">a. Regular Loan</div>
                  <div className="lnd-svc-item">b. Special Loan</div>
                  <div className="lnd-svc-item">c. Pretty Cash Loan</div>
                </div>
              </div>
              <div className="lnd-svc-card">
                <div className="lnd-svc-heading">B. PAG-IIMPOK</div>
                <div className="lnd-svc-list">
                  <div className="lnd-svc-item">a. Savings Deposit</div>
                  <div className="lnd-svc-item">b. Time Deposit</div>
                </div>
              </div>
              <div className="lnd-svc-card">
                <div className="lnd-svc-heading">C. CONSUMER STORE</div>
                <div className="lnd-svc-list">
                  <div className="lnd-svc-item">a. Sari-sari Store</div>
                  <div className="lnd-svc-item">b. Fashion 'Borloloy' accessories</div>
                  <div className="lnd-svc-item">c. Organic Fertilizer (Verni-Compost)</div>
                </div>
              </div>
            </div>
            <div className="lnd-svc-bottom-card">
              <div className="lnd-svc-bottom-item">D. Community Services on Environmental Concerns</div>
              <div className="lnd-svc-bottom-divider" />
              <div className="lnd-svc-bottom-item">E. Livelihood Training on Borloloy</div>
              <div className="lnd-svc-bottom-divider" />
              <div className="lnd-svc-bottom-item">F. Financial Literacy Training</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Announcements ── */}
      <section id="announcements" className="lnd-section lnd-announce">
        <div className="lnd-container">
          <div className="lnd-section-label">Announcements</div>
          <h2 className="lnd-section-title">Latest Updates</h2>
          <p className="lnd-announce-sub">
            Stay updated with the latest news, events, and notices from LEAF MPC.
          </p>
          <div className="lnd-announce-grid">
            {ANNOUNCEMENTS.map(a => {
              const style = TYPE_STYLE[a.type] || { bg: "#f5f5f5", color: "#333" };
              return (
                <div key={a.id} className="lnd-announce-card">
                  <div className="lnd-announce-top">
                    <span className="lnd-announce-type" style={{ background: style.bg, color: style.color }}>
                      {a.type}
                    </span>
                    <span className="lnd-announce-date">{a.date}</span>
                  </div>
                  <div className="lnd-announce-title">{a.title}</div>
                  <div className="lnd-announce-body">{a.body}</div>
                  <div className="lnd-announce-author">— {a.author}</div>
                </div>
              );
            })}
          </div>
          <div className="lnd-announce-note">
            For more announcements,{" "}
            <a className="lnd-inline-link" href={`${MEMBER_APP_URL}/login`}>
              log in to your member account
            </a>.
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="lnd-section lnd-contact">
        <div className="lnd-container">
          <div className="lnd-section-label">Contact</div>
          <h2 className="lnd-section-title">Get in Touch</h2>
          <p className="lnd-contact-sub">Have questions? Visit our office or reach us through the following.</p>
          <div className="lnd-contact-grid">
            <div className="lnd-contact-card">
              <div className="lnd-contact-icon">📍</div>
              <div className="lnd-contact-label">Office Address</div>
              <div className="lnd-contact-val">Lucena City, Quezon Province<br />Philippines</div>
            </div>
            <div className="lnd-contact-card">
              <div className="lnd-contact-icon">📞</div>
              <div className="lnd-contact-label">Contact Number</div>
              <div className="lnd-contact-val">(042) 123-4567<br />0917-123-4567</div>
            </div>
            <div className="lnd-contact-card">
              <div className="lnd-contact-icon">📧</div>
              <div className="lnd-contact-label">Email Address</div>
              <div className="lnd-contact-val">info@leafmpc.coop<br />support@leafmpc.coop</div>
            </div>
            <div className="lnd-contact-card">
              <div className="lnd-contact-icon">🕐</div>
              <div className="lnd-contact-label">Office Hours</div>
              <div className="lnd-contact-val">Mon–Fri: 8:00 AM – 5:00 PM<br />Sat: 8:00 AM – 12:00 PM</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lnd-footer">
        <div className="lnd-container">
          <div className="lnd-footer-inner">
            <div className="lnd-footer-brand">
              <span className="lnd-nav-logo">🌿</span>
              <div>
                <div className="lnd-footer-name">LEAF Multi-Purpose Cooperative</div>
                <div className="lnd-footer-tagline">Lucena City, Quezon Province</div>
              </div>
            </div>
            <div className="lnd-footer-links">
              <button className="lnd-footer-link" onClick={() => scrollTo("home")}>Home</button>
              <button className="lnd-footer-link" onClick={() => scrollTo("about")}>About Us</button>
              <button className="lnd-footer-link" onClick={() => scrollTo("services")}>Services</button>
              <button className="lnd-footer-link" onClick={() => scrollTo("announcements")}>Announcements</button>
              <button className="lnd-footer-link" onClick={() => scrollTo("contact")}>Contact</button>
            </div>
            <div className="lnd-footer-actions">
              <a className="lnd-btn-member" href={MEMBER_APP_URL}>Member Login</a>
              <a className="lnd-btn-office" href={ADMIN_APP_URL}>Office Login</a>
            </div>
          </div>
          <div className="lnd-footer-bottom">
            © {new Date().getFullYear()} LEAF Multi-Purpose Cooperative. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}