<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-col">
        <h4>Smart<span>Home</span></h4>
        <p>Centralized control for your ESP32 mesh network. Secure, scalable, and built for the modern smart home.</p>
      </div>
      <div class="footer-col">
        <h5>Product</h5>
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
        <router-link to="/contact">Contact</router-link>
      </div>
      <div class="footer-col">
        <h5>Account</h5>
        <router-link to="/login">Sign In</router-link>
        <router-link to="/register">Register</router-link>
      </div>
      <div class="footer-col">
        <h5>Docs</h5>
        <a href="#">Getting Started</a>
        <a href="#">API Reference</a>
        <a href="#">GitHub</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; {{ new Date().getFullYear() }} SmartHome Hub. All rights reserved.</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background:var(--c-chrome);
  color:var(--c-chrome-muted);
  margin-top:4rem;
  padding:3rem 2rem 1.5rem;
}

.footer-inner {
  max-width:1200px;
  margin:0 auto;
  display:grid;
  grid-template-columns:2fr 1fr 1fr 1fr;
  gap:2rem;
}

.footer-col h4 {
  font-size:1.25rem;
  color:var(--c-strong);
  margin-bottom:0.75rem;
}

.footer-col h4 span {
  color:var(--c-chrome-accent);
}

.footer-col p {
  font-size:0.875rem;
  line-height:1.6;
  max-width:300px;
}

.footer-col h5 {
  color:var(--c-chrome-text);
  font-size:0.9rem;
  margin-bottom:0.75rem;
  text-transform:uppercase;
  letter-spacing:1px;
}

.footer-col a {
  display:block;
  color:var(--c-chrome-muted);
  text-decoration:none;
  font-size:0.85rem;
  padding:0.25rem 0;
  transition:color 0.2s;
}

.footer-col a:hover {
  color:var(--c-chrome-accent);
}

.footer-bottom {
  max-width:1200px;
  margin:2rem auto 0;
  padding-top:1.5rem;
  border-top:1px solid var(--c-chrome-line);
  text-align:center;
  font-size:0.8rem;
}

@media (max-width: 768px) {
  .footer-inner {
    grid-template-columns:1fr 1fr;
  }
}
</style>
