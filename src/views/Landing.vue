<template>
  <div class="landing">
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <span class="hero-badge">ESP32 Mesh Network v2.0</span>
        <h1>Control your<br/><span class="highlight">Smart Home</span></h1>
        <p class="hero-sub">A centralized hub for your ESP32 mesh network. Monitor nodes, send commands, and manage gateways, all from one dashboard.</p>
        <div class="hero-cta">
          <router-link to="/register" class="btn btn-primary btn-lg">Get Started Free</router-link>
          <router-link to="/about" class="btn btn-secondary btn-lg">Learn More</router-link>
        </div>
        <div class="hero-stats">
          <div class="stat"><strong>Zero</strong> configuration</div>
          <div class="stat"><strong>Real-time</strong> control</div>
          <div class="stat"><strong>Secure</strong> API keys</div>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="section-label">Features</div>
      <h2>Everything you need to manage your mesh</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><Icon name="bolt" /></div>
          <h3>Real-Time Control</h3>
          <p>Send commands to any node in your mesh network with sub-second latency. Toggle lights, read sensors, and more.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><Icon name="lock" /></div>
          <h3>Secure by Design</h3>
          <p>Each gateway is authenticated with a unique API key. All communication is encrypted and authorized via JWT.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><Icon name="cloud" /></div>
          <h3>Zero-Touch Setup</h3>
          <p>Provision new gateways in minutes using the captive portal flow. No technical skills required.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><Icon name="chart" /></div>
          <h3>Multi-User Dashboard</h3>
          <p>Every user gets an isolated workspace. Register gateways, monitor nodes, and track activity with full audit logs.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><Icon name="link" /></div>
          <h3>ESP-NOW Mesh</h3>
          <p>Leverages ESP-NOW for low-power, connectionless communication between nodes. No WiFi required on end devices.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><Icon name="book" /></div>
          <h3>Open Source</h3>
          <p>Fully open-source stack. Go backend, Vue frontend, and Arduino firmware, all customizable to your needs.</p>
        </div>
      </div>
    </section>

    <section class="how-it-works">
      <div class="section-label">How It Works</div>
      <h2>From gateway to node in three steps</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>Provision</h3>
          <p>Create a gateway in your dashboard. A unique API key is generated for secure authentication.</p>
        </div>
        <div class="step-arrow"><Icon name="arrow-right" /></div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>Connect</h3>
          <p>The gateway connects to your WiFi and establishes a secure TCP link to the hub.</p>
        </div>
        <div class="step-arrow"><Icon name="arrow-right" /></div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>Control</h3>
          <p>Nodes auto-register via ESP-NOW. Monitor and control them from anywhere via the web dashboard or API.</p>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <h2>Ready to build your smart home?</h2>
      <p>Join users managing their ESP32 mesh networks with SmartHome Hub.</p>
      <router-link to="/register" class="btn btn-primary btn-lg">Create Your Account</router-link>
    </section>
  </div>
</template>

<style scoped>
/* ── Hero ───────────────────────────────────── */
.hero {
  position:relative;
  overflow:hidden;
  padding:5rem 1.5rem 4rem;
  text-align:center;
  background:linear-gradient(135deg, var(--c-chrome) 0%, var(--c-chrome-2) 50%, var(--c-chrome) 100%);
}

.hero-bg {
  position:absolute;
  inset:0;
  background:radial-gradient(ellipse at 20% 50%, rgba(9, 105, 218, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(35, 134, 54, 0.06) 0%, transparent 50%);
}

.hero-content {
  position:relative;
  max-width:720px;
  margin:0 auto;
}

.hero-badge {
  display:inline-block;
  background:rgba(88, 166, 255, 0.1);
  color:var(--c-chrome-accent);
  padding:0.35rem 1rem;
  border-radius:999px;
  font-size:0.8rem;
  font-weight:600;
  margin-bottom:1.5rem;
  border:1px solid rgba(88, 166, 255, 0.2);
}

.hero h1 {
  font-size:3.5rem;
  font-weight:800;
  color:var(--c-strong);
  line-height:1.15;
  margin-bottom:1rem;
}

.highlight {
  background:linear-gradient(135deg, var(--c-chrome-accent), #79c0ff);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
}

.hero-sub {
  color:var(--c-chrome-muted);
  font-size:1.1rem;
  line-height:1.6;
  max-width:540px;
  margin:0 auto 2rem;
}

.hero-cta {
  display:flex;
  gap:0.75rem;
  justify-content:center;
  flex-wrap:wrap;
  margin-bottom:2.5rem;
}

.btn-lg {
  padding:0.7rem 1.75rem;
  font-size:0.95rem;
}

.hero-stats {
  display:flex;
  gap:2rem;
  justify-content:center;
  color:var(--c-chrome-muted);
  font-size:0.85rem;
}

.hero-stats strong {
  color:var(--c-chrome-text);
}

/* ── Sections ───────────────────────────────── */
.section-label {
  display:inline-block;
  color:var(--c-accent);
  font-size:0.8rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin-bottom:0.5rem;
}

section h2 {
  font-size:2rem;
  font-weight:700;
  color:var(--c-text);
  margin-bottom:2.5rem;
}

.features {
  padding:5rem 1.5rem;
  max-width:1100px;
  margin:0 auto;
}

.features-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));
  gap:1rem;
}

.feature-card {
  background:var(--c-surface);
  border:1px solid var(--c-border);
  border-radius:10px;
  padding:1.5rem;
  transition:box-shadow 0.2s, transform 0.2s;
}

.feature-card:hover {
  box-shadow:0 4px 12px rgba(0, 0, 0, 0.06);
  transform:translateY(-2px);
}

.feature-icon {
  font-size:1.75rem;
  margin-bottom:0.75rem;
}

.feature-card h3 {
  font-size:1.05rem;
  font-weight:700;
  margin-bottom:0.4rem;
}

.feature-card p {
  color:var(--c-muted);
  font-size:0.875rem;
  line-height:1.5;
}

/* ── How It Works ──────────────────────────── */
.how-it-works {
  background:var(--c-bg);
  border-top:1px solid var(--c-border);
  border-bottom:1px solid var(--c-border);
  padding:5rem 1.5rem;
  text-align:center;
}

.steps {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:2rem;
  max-width:900px;
  margin:0 auto;
  flex-wrap:wrap;
}

.step {
  flex:1;
  min-width:200px;
  max-width:260px;
  text-align:center;
}

.step-num {
  width:48px;
  height:48px;
  border-radius:50%;
  background:var(--c-accent-btn);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:1.2rem;
  font-weight:700;
  margin:0 auto 1rem;
}

.step h3 {
  font-size:1.05rem;
  font-weight:700;
  margin-bottom:0.4rem;
}

.step p {
  color:var(--c-muted);
  font-size:0.85rem;
  line-height:1.5;
}

.step-arrow {
  font-size:1.5rem;
  color:var(--c-border);
  font-weight:300;
}

/* ── CTA ───────────────────────────────────── */
.cta-section {
  text-align:center;
  padding:5rem 1.5rem;
}

.cta-section h2 {
  margin-bottom:0.75rem;
}

.cta-section p {
  color:var(--c-muted);
  margin-bottom:1.5rem;
}

@media (max-width: 768px) {
  .hero { padding:3rem 1.25rem 2.5rem; }
  .hero h1 { font-size:2rem; }
  .hero-sub { font-size:0.95rem; }
  .hero-stats { flex-direction:column; gap:0.5rem; }
  .steps { flex-direction:column; }
  .step-arrow { transform:rotate(90deg); }
  section h2 { font-size:1.5rem; }
  .features { padding:3rem 1.25rem; }
  .how-it-works { padding:3rem 1.25rem; }
  .cta-section { padding:3rem 1.25rem; }
  .features-grid { grid-template-columns:1fr; }
}
</style>
