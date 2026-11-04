<template>
  <router-view />
  <DialogHost />
</template>

<script setup>
import DialogHost from './components/DialogHost.vue'
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

* {
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body {
  font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background:var(--c-bg);
  color:var(--c-text);
  -webkit-font-smoothing:antialiased;
}

a {
  color:var(--c-accent);
  text-decoration:none;
}

a:hover {
  text-decoration:underline;
}

button {
  font-family:inherit;
}

code {
  font-family:var(--font-mono);
  font-size:0.85em;
  background:var(--c-surface-2);
  border:1px solid var(--c-border);
  padding:0.05rem 0.4rem;
  border-radius:6px;
}

h1, h2, h3, h4 {
  letter-spacing:-0.015em;
}

::selection {
  background:var(--c-glow);
}

:focus-visible {
  outline:2px solid var(--c-accent);
  outline-offset:2px;
}

.container {
  max-width:1200px;
  margin:0 auto;
  padding:0 1.5rem;
}

.card {
  background:var(--c-surface);
  border:1px solid var(--c-border);
  border-radius:var(--radius);
  box-shadow:var(--shadow-1);
  transition:border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.btn {
  display:inline-flex;
  align-items:center;
  gap:0.4rem;
  padding:0.55rem 1.25rem;
  border-radius:10px;
  font-size:0.9rem;
  font-weight:600;
  cursor:pointer;
  border:none;
  text-decoration:none;
  transition:all 0.2s;
}

.btn-primary {
  background:var(--c-accent-btn);
  color:#fff;
  box-shadow:0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 4px 14px -4px var(--c-glow);
}

.btn-primary:hover {
  background:var(--c-accent-btn-hover);
  text-decoration:none;
  box-shadow:0 1px 0 rgba(255, 255, 255, 0.22) inset, 0 6px 20px -4px var(--c-glow);
  transform:translateY(-1px);
}

.btn:disabled {
  opacity:0.55;
  cursor:not-allowed;
  transform:none;
}

.btn-secondary {
  background:transparent;
  border:1px solid var(--c-border);
  color:var(--c-text);
}

.btn-secondary:hover {
  background:var(--c-surface-2);
  text-decoration:none;
}

.btn-danger {
  background:transparent;
  border:1px solid var(--c-danger);
  color:var(--c-danger);
}

.btn-danger:hover {
  background:var(--c-danger);
  color:#fff;
  text-decoration:none;
}

.badge {
  display:inline-flex;
  align-items:center;
  gap:0.4rem;
  padding:0.2rem 0.65rem;
  border-radius:999px;
  font-size:0.72rem;
  font-weight:600;
  letter-spacing:0.02em;
}

.badge::before {
  content:'';
  width:6px;
  height:6px;
  border-radius:50%;
  background:currentColor;
}

.badge-online {
  background:var(--c-ok-bg);
  color:var(--c-ok-text);
}

.badge-online::before {
  box-shadow:0 0 0 0 currentColor;
  animation:pulse 2s infinite;
}

.badge-offline {
  background:var(--c-danger-bg);
  color:var(--c-danger);
}

@keyframes pulse {
  0% { box-shadow:0 0 0 0 color-mix(in srgb, currentColor 55%, transparent); }
  70% { box-shadow:0 0 0 6px transparent; }
  100% { box-shadow:0 0 0 0 transparent; }
}

input, select, textarea {
  font-family:inherit;
}

@keyframes fadeIn {
  from { opacity:0; transform:translateY(10px); }
  to { opacity:1; transform:translateY(0); }
}

.fade-in {
  animation:fadeIn 0.3s ease-out;
}

@media (max-width: 768px) {
  .container {
    padding:0 1rem;
  }
}
</style>
