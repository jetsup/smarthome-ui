<template>
  <div class="sidebar-layout" :class="{ 'sidebar-open': sidebarOpen }">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <router-link to="/dashboard" class="logo">Smart<span>Home</span></router-link>
        <button class="sidebar-close" @click="sidebarOpen = false" aria-label="Close sidebar">&times;</button>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item" exact-active-class="active" @click="sidebarOpen = false">
          <span class="nav-icon">&#9632;</span>
          Dashboard
        </router-link>
        <router-link to="/gateways" class="nav-item" active-class="active" @click="sidebarOpen = false">
          <span class="nav-icon">&#9776;</span>
          Gateways
        </router-link>
        <router-link to="/pending-actions" class="nav-item" active-class="active" @click="sidebarOpen = false">
          <span class="nav-icon">&#9881;</span>
          Pending Actions
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-avatar">{{ initials }}</span>
          <span class="user-name">{{ auth.fullName }}</span>
        </div>
        <button class="logout-btn" @click="handleLogout">Sign Out</button>
      </div>
    </aside>

    <div class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <div class="main-area">
      <header class="topbar">
        <button class="hamburger" @click="sidebarOpen = !sidebarOpen" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
        <h2 class="page-heading">{{ pageTitle }}</h2>
        <div class="topbar-right">
          <span class="topbar-badge">v2.0</span>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sidebarOpen = ref(false)

const pageTitle = computed(() => route.meta?.title || 'Dashboard')

const initials = computed(() => {
  if (!auth.user) return '?'
  const f = (auth.user.firstName || '')[0] || ''
  const l = (auth.user.lastName || '')[0] || ''
  return (f + l).toUpperCase() || '?'
})

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<style scoped>
.sidebar-layout {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ──────────────────────────── */
.sidebar {
  width: 240px;
  background: #0d1117;
  color: #c9d1d9;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 0.75rem;
  border-bottom: 1px solid #21262d;
}

.sidebar-close {
  display: none;
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  letter-spacing: -0.5px;
}

.logo span {
  color: #58a6ff;
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  color: #8b949e;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
}

.nav-item:hover {
  background: #161b22;
  color: #c9d1d9;
}

.nav-item.active {
  background: #1f2937;
  color: #58a6ff;
  font-weight: 600;
}

.nav-icon {
  font-size: 0.9rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 1rem 0.75rem;
  border-top: 1px solid #21262d;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.6rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #238636;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.8rem;
  color: #c9d1d9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  width: 100%;
  background: transparent;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 0.45rem 0;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.logout-btn:hover {
  border-color: #e63946;
  color: #e63946;
}

.sidebar-overlay {
  display: none;
}

/* ── Main Area ────────────────────────── */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f6f8fa;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: #fff;
  border-bottom: 1px solid #d0d7de;
  min-height: 60px;
  gap: 0.75rem;
}

.hamburger {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.hamburger span {
  display: block;
  width: 20px;
  height: 2px;
  background: #1f2328;
  border-radius: 2px;
}

.page-heading {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2328;
  flex: 1;
}

.topbar-badge {
  background: #ddf4ff;
  color: #0969da;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.content {
  flex: 1;
  padding: 1.5rem 2rem;
}

/* ── Mobile ───────────────────────────── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -260px;
    top: 0;
    bottom: 0;
    z-index: 200;
    transition: left 0.25s ease;
    height: 100vh;
  }

  .sidebar-open .sidebar {
    left: 0;
  }

  .sidebar-close {
    display: block;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 199;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }

  .sidebar-open .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }

  .hamburger {
    display: flex;
  }

  .topbar {
    padding: 0.75rem 1rem;
  }

  .content {
    padding: 1rem;
  }
}
</style>
