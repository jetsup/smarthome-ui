<template>
  <header class="header">
    <div class="header-inner">
      <router-link to="/" class="logo">Smart<span>Home</span></router-link>

      <button class="hamburger" @click="menuOpen = !menuOpen" :aria-label="menuOpen ? 'Close menu' : 'Open menu'">
        <span></span><span></span><span></span>
      </button>

      <nav class="nav" :class="{ 'nav-open': menuOpen }">
        <template v-if="auth.isAuthenticated">
          <router-link to="/dashboard" @click="menuOpen = false">Dashboard</router-link>
          <router-link to="/gateways" @click="menuOpen = false">Gateways</router-link>
        </template>
        <template v-else>
          <router-link to="/" @click="menuOpen = false">Home</router-link>
          <router-link to="/about" @click="menuOpen = false">About</router-link>
          <router-link to="/contact" @click="menuOpen = false">Contact</router-link>
        </template>
      </nav>

      <div class="header-right" :class="{ 'nav-open': menuOpen }">
        <template v-if="auth.isAuthenticated">
          <span class="user-badge">{{ auth.fullName }}</span>
          <button class="btn-ghost" @click="handleLogout">Logout</button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn-ghost" @click="menuOpen = false">Sign In</router-link>
          <router-link to="/register" class="btn-primary-sm" @click="menuOpen = false">Get Started</router-link>
        </template>
      </div>
    </div>
    <div v-if="menuOpen" class="nav-overlay" @click="menuOpen = false"></div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { confirmDialog } from '../services/dialog'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const menuOpen = ref(false)

async function handleLogout() {
  if (!(await confirmDialog({ title: 'Sign out?', message: 'You will need to sign in again to manage your devices.', confirmText: 'Sign out', danger: true }))) return
  auth.logout()
  router.push('/')
}
</script>

<style scoped>
.header {
  background:var(--c-chrome);
  border-bottom:1px solid var(--c-chrome-line);
  position:sticky;
  top:0;
  z-index:100;
}

.header-inner {
  max-width:1200px;
  margin:0 auto;
  display:flex;
  align-items:center;
  justify-content:space-between;
  height:64px;
  padding:0 1.5rem;
  position:relative;
}

.logo {
  font-size:1.35rem;
  font-weight:700;
  color:var(--c-strong);
  text-decoration:none;
  letter-spacing:-0.5px;
  flex-shrink:0;
}

.logo span {
  color:var(--c-chrome-accent);
}

.hamburger {
  display:none;
  flex-direction:column;
  gap:4px;
  background:none;
  border:none;
  cursor:pointer;
  padding:4px;
}

.hamburger span {
  display:block;
  width:22px;
  height:2px;
  background:var(--c-chrome-text);
  border-radius:2px;
  transition:background 0.2s;
}

.nav {
  display:flex;
  gap:1.75rem;
}

.nav a {
  color:var(--c-chrome-muted);
  text-decoration:none;
  font-size:0.9rem;
  font-weight:500;
  transition:color 0.2s;
  position:relative;
}

.nav a:hover {
  color:var(--c-strong);
}

.nav a.router-link-active {
  color:var(--c-chrome-accent);
}

.nav a.router-link-active::after {
  content:'';
  position:absolute;
  bottom:-22px;
  left:0;
  right:0;
  height:2px;
  background:var(--c-chrome-accent);
}

.header-right {
  display:flex;
  align-items:center;
  gap:1rem;
}

.user-badge {
  background:var(--c-chrome-2);
  color:var(--c-chrome-text);
  padding:0.35rem 0.85rem;
  border-radius:6px;
  font-size:0.85rem;
  border:1px solid var(--c-chrome-line2);
}

.btn-ghost {
  background:transparent;
  border:1px solid var(--c-chrome-line2);
  color:var(--c-chrome-text);
  padding:0.45rem 1.1rem;
  border-radius:6px;
  font-size:0.85rem;
  font-weight:500;
  cursor:pointer;
  text-decoration:none;
  transition:all 0.2s;
}

.btn-ghost:hover {
  border-color:var(--c-chrome-accent);
  color:var(--c-chrome-accent);
}

.btn-primary-sm {
  background:#238636;
  color:#fff;
  border:none;
  padding:0.45rem 1.1rem;
  border-radius:6px;
  font-size:0.85rem;
  font-weight:600;
  cursor:pointer;
  text-decoration:none;
  transition:background 0.2s;
}

.btn-primary-sm:hover {
  background:#2ea043;
}

.nav-overlay {
  display:none;
}

@media (max-width: 768px) {
  .hamburger {
    display:flex;
  }

  .nav,
  .header-right {
    position:fixed;
    top:64px;
    left:0;
    right:0;
    background:var(--c-chrome);
    flex-direction:column;
    padding:0.75rem 1.5rem;
    gap:0;
    transform:translateY(-120%);
    transition:transform 0.25s ease;
    z-index:99;
    border-bottom:1px solid var(--c-chrome-line);
  }

  .nav.nav-open,
  .header-right.nav-open {
    transform:translateY(0);
  }

  .nav a,
  .header-right a,
  .header-right button {
    padding:0.7rem 0;
    border-bottom:1px solid var(--c-chrome-line);
    display:block;
    width:100%;
    text-align:left;
  }

  .nav a:last-child,
  .header-right a:last-child {
    border-bottom:none;
  }

  .nav a.router-link-active::after {
    display:none;
  }

  .header-right .btn-ghost,
  .header-right .btn-primary-sm {
    width:100%;
    text-align:center;
    margin-top:0.35rem;
  }

  .user-badge {
    display:none;
  }

  .nav-overlay {
    display:block;
    position:fixed;
    inset:0;
    background:transparent;
    z-index:98;
  }
}
</style>
