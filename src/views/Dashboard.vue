<template>
  <div class="dash fade-in">
    <div class="stats-row">
      <div class="stat-card card">
        <span class="stat-num">{{ stats.gateways }}</span>
        <span class="stat-label">Gateways</span>
      </div>
      <div class="stat-card card">
        <span class="stat-num">{{ stats.nodes }}</span>
        <span class="stat-label">Nodes</span>
      </div>
      <div class="stat-card card online-card">
        <span class="stat-num">{{ stats.onlineGateways }} / {{ stats.onlineNodes }}</span>
        <span class="stat-label">Online (Gateway / Node)</span>
      </div>
    </div>

    <div class="dash-header">
      <h3 class="section-title">Your Gateways</h3>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>

    <div v-else-if="gateways.length === 0" class="empty-state card">
      <p>No gateways yet.</p>
    </div>

    <div v-else class="gateway-grid">
      <router-link
        v-for="gw in gateways"
        :key="gw.id"
        :to="`/gateways/${gw.id}`"
        class="gw-card card"
      >
        <div class="gw-card-top">
          <h4>{{ gw.name }}</h4>
          <span :class="['badge', gw.online ? 'badge-online' : 'badge-offline']">
            {{ gw.online ? 'Online' : 'Offline' }}
          </span>
        </div>
        <div class="gw-card-meta">
          <span>ID: <code>{{ gw.id }}</code></span>
          <span>{{ gw.nodeCount || 0 }} nodes ({{ gw.onlineNodes || 0 }} online)</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'

const store = useGatewayStore()

const gateways = computed(() => store.gateways)
const loading = computed(() => store.loading)

const stats = ref({
  gateways: 0,
  nodes: 0,
  onlineGateways: 0,
  onlineNodes: 0,
  gatewayList: [],
  onlineNodeList: [],
})

let pollTimer = null

async function fetchStats() {
  try {
    const { data } = await api.get('/stats')
    stats.value = data
  } catch {
    // ignore
  }
}

async function fetchAll() {
  await Promise.all([
    store.fetchAll(),
    fetchStats(),
  ])
}

function startPolling() {
  pollTimer = setInterval(fetchStats, 10000)
}

onMounted(() => {
  fetchAll()
  startPolling()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.dash {
  max-width:1000px;
}

.stats-row {
  display:flex;
  gap:1rem;
  margin-bottom:2rem;
}

.stat-card {
  flex:1;
  padding:1.25rem 1.5rem;
  display:flex;
  flex-direction:column;
  min-width:120px;
}

.stat-num {
  font-size:2rem;
  font-weight:800;
  color:var(--c-accent);
}

.online-card .stat-num {
  font-size:1.5rem;
}

.stat-label {
  color:var(--c-muted);
  font-size:0.85rem;
  margin-top:0.15rem;
}

.dash-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:1rem;
  margin-bottom:2rem;
}

.section {
  padding:1.25rem;
}

.section h4 {
  font-size:0.9rem;
  font-weight:700;
  margin-bottom:0.75rem;
  color:var(--c-text);
}

.empty-hint {
  color:var(--c-muted);
  font-size:0.82rem;
  font-style:italic;
}

.online-item {
  margin-bottom:0.35rem;
}

.online-link {
  display:flex;
  align-items:center;
  gap:0.5rem;
  text-decoration:none;
  color:inherit;
  padding:0.3rem 0.5rem;
  border-radius:6px;
  font-size:0.82rem;
  transition:background 0.15s;
}

.online-link:hover {
  background:var(--c-bg);
}

.online-dot {
  width:8px;
  height:8px;
  border-radius:50%;
  flex-shrink:0;
}

.dot-green {
  background:var(--c-ok-text);
}

.dot-gray {
  background:var(--c-chrome-muted);
}

.online-link code {
  background:var(--c-surface-2);
  padding:0.05rem 0.3rem;
  border-radius:4px;
  font-size:0.75rem;
}

.node-badge {
  margin-left:auto;
  font-size:0.72rem;
  color:var(--c-muted);
}

.gw-tag {
  font-size:0.7rem;
  color:var(--c-muted);
  background:var(--c-surface-2);
  padding:0.05rem 0.3rem;
  border-radius:4px;
}

.val-badge {
  margin-left:auto;
  font-weight:600;
  color:var(--c-accent);
}

.dash-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:1rem;
}

.section-title {
  font-size:1.05rem;
  font-weight:700;
}

.gateway-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
  gap:1rem;
}

.gw-card {
  padding:1.25rem;
  text-decoration:none;
  color:inherit;
  transition:box-shadow 0.2s;
}

.gw-card:hover {
  box-shadow:0 4px 12px rgba(0, 0, 0, 0.08);
}

.gw-card-top {
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:0.75rem;
}

.gw-card-top h4 {
  font-size:1rem;
  font-weight:700;
}

.gw-card-meta {
  display:flex;
  gap:1rem;
  font-size:0.8rem;
  color:var(--c-muted);
}

.gw-card-meta code {
  background:var(--c-surface-2);
  padding:0.1rem 0.35rem;
  border-radius:4px;
}

.state-msg, .empty-state {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
}

.empty-state p {
  margin-bottom:1rem;
}

@media (max-width: 640px) {
  .stats-row { flex-direction:column; }
  .dash-grid { grid-template-columns:1fr; }
}
</style>
