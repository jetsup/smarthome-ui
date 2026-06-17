<template>
  <div class="dash fade-in">
    <div class="stats-row">
      <div class="stat-card card">
        <span class="stat-num">{{ gateways.length }}</span>
        <span class="stat-label">Gateways</span>
      </div>
      <div class="stat-card card">
        <span class="stat-num">{{ totalNodes }}</span>
        <span class="stat-label">Nodes</span>
      </div>
      <div class="stat-card card">
        <span class="stat-num">{{ onlineCount }}</span>
        <span class="stat-label">Online</span>
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
          <span>{{ gw.nodeCount || 0 }} nodes</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useGatewayStore } from '../stores/gateways'

const store = useGatewayStore()

const gateways = computed(() => store.gateways)
const loading = computed(() => store.loading)
const totalNodes = computed(() => store.gateways.reduce((s, g) => s + (g.nodeCount || 0), 0))
const onlineCount = computed(() => store.gateways.filter((g) => g.online).length)

onMounted(() => store.fetchAll())
</script>

<style scoped>
.dash {
  max-width: 1000px;
}

.stats-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  flex: 1;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.stat-num {
  font-size: 2rem;
  font-weight: 800;
  color: #0969da;
}

.stat-label {
  color: #656d76;
  font-size: 0.85rem;
  margin-top: 0.15rem;
}

.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.gateway-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.gw-card {
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s;
}

.gw-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.gw-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.gw-card-top h4 {
  font-size: 1rem;
  font-weight: 700;
}

.gw-card-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #656d76;
}

.gw-card-meta code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.state-msg, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #656d76;
}

.empty-state p {
  margin-bottom: 1rem;
}
</style>
