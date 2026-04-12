import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────
   TESLA DESIGN SYSTEM
   - Background: #fff (white) / #f4f4f4 (light grey)
   - Text: #171a20 (near-black) / #393c41 (secondary)
   - Accent: #e31937 (Tesla red — we keep Inora's brand: #171a20 base + red accents)
   - Font: 'Gotham SSm' via system stack — we use 'DM Sans' as closest match
   - Full-viewport image sections, centered text, minimal chrome
   - Hairline borders, generous white space, zero decorative flourishes
───────────────────────────────────────────────────────────── */

const TESLA_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap');

  .t-root {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #fff;
    color: #171a20;
    overflow-x: hidden;
  }

  /* Full-bleed Tesla section */
  .t-panel {
    position: relative;
    width: 100%;
    height: 100vh;
    min-height: 560px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }

/* ================= NAVBAR ================= */

.t-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2.5rem;
  z-index: 1000;
  transition: background .3s ease, backdrop-filter .3s ease;
}

.t-navbar--transparent {
  background: transparent;
  color: #171a20;
}

.t-navbar--solid {
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e0e0e0;
}

.t-navbar__logo {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: .35em;
}

.t-navbar__links {
  display: flex;
  gap: 2rem;
  font-size: .85rem;
  font-weight: 500;
}

.t-navbar__links span {
  cursor: pointer;
  transition: opacity .2s ease;
}

.t-navbar__links span:hover {
  opacity: .6;
}

.t-navbar__icons {
  display: flex;
  gap: 1rem;
  font-size: 1rem;
}

@media (max-width: 900px) {
  .t-navbar__links {
    display: none;
  }
}

  .t-panel__bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  /* Tesla text zones — top-center and bottom-center */
  .t-panel__top {
    position: relative;
    z-index: 10;
    text-align: center;
    padding: 6rem 2rem 0;
  }

  .t-panel__bottom {
    position: relative;
    z-index: 10;
    text-align: center;
    padding: 0 2rem 4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  /* Tesla headline style */
  .t-h1 {
    font-size: clamp(2rem, 5vw, 3.6rem);
    font-weight: 500;
    letter-spacing: -0.02em;
    color: #171a20;
    line-height: 1.15;
    margin: 0;
  }

  .t-h1--white { color: #fff; }

  .t-h2 {
    font-size: clamp(1.5rem, 3.5vw, 2.8rem);
    font-weight: 500;
    letter-spacing: -0.02em;
    color: #171a20;
    line-height: 1.2;
    margin: 0;
  }

  .t-h2--white { color: #fff; }

  .t-sub {
    font-size: clamp(.85rem, 1.5vw, 1.1rem);
    font-weight: 400;
    color: #393c41;
    line-height: 1.6;
    max-width: 480px;
    margin: 0 auto;
  }

  .t-sub--white {
    color: rgba(255,255,255,.85);
  }

  /* Tesla buttons */
  .t-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    padding: 0 2rem;
    border-radius: 4px;
    font-family: inherit;
    font-size: .875rem;
    font-weight: 500;
    letter-spacing: .05em;
    cursor: pointer;
    border: none;
    text-transform: none;
    transition: opacity .2s;
    text-decoration: none;
  }
  .t-btn:hover { opacity: .85; }

  .t-btn--dark {
    background: rgba(23,26,32,.8);
    color: #fff;
    backdrop-filter: blur(20px);
  }

  .t-btn--light {
    background: rgba(255,255,255,.65);
    color: #171a20;
    backdrop-filter: blur(20px);
  }

  .t-btn--outline-dark {
    background: transparent;
    border: 1px solid #171a20;
    color: #171a20;
  }

  .t-btn--outline-light {
    background: transparent;
    border: 1px solid rgba(255,255,255,.6);
    color: #fff;
  }

  .t-btn--red {
    background: #e31937;
    color: #fff;
  }

  /* Tesla label (small caps eyebrow) */
  .t-label {
    font-size: .75rem;
    font-weight: 500;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #5c5e62;
    display: block;
    margin-bottom: .5rem;
  }

  .t-label--white { color: rgba(255,255,255,.65); }

  /* White content section */
  .t-white-section {
    background: #fff;
    padding: 6rem 2rem;
  }

  /* Light grey section */
  .t-grey-section {
    background: #f4f4f4;
    padding: 6rem 2rem;
  }

  /* Inner max-width container */
  .t-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Tesla hairline divider */
  .t-divider {
    width: 100%;
    height: 1px;
    background: #e0e0e0;
  }

  /* Scroll reveal */
  .t-reveal {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity .8s cubic-bezier(.25,.46,.45,.94),
                transform .8s cubic-bezier(.25,.46,.45,.94);
  }
  .t-reveal.in { opacity: 1; transform: none; }

  .t-reveal-delay-1 { transition-delay: .1s; }
  .t-reveal-delay-2 { transition-delay: .2s; }
  .t-reveal-delay-3 { transition-delay: .3s; }
  .t-reveal-delay-4 { transition-delay: .4s; }

  .t-patient-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 16px;
    background: #f4f4f4;
}

  @media (max-width: 768px) {
    .t-patient-grid { grid-template-columns: 1fr; }
    .t-split { flex-direction: column !important; }
    .t-panel { height: auto; min-height: 100vh; }
  }

  /* Patient card */
  .t-patient-card {
    position: relative;
    height: 520px;
    overflow: hidden;
    cursor: default;
  }

  .t-patient-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .8s cubic-bezier(.25,.46,.45,.94);
  }
  .t-patient-card:hover img { transform: scale(1.04); }

  .t-patient-card__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 50%, transparent 100%);
  }

  .t-patient-card__text {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 2.5rem 2rem;
    color: #fff;
  }

  /* Approach card */
  .t-approach-card {
    border-top: 1px solid #e0e0e0;
    padding: 2.5rem 0;
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 3rem;
    align-items: start;
  }

  @media (max-width: 640px) {
    .t-approach-card { grid-template-columns: 1fr; gap: 1rem; }
    .t-patient-card  { height: 360px; }
  }

  /* Stat row */
  .t-stat-row {
    display: flex;
    gap: 0;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
  }

  .t-stat-item {
    flex: 1;
    padding: 2.5rem 2rem;
    border-right: 1px solid #e0e0e0;
    text-align: center;
  }
  .t-stat-item:last-child { border-right: none; }

  .t-stat-num {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 300;
    letter-spacing: -.03em;
    color: #171a20;
    line-height: 1;
    display: block;
  }
  .t-stat-label {
    font-size: .78rem;
    color: #5c5e62;
    margin-top: .5rem;
    line-height: 1.5;
    max-width: 160px;
    margin-left: auto;
    margin-right: auto;
  }

  /* Pillar grid */
  .t-pillar-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }

  @media (max-width: 900px) {
    .t-pillar-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 560px) {
    .t-pillar-grid { grid-template-columns: 1fr; }
  }

  .t-pillar {
    padding: 2.5rem 2rem;
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
  }
  .t-pillar:nth-child(4n) { border-right: none; }

  /* Contact form fields */
  .t-input {
    width: 100%;
    height: 52px;
    border: none;
    border-bottom: 1px solid #d0d0d0;
    border-radius: 0;
    background: transparent;
    font-family: inherit;
    font-size: .95rem;
    color: #171a20;
    outline: none;
    padding: 0 0 0 0;
    transition: border-color .2s;
  }
  .t-input:focus { border-bottom-color: #171a20; }
  .t-input::placeholder { color: #aaa; }

  .t-textarea {
    width: 100%;
    border: none;
    border-bottom: 1px solid #d0d0d0;
    border-radius: 0;
    background: transparent;
    font-family: inherit;
    font-size: .95rem;
    color: #171a20;
    outline: none;
    padding: .8rem 0 0;
    resize: none;
    transition: border-color .2s;
    min-height: 100px;
  }
  .t-textarea:focus { border-bottom-color: #171a20; }
  .t-textarea::placeholder { color: #aaa; }

  /* Quote section */
  .t-quote-panel {
    background: #171a20;
    padding: 8rem 2rem;
    text-align: center;
  }

  /* Footer strip */
  .t-footer {
    background: #171a20;
    padding: 2.5rem 2rem;
    text-align: center;
    border-top: 1px solid #2a2a2a;
  }
`;

/* ─────────────────────────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const run = () => {
      document.querySelectorAll(".t-reveal").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) el.classList.add("in");
      });
    };
    run();
    window.addEventListener("scroll", run, { passive: true });
    return () => window.removeEventListener("scroll", run);
  }, []);
}

/* ─────────────────────────────────────────────────────────────
   SECTION 1 — MISSION HERO  (full-bleed, Tesla style)
───────────────────────────────────────────────────────────── */

function Navbar() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`t-navbar ${solid ? "t-navbar--solid" : "t-navbar--transparent"}`}>
      <div className="t-navbar__logo">INORA</div>

      <div className="t-navbar__links">
        <span onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Mission</span>
        <span onClick={() => document.getElementById("mission-body")?.scrollIntoView({ behavior: "smooth" })}>Impact</span>
        <span onClick={() => document.getElementById("inora-vision")?.scrollIntoView({ behavior: "smooth" })}>Technology</span>
        <span onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>Contact</span>
      </div>

      <div className="t-navbar__icons">
        <span>🌐</span>
        <span>👤</span>
      </div>
    </nav>
  );
}

function MissionPanel() {
  return (
    <div className="t-panel" style={{ height: "100vh" }}>
      
      <img
        className="t-panel__bg"
        src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1800&q=85"
        alt="Neuroscience"
      />
      {/* Subtle gradient — light at top for dark text, darker at bottom */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,.55) 0%, rgba(0,0,0,.0) 40%, rgba(0,0,0,.55) 100%)" }} />

      {/* Top text — dark on white */}
      <div className="t-panel__top">
        <span className="t-label">Inora · Brain-Computer Interface</span>
        <h1 className="t-h1" style={{ maxWidth: 640, margin: "0 auto" }}>
          Every mind deserves<br />a way to be heard.
        </h1>
      </div>

      {/* Bottom CTAs */}
      <div className="t-panel__bottom">
        <p style={{ fontSize: ".85rem", color: "rgba(255,255,255,.75)", fontWeight: 400, letterSpacing: ".05em", textTransform: "uppercase" }}>
          Our Mission
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="#mission-body" className="t-btn t-btn--light">Learn More</a>
          <a href="#contact" className="t-btn t-btn--outline-light">Contact Us</a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MISSION BODY TEXT
───────────────────────────────────────────────────────────── */
function MissionBody() {
  return (
    <div className="t-white-section" id="mission-body">
      <div className="t-container" style={{ maxWidth: 760, textAlign: "center" }}>
        <span className="t-label t-reveal">Why Inora Exists</span>
        <h2 className="t-h2 t-reveal t-reveal-delay-1" style={{ marginBottom: "2rem" }}>
          Five million people in India alone wake up every day unable to move, speak, or signal their most basic needs.
        </h2>
        <p className="t-sub t-reveal t-reveal-delay-2" style={{ maxWidth: 600 }}>
          Amyotrophic Lateral Sclerosis. Spinal cord injury. Locked-in syndrome. Stroke. These are not rare edge cases — they are mothers, fathers, children, teachers. People with plans, with love to give, with things left to say.
        </p>
        <p className="t-sub t-reveal t-reveal-delay-3" style={{ marginTop: "1.5rem", maxWidth: 600 }}>
          Inora was built from grief, from frustration, and from a stubborn refusal to accept that silence is the only answer. We built a brain-computer interface — a direct channel from thought to action — because the people who need it cannot wait for the future.
        </p>
      </div>

      {/* Stat row */}
      <div className="t-container t-reveal" style={{ marginTop: "4rem" }}>
        <div className="t-stat-row">
          {[
            { num: "1.8M",  label: "People living with paralysis in India" },
            { num: "100K",  label: "ALS patients globally at any time"     },
            { num: "15M",   label: "Strokes per year worldwide"            },
            { num: "52.3%",   label: "Of patients lack any assistive tech"   },
          ].map(s => (
            <div className="t-stat-item" key={s.num}>
              <span className="t-stat-num">{s.num}</span>
              <p className="t-stat-label">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 2 — PATIENTS  (Tesla panel-per-patient grid)
───────────────────────────────────────────────────────────── */
const PATIENTS = [
  {
    img:  "https://irmsc.com/wp-content/uploads/2024/02/als-patient-support-service-irm-hospital.webp",
    name: "ALS",
    sub:  "Amyotrophic Lateral Sclerosis",
    desc: "The mind stays razor-sharp while every voluntary muscle slowly falls silent. ALS patients are among the most cognitively present, most isolated people on earth.",
    stat: "~450,000 globally",
  },
  {
    img:  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT49ZcNGBI7N1JX790rQ-p5QtifNntnGpbtZA&s",
    name: "Spinal Cord Injury",
    sub:  "Traumatic & Non-Traumatic",
    desc: "A single moment changes everything. Young, active, full of life — then a fall, an accident, and the signals stop reaching the body. The person is still entirely there.",
    stat: "~27 million worldwide",
  },
  {
    img:  "https://www.homage.sg/wp-content/uploads/2021/09/bigstock-The-Patient-Is-Cerebrovascular-316698358.jpg",
    name: "Stroke",
    sub:  "Survivors & Rehabilitation",
    desc: "Stroke survivors often know exactly what they want to say. The thought is formed. The intention is clear. The signal never arrives. We intercept it before it gets lost.",
    stat: "15 million new cases yearly",
  },
  {
    img:  "https://post.medicalnewstoday.com/wp-content/uploads/sites/3/2023/08/synthesized-speech-avatar-1296x728-header-1024x575.jpg",
    name: "Locked-In Syndrome",
    sub:  "Complete Motor Paralysis",
    desc: "Completely conscious. Fully aware. Able to feel and think and dream — but unable to move anything except, sometimes, their eyes. These patients are the reason Inora exists.",
    stat: "~1 in 100,000 — often undiagnosed",
  },
  
];

function PatientsSection() {
  return (
    <div>
      {/* Header */}
      <div className="t-white-section" style={{ paddingBottom: "3rem" }}>
        <div className="t-container" style={{ textAlign: "center" }}>
          <span className="t-label t-reveal">Who We Serve</span>
          <h2 className="t-h2 t-reveal t-reveal-delay-1">
            Every patient has a story.<br />We're here to help them tell it.
          </h2>
        </div>
      </div>

      {/* Tesla-style full-bleed image grid */}
<div className="t-patient-grid" style={{ gap: '16px', padding: '16px', background: '#f4f4f4' }}>        {PATIENTS.map((p) => (
          <div className="t-patient-card t-reveal" key={p.name}>
            <img src={p.img} alt={p.name} />
            <div className="t-patient-card__overlay" />
            <div className="t-patient-card__text">
              <span style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", display: "block", marginBottom: ".4rem" }}>{p.sub}</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: ".6rem", letterSpacing: "-.01em" }}>{p.name}</h3>
              <p style={{ fontSize: ".875rem", color: "rgba(255,255,255,.8)", lineHeight: 1.65, marginBottom: ".8rem" }}>{p.desc}</p>
              <span style={{ fontSize: ".72rem", letterSpacing: ".08em", color: "rgba(255,255,255,.5)" }}>{p.stat}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 3 — TRADITIONAL APPROACHES
───────────────────────────────────────────────────────────── */
const APPROACHES = [
  {
    num:   "01",
    name:  "EEG Headsets",
    img:   "https://brainlatam.com/uploads/produto/eeg-20-channels-eeg-headset-with-dry-electrodes-887.webp",
    desc:  "Scalp electrodes capture diffuse electrical activity — like trying to read a newspaper through frosted glass. Signals are blurry, motion-sensitive, and unable to distinguish individual intentions with useful precision.",
    limit: "Low resolution · Noise-prone · Cannot scale to complex commands",
  },
  {
    num:   "02",
    name:  "Eye-Tracking Systems",
    img:   "https://assets.rbl.ms/25572391/origin.jpg",
    desc:  "Effective in early-to-mid stage conditions. When eye muscles also fail — as they do in late-stage ALS and locked-in syndrome — the last channel closes. The patient has nowhere left to go.",
    limit: "Fails at late stage · Slow · Requires preserved ocular movement",
  },
  
];

function TraditionalSection() {
  return (
    <div className="t-white-section">
      <div className="t-container">
        <span className="t-label t-reveal">What Came Before</span>
        <h2 className="t-h2 t-reveal t-reveal-delay-1" style={{ maxWidth: 560, marginBottom: "1rem" }}>
          The tools we had were never enough.
        </h2>
        <p className="t-sub t-reveal t-reveal-delay-2" style={{ textAlign: "left", maxWidth: 560, marginBottom: "3.5rem" }}>
          For decades, assistive technology worked around the brain — never directly with it. Each approach helped some people, but left the most severely affected still trapped.
        </p>

        {APPROACHES.map((a, i) => (
          <div className="t-approach-card t-reveal" key={a.name} style={{ transitionDelay: `${i * 0.08}s` }}>
            {/* Left — image + number */}
            <div style={{ position: "relative" }}>
              <div style={{ height: 220, borderRadius: 4, overflow: "hidden", marginBottom: "1rem" }}>
                <img
                  src={a.img}
                  alt={a.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .6s cubic-bezier(.25,.46,.45,.94)" }}
                  onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.target.style.transform = "scale(1)"}
                />
              </div>
              <span style={{ fontSize: "3.5rem", fontWeight: 300, color: "#d0d0d0", lineHeight: 1 }}>{a.num}</span>
            </div>

            {/* Right — text */}
            <div style={{ paddingTop: ".5rem" }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 500, letterSpacing: "-.01em", marginBottom: "1rem", color: "#171a20" }}>{a.name}</h3>
              <p style={{ fontSize: ".95rem", color: "#393c41", lineHeight: 1.75, marginBottom: "1.2rem" }}>{a.desc}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", fontSize: ".78rem", color: "#c00", letterSpacing: ".04em" }}>
                <span style={{ fontSize: "1rem" }}>✗</span>
                {a.limit}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 4 — WHY CHANGE  (Tesla two full-bleed panels)
───────────────────────────────────────────────────────────── */
function WhyChangeSection() {
  return (
    <div>
      {/* Panel 1 */}
      <div className="t-panel">
        <img
          className="t-panel__bg"
          src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1800&q=85"
          alt="Research lab"
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,.6) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,.6) 100%)" }} />

        <div className="t-panel__top">
          <span className="t-label" style={{ color: "#393c41" }}>The Turning Point</span>
          <h2 className="t-h2" style={{ maxWidth: 520, margin: "0 auto", color: "#171a20" }}>
            Working around the brain was never going to be enough.
          </h2>
        </div>

        <div className="t-panel__bottom">
          <p style={{ fontSize: ".875rem", color: "rgba(255,255,255,.8)", maxWidth: 420, lineHeight: 1.65, textAlign: "center" }}>
            Every non-invasive approach shared the same fundamental flaw — it listened to the body instead of the brain. When the body stopped responding, the approach stopped working.
          </p>
          <a href="#inora-vision" className="t-btn t-btn--light">Our Approach</a>
        </div>
      </div>

      {/* Panel 2 */}
      <div className="t-panel">
        <img
          className="t-panel__bg"
          src="https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1800&q=85"
          alt="Neural signals"
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.65) 100%)" }} />

        <div className="t-panel__top">
          <span className="t-label t-label--white">The Science</span>
          <h2 className="t-h2 t-h2--white" style={{ maxWidth: 560, margin: "0 auto" }}>
Scientists can now decode the firing patterns of motor cortex neurons to predict intended movements — even before the body moves.          </h2>
        </div>

        <div className="t-panel__bottom">
          <p style={{ fontSize: ".875rem", color: "rgba(255,255,255,.75)", maxWidth: 460, lineHeight: 1.65, textAlign: "center" }}>
            Advances in electrode arrays, signal processing, and machine learning have created a precise window of possibility. Inora exists to step through it — and to bring our patients with us.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 5 — INORA VISION  (Tesla white section + pillars)
───────────────────────────────────────────────────────────── */
const PILLARS = [
  { icon: "◎", title: "Non-Invasive First",    desc: "Communication should never require surgery. Inora's primary interface reads neural signals through advanced surface electrodes — no implants, no incisions." },
  { icon: "◈", title: "Real-Time Decoding",    desc: "Our three-channel architecture captures, combines, and decodes neural intent in real time — thought becomes action in under 200ms." },
  { icon: "◇", title: "Accessible to All",     desc: "A technology that only reaches the wealthy isn't solving the problem — it's decorating it. Inora is built with affordability as a first-class design constraint." },
  { icon: "◉", title: "Human-Centred",         desc: "Every design decision is made with a patient in the room — not as a focus group, but as a co-designer with equal authority over the outcome." },
];

function InoraVisionSection() {
  return (
    <div id="inora-vision">
      {/* Split panel — image left, text right */}
      <div style={{ display: "flex", minHeight: "90vh" }} className="t-split">
        {/* Image */}
        <div style={{ flex: 1, position: "relative", minHeight: 500, overflow: "hidden" }}>
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1000&q=85"
            alt="Inora"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        {/* Text */}
        <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", padding: "6rem 5rem" }}>
          <div style={{ maxWidth: 480 }}>
            <span className="t-label t-reveal">Who We Are</span>
            <h2 className="t-h2 t-reveal t-reveal-delay-1" style={{ marginBottom: "1.5rem" }}>
              Inora is not a product.<br />It's a promise.
            </h2>
            <p className="t-reveal t-reveal-delay-2" style={{ fontSize: ".975rem", color: "#393c41", lineHeight: 1.8, marginBottom: "1.2rem" }}>
              We are neuroscientists, engineers, and designers who have watched someone they love lose the ability to communicate. That loss became our mission. Inora (from the Latin <em>inorare</em> — "to entreat, to speak") is named for the act of reaching out against all odds.
            </p>
            <p className="t-reveal t-reveal-delay-3" style={{ fontSize: ".975rem", color: "#393c41", lineHeight: 1.8, marginBottom: "2rem" }}>
              Our three-channel BCI system acquires neural signals, combines them into a composite waveform, and decodes intent — turning the brain's intention directly into action, bypassing the body entirely.
            </p>
            <a href="#contact" className="t-btn t-btn--dark t-reveal t-reveal-delay-4" style={{ display: "inline-flex" }}>
              Work With Us
            </a>
          </div>
        </div>
      </div>

      {/* Pillars */}
      <div className="t-grey-section">
        <div className="t-container">
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span className="t-label t-reveal">Core Principles</span>
            <h2 className="t-h2 t-reveal t-reveal-delay-1">The values behind every decision</h2>
          </div>
          <div className="t-pillar-grid">
            {PILLARS.map((p, i) => (
              <div className={`t-pillar t-reveal`} key={p.title} style={{ transitionDelay: `${i * 0.1}s` }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "1rem", color: "#171a20" }}>{p.icon}</div>
                <h4 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "-.01em", marginBottom: ".7rem", color: "#171a20" }}>{p.title}</h4>
                <p style={{ fontSize: ".875rem", color: "#5c5e62", lineHeight: 1.7 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-bleed team image */}
      <div className="t-panel" style={{ height: "70vh" }}>
        <img
          className="t-panel__bg"
          src="https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=1800&q=85"
          alt="Team"
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,.5) 0%, rgba(0,0,0,.0) 40%, rgba(0,0,0,.5) 100%)" }} />
        <div className="t-panel__top">
          <span className="t-label" style={{ color: "#393c41" }}>Inora · Est. 2024</span>
          <h2 className="t-h2" style={{ color: "#171a20", maxWidth: 500, margin: "0 auto" }}>
            Built in India.<br />Built for the world.
          </h2>
        </div>
        <div className="t-panel__bottom">
          <p style={{ fontSize: ".85rem", color: "rgba(255,255,255,.8)", letterSpacing: ".04em" }}>New Delhi · Research & Development</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 6 — QUOTE + CONTACT
───────────────────────────────────────────────────────────── */
function ContactSection() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (form.name && form.email && form.message) setSent(true);
  };

  return (
    <div id="contact">
      {/* Quote panel — Tesla dark */}
      <div className="t-quote-panel">
        <div className="t-container" style={{ textAlign: "center" }}>
          <div className="t-reveal">
            <p style={{ fontSize: "clamp(1.6rem, 4vw, 3.2rem)", fontWeight: 300, letterSpacing: "-.02em", color: "#fff", lineHeight: 1.3, maxWidth: 700, margin: "0 auto 1.5rem" }}>
              "The brain never gives up.<br />Neither do we."
            </p>
            <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.4)", letterSpacing: ".15em", textTransform: "uppercase" }}>
              — Inora Founding Principle
            </p>
          </div>
        </div>
      </div>

      {/* Contact — white */}
      <div className="t-white-section">
        <div className="t-container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "start" }}>

            {/* Left */}
            <div>
              <span className="t-label t-reveal">Contact</span>
              <h2 className="t-h2 t-reveal t-reveal-delay-1" style={{ marginBottom: "1.5rem" }}>
                We'd love to<br />hear from you.
              </h2>
              <p className="t-reveal t-reveal-delay-2" style={{ fontSize: ".975rem", color: "#393c41", lineHeight: 1.8, marginBottom: "3rem" }}>
                Whether you are a patient, caregiver, clinician, researcher, or investor — reach out. Every message is read by a person who genuinely cares about why you are writing.
              </p>

              <div className="t-reveal t-reveal-delay-3">
                {[
                  { label: "General",    val: "hello@inora.ai"      },
                  { label: "Clinical",   val: "clinical@inora.ai"   },
                  { label: "Research",   val: "research@inora.ai"   },
                  { label: "Location",   val: "New Delhi, India"     },
                ].map(c => (
                  <div key={c.label} style={{ borderBottom: "1px solid #e0e0e0", padding: ".9rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: ".78rem", color: "#5c5e62", letterSpacing: ".06em", textTransform: "uppercase" }}>{c.label}</span>
                    <span style={{ fontSize: ".9rem", color: "#171a20", fontWeight: 500 }}>{c.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — form */}
            <div className="t-reveal t-reveal-delay-2">
              {sent ? (
                <div style={{ padding: "4rem 0", textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✓</div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 500, marginBottom: ".8rem", color: "#171a20" }}>Message Received</h3>
                  <p style={{ color: "#5c5e62", lineHeight: 1.7, fontSize: ".9rem" }}>Thank you. A member of our team will respond within 48 hours. What you're doing matters — to us, and to our patients.</p>
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {[
                    { k: "name",  label: "Full Name",      type: "text",  ph: "Jane Doe"         },
                    { k: "email", label: "Email Address",  type: "email", ph: "jane@example.com" },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={{ display: "block", fontSize: ".72rem", color: "#5c5e62", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: ".4rem" }}>{f.label}</label>
                      <input className="t-input" type={f.type} placeholder={f.ph} value={form[f.k]} onChange={set(f.k)} required />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: ".72rem", color: "#5c5e62", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: ".4rem" }}>Message</label>
                    <textarea className="t-textarea" rows={4} placeholder="Tell us how we can help…" value={form.message} onChange={set("message")} required />
                  </div>
                  <button type="submit" className="t-btn t-btn--dark" style={{ width: "100%", height: 52, fontSize: ".9rem" }}>
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Final footer strip */}
      <div className="t-footer">
        <p style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)", letterSpacing: ".06em", marginBottom: ".6rem" }}>
          © {new Date().getFullYear()} Inora Technologies Pvt. Ltd. · New Delhi, India
        </p>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,.65)", fontWeight: 300, letterSpacing: "-.01em" }}>
          One day, a child who cannot speak will tell their mother they love her — through Inora.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────────────────────── */
export default function AboutPage() {
  // Inject CSS once
  useEffect(() => {
    const ID = "inora-tesla-about";
    if (!document.getElementById(ID)) {
      const s = document.createElement("style");
      s.id = ID;
      s.textContent = TESLA_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useScrollReveal();

  return (
    <div className="t-root" style={{ paddingTop: 64 }}>
      <Navbar />
      <MissionPanel />
      <MissionBody />
      <div className="t-divider" />
      <PatientsSection />
      <div className="t-divider" />
      <TraditionalSection />
      <div className="t-divider" />
      <WhyChangeSection />
      <div className="t-divider" />
      <InoraVisionSection />
      <ContactSection />
    </div>
  );
}
