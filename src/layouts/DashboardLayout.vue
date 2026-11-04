<template>
  <div class="shell" :class="{ 'sidebar-open': sidebarOpen, collapsed }">
    <aside class="sidebar">
      <!-- collapse toggle: a small tab on the sidebar edge -->
      <button
        class="collapse-btn"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed"
      >
        <svg viewBox="0 0 24 24" class="chev"><path d="m15 6-6 6 6 6" /></svg>
      </button>

      <div class="brand">
        <router-link to="/dashboard" class="logo" @click="sidebarOpen = false">
          <svg viewBox="0 0 32 32" class="logo-mark" aria-hidden="true">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#388bfd" />
                <stop offset="1" stop-color="#a371f7" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#lg)" />
            <path d="M8 15.5 16 9l8 6.5V23a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" />
            <path d="M12.5 19.5a4.8 4.8 0 0 1 7 0M14 21.6a2.6 2.6 0 0 1 4 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span class="logo-text">Smart<span>Home</span></span>
        </router-link>
        <button class="sidebar-close" @click="sidebarOpen = false" aria-label="Close menu">&times;</button>
      </div>

      <nav class="nav">
        <span class="nav-section">Control</span>
        <router-link
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: item.active() }"
          @click="sidebarOpen = false"
        >
          <svg viewBox="0 0 24 24" class="nav-icon" v-html="item.icon"></svg>
          <span class="nav-label">{{ item.label }}</span>
          <span class="tip">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="foot">
        <router-link to="/profile" class="user" :class="{ active: isActive(['/profile']) }" @click="sidebarOpen = false">
          <span class="avatar">{{ initials }}</span>
          <span class="user-text">
            <span class="user-name">{{ auth.fullName || 'Account' }}</span>
            <span class="user-sub">Profile &amp; security</span>
          </span>
          <span class="tip">{{ auth.fullName || 'Profile' }}</span>
        </router-link>
        <button class="signout" @click="handleLogout">
          <svg viewBox="0 0 24 24" class="nav-icon"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" /></svg>
          <span class="nav-label">Sign out</span>
          <span class="tip">Sign out</span>
        </button>
      </div>
    </aside>

    <div class="overlay" @click="sidebarOpen = false"></div>

    <div class="main">
      <header class="topbar">
        <button class="hamburger" @click="sidebarOpen = !sidebarOpen" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
        <div class="crumbs">
          <span class="crumb-root">SmartHome</span>
          <span class="crumb-sep">/</span>
          <h2 class="page-heading">{{ pageTitle }}</h2>
        </div>
        <div class="topbar-right">
          <span class="sys"><i></i>Hub online</span>
          <span class="ver">v2.0</span>
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
import { confirmDialog } from '../services/dialog'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sidebarOpen = ref(false)

// The sidebar can shrink to icons only; the choice is remembered.
const collapsed = ref(false)
try { collapsed.value = localStorage.getItem('sidebar-collapsed') === '1' } catch { /* storage unavailable */ }
function toggleCollapsed() {
  collapsed.value = !collapsed.value
  try { localStorage.setItem('sidebar-collapsed', collapsed.value ? '1' : '0') } catch { /* ignore */ }
}

const pageTitle = computed(() => route.meta?.title || 'Dashboard')

// A section stays highlighted on its sub-pages (e.g. /gateways/:id, /nodes/:id).
function isActive(prefixes, exact = false) {
  const p = route.path
  return prefixes.some((x) => (exact ? p === x : p === x || p.startsWith(x + '/')))
}

const items = [
  {
    to: '/dashboard', label: 'Dashboard', active: () => isActive(['/dashboard'], true),
    icon: '<rect x="3" y="3" width="7" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.6"/>',
  },
  {
    to: '/gateways', label: 'Gateways', active: () => isActive(['/gateways', '/nodes']),
    icon: '<rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 17h.01M11 17h.01"/><path d="M8.5 10.5a5 5 0 0 1 7 0M5.7 7.6a9 9 0 0 1 12.6 0"/>',
  },
  {
    to: '/displays', label: 'Displays', active: () => isActive(['/displays']),
    icon: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  },
  {
    to: '/pending-actions', label: 'Pending Actions', active: () => isActive(['/pending-actions']),
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  },
  {
    to: '/activity', label: 'Activity log', active: () => isActive(['/activity']),
    icon: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/>',
  },
]

const initials = computed(() => {
  if (!auth.user) return '?'
  const f = (auth.user.firstName || '')[0] || ''
  const l = (auth.user.lastName || '')[0] || ''
  return (f + l).toUpperCase() || '?'
})

async function handleLogout() {
  if (!(await confirmDialog({ title: 'Sign out?', message: 'You will need to sign in again to manage your devices.', confirmText: 'Sign out', danger: true }))) return
  auth.logout()
  router.push('/')
}
</script>

<style scoped>
.shell { display:flex; min-height:100vh; }

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  --w: 248px;
  position:sticky; top:0; height:100vh; width:var(--w); flex-shrink:0; z-index:50;
  display:flex; flex-direction:column;
  background:
    radial-gradient(120% 60% at 0% 0%, var(--c-hover), transparent 60%),
    var(--c-chrome);
  border-right:1px solid var(--c-chrome-line);
  color:var(--c-chrome-text);
  transition:width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
.collapsed .sidebar { --w: 72px; }

.collapse-btn {
  position:absolute; top:22px; right:-13px; z-index:60;
  width:26px; height:26px; border-radius:50%; cursor:pointer;
  display:grid; place-items:center;
  background:var(--c-chrome-2); border:1px solid var(--c-chrome-line2); color:var(--c-chrome-muted);
  box-shadow:var(--shadow-1);
  transition:color 0.15s, border-color 0.15s, transform 0.15s;
}
.collapse-btn:hover { color:var(--c-accent); border-color:var(--c-accent); transform:scale(1.08); }
.chev { width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; transition:transform 0.22s; }
.collapsed .chev { transform:rotate(180deg); }

.brand { display:flex; align-items:center; justify-content:space-between; padding:1.15rem 1.1rem 1rem; height:64px; }
.logo { display:flex; align-items:center; gap:0.7rem; text-decoration:none; min-width:0; }
.logo:hover { text-decoration:none; }
.logo-mark { width:34px; height:34px; flex-shrink:0; filter:drop-shadow(0 4px 12px var(--c-glow)); }
.logo-text { font-size:1.12rem; font-weight:800; letter-spacing:-0.03em; color:var(--c-strong); white-space:nowrap; }
.logo-text span { background:var(--c-grad); -webkit-background-clip:text; background-clip:text; color:transparent; }
.sidebar-close { display:none; background:none; border:none; color:var(--c-chrome-muted); font-size:1.6rem; cursor:pointer; line-height:1; }

.nav { flex:1; padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
.nav-section {
  font-size:0.66rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase;
  color:var(--c-chrome-muted); opacity:0.7; padding:0.7rem 0.65rem 0.4rem; white-space:nowrap; overflow:hidden;
}
.collapsed .nav-section { visibility:hidden; height:0.9rem; padding:0; }

.nav-item, .signout, .user {
  position:relative; display:flex; align-items:center; gap:0.8rem;
  padding:0.62rem 0.7rem; border-radius:11px; cursor:pointer;
  color:var(--c-chrome-muted); font-size:0.9rem; font-weight:550; text-decoration:none;
  background:none; border:none; width:100%; text-align:left; font-family:inherit;
  transition:background 0.15s, color 0.15s;
}
.nav-item:hover, .signout:hover, .user:hover { background:var(--c-hover); color:var(--c-strong); text-decoration:none; }
.nav-icon { width:20px; height:20px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.nav-label { white-space:nowrap; overflow:hidden; }

.nav-item.active, .user.active { color:var(--c-strong); background:var(--c-hover); box-shadow:0 0 0 1px var(--c-glow) inset; }
.nav-item.active .nav-icon { color:var(--c-accent); filter:drop-shadow(0 0 6px var(--c-glow)); }
.nav-item.active::before {
  content:''; position:absolute; left:-0.75rem; top:20%; bottom:20%; width:3px; border-radius:0 3px 3px 0;
  background:var(--c-active-bar); box-shadow:0 0 12px var(--c-glow);
}

/* hover label, only meaningful (and shown) when the sidebar is icons-only */
.tip {
  position:absolute; left:calc(100% + 14px); top:50%; transform:translate(-4px, -50%);
  background:var(--c-chrome-2); color:var(--c-strong); border:1px solid var(--c-chrome-line2);
  padding:0.38rem 0.7rem; border-radius:9px; font-size:0.78rem; font-weight:600; white-space:nowrap;
  box-shadow:var(--shadow-2); opacity:0; pointer-events:none; visibility:hidden; z-index:100;
  transition:opacity 0.15s, transform 0.15s;
}
.collapsed .nav-item:hover .tip,
.collapsed .signout:hover .tip,
.collapsed .user:hover .tip { opacity:1; visibility:visible; transform:translate(0, -50%); }

.collapsed .nav-item, .collapsed .signout, .collapsed .user { justify-content:center; padding-left:0; padding-right:0; gap:0; }
.collapsed .nav-label, .collapsed .logo-text, .collapsed .user-text { display:none; }
.collapsed .brand { justify-content:center; padding-left:0; padding-right:0; }
.collapsed .nav-item.active::before { left:-0.75rem; }

.foot { padding:0.75rem; border-top:1px solid var(--c-chrome-line); display:flex; flex-direction:column; gap:0.25rem; }
.avatar {
  width:34px; height:34px; border-radius:50%; flex-shrink:0; display:grid; place-items:center;
  font-size:0.74rem; font-weight:800; color:#fff; background:var(--c-grad);
  box-shadow:0 0 0 2px var(--c-chrome), 0 0 0 3px var(--c-glow);
}
.user-text { display:flex; flex-direction:column; min-width:0; line-height:1.25; }
.user-name { color:var(--c-strong); font-size:0.86rem; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.user-sub { font-size:0.7rem; color:var(--c-chrome-muted); }
.signout:hover { color:var(--c-danger); }

/* ── Main ─────────────────────────────────────────────────────────────── */
.main { flex:1; min-width:0; display:flex; flex-direction:column; }

.topbar {
  position:sticky; top:0; z-index:40; display:flex; align-items:center; gap:0.9rem;
  padding:0 2rem; height:64px;
  background:color-mix(in srgb, var(--c-bg) 78%, transparent);
  backdrop-filter:blur(14px) saturate(1.4); -webkit-backdrop-filter:blur(14px) saturate(1.4);
  border-bottom:1px solid var(--c-border);
}
.crumbs { display:flex; align-items:center; gap:0.55rem; flex:1; min-width:0; }
.crumb-root { font-family:var(--font-mono); font-size:0.72rem; color:var(--c-muted); letter-spacing:0.04em; text-transform:uppercase; }
.crumb-sep { color:var(--c-border); font-weight:300; }
.page-heading { font-size:1.05rem; font-weight:700; color:var(--c-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.topbar-right { display:flex; align-items:center; gap:0.6rem; flex-shrink:0; }
.sys { display:inline-flex; align-items:center; gap:0.45rem; font-size:0.72rem; font-weight:600; color:var(--c-ok-text); background:var(--c-ok-bg); padding:0.28rem 0.7rem; border-radius:999px; }
.sys i { width:6px; height:6px; border-radius:50%; background:currentColor; animation:pulse 2s infinite; }
.ver { font-family:var(--font-mono); font-size:0.7rem; color:var(--c-muted); border:1px solid var(--c-border); padding:0.2rem 0.5rem; border-radius:7px; }

.hamburger { display:none; flex-direction:column; gap:4px; background:none; border:none; cursor:pointer; padding:4px; flex-shrink:0; }
.hamburger span { display:block; width:20px; height:2px; background:var(--c-text); border-radius:2px; }

.content {
  flex:1; padding:1.75rem 2rem 3rem;
  background-image:radial-gradient(var(--c-grid) 1px, transparent 1px);
  background-size:22px 22px;
}

.overlay { display:none; }

/* ── Mobile: the sidebar becomes a slide-over drawer (never icons-only) ── */
@media (max-width: 768px) {
  .sidebar, .collapsed .sidebar { --w: 264px; position:fixed; left:-280px; top:0; bottom:0; z-index:200; transition:left 0.25s ease; }
  .sidebar-open .sidebar { left:0; }
  .collapse-btn { display:none; }
  .sidebar-close { display:block; }
  .overlay { display:block; position:fixed; inset:0; background:rgba(0, 0, 0, 0.55); z-index:199; opacity:0; pointer-events:none; transition:opacity 0.25s; }
  .sidebar-open .overlay { opacity:1; pointer-events:auto; }
  .hamburger { display:flex; }
  .topbar { padding:0 1rem; }
  .content { padding:1rem 1rem 2rem; }
  .sys, .crumb-root, .crumb-sep { display:none; }
  /* undo the icons-only rules inside the drawer */
  .collapsed .nav-label, .collapsed .logo-text, .collapsed .user-text { display:initial; }
  .collapsed .user-text { display:flex; }
  .collapsed .nav-item, .collapsed .signout, .collapsed .user { justify-content:flex-start; padding:0.62rem 0.7rem; gap:0.8rem; }
  .collapsed .brand { justify-content:space-between; padding:1.15rem 1.1rem 1rem; }
  .tip { display:none; }
}
</style>
