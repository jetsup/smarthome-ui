<template>
  <router-view />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f6f8fa;
  color: #1f2328;
  -webkit-font-smoothing: antialiased;
}

a {
  color: #0969da;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  font-family: inherit;
}

code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.card {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #0969da;
  color: #fff;
}

.btn-primary:hover {
  background: #0860ca;
  text-decoration: none;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #d0d7de;
  color: #1f2328;
}

.btn-secondary:hover {
  background: #f3f4f6;
  text-decoration: none;
}

.btn-danger {
  background: transparent;
  border: 1px solid #e63946;
  color: #e63946;
}

.btn-danger:hover {
  background: #e63946;
  color: #fff;
  text-decoration: none;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-online {
  background: #dafbe1;
  color: #116329;
}

.badge-offline {
  background: #ffebe9;
  color: #bc1c1b;
}

input, select, textarea {
  font-family: inherit;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
}
</style>
