<template>
  <div class="about-page container fade-in">
    <div class="about-header">
      <span class="section-label">About</span>
      <h1>Built for the connected home</h1>
      <p class="lead">SmartHome Hub is an open-source platform that bridges ESP32 mesh networks to the cloud. It gives you real-time control over your IoT devices through a clean web interface and a powerful REST API.</p>
    </div>

    <div class="about-grid">
      <div class="about-card">
        <h3>Our Mission</h3>
        <p>We believe smart home technology should be accessible, secure, and private. SmartHome Hub puts you in control. Your data stays on your infrastructure, and every device is authenticated.</p>
      </div>
      <div class="about-card">
        <h3>How It Works</h3>
        <p>ESP32 nodes communicate over ESP-NOW, a low-power wireless protocol. A gateway device bridges the mesh to the internet via TCP. The Go backend processes commands and serves the Vue-based dashboard.</p>
      </div>
      <div class="about-card">
        <h3>Technology Stack</h3>
        <p><strong>Backend:</strong> Go + Gin + GORM + MariaDB<br/>
        <strong>Frontend:</strong> Vue 3 + Vite + Pinia<br/>
        <strong>Firmware:</strong> Arduino framework for ESP32<br/>
        <strong>Protocol:</strong> ESP-NOW mesh with TCP uplink</p>
      </div>
      <div class="about-card">
        <h3>Security</h3>
        <p>Every gateway is assigned a unique API key. User sessions are protected with JWT tokens. All activity is logged in the audit table for full traceability.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  padding-top:4rem;
  padding-bottom:4rem;
}

.about-header {
  max-width:650px;
  margin-bottom:3rem;
}

.section-label {
  display:inline-block;
  color:var(--c-accent);
  font-size:0.8rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin-bottom:0.5rem;
}

.about-header h1 {
  font-size:2.25rem;
  font-weight:800;
  margin-bottom:1rem;
  color:var(--c-text);
}

.lead {
  font-size:1.05rem;
  color:var(--c-muted);
  line-height:1.6;
}

.about-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
  gap:1rem;
}

.about-card {
  background:var(--c-surface);
  border:1px solid var(--c-border);
  border-radius:10px;
  padding:1.5rem;
}

.about-card h3 {
  font-size:1.05rem;
  font-weight:700;
  margin-bottom:0.5rem;
  color:var(--c-text);
}

.about-card p {
  color:var(--c-muted);
  font-size:0.875rem;
  line-height:1.6;
}
</style>
