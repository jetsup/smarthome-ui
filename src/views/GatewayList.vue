<template>
  <div class="fade-in">
    <div class="list-header">
      <h3 class="section-title">All Gateways</h3>
      <router-link to="/gateways/create" class="btn btn-primary">+ New Gateway</router-link>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>

    <div v-else-if="store.gateways.length === 0" class="empty-state card">
      <p>No gateways registered.</p>
      <router-link to="/gateways/create" class="btn btn-primary">Create Gateway</router-link>
    </div>

    <div v-else class="gw-table-wrap card">
      <table class="gw-table">
        <thead>
          <tr><th>Name</th><th>ID</th><th>Nodes</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="gw in store.gateways" :key="gw.id">
            <td>
              <router-link :to="`/gateways/${gw.id}`" class="gw-name">{{ gw.name }}</router-link>
            </td>
            <td><code>{{ gw.id }}</code></td>
            <td>{{ gw.nodeCount || 0 }}</td>
            <td>
              <span :class="['badge', gw.online ? 'badge-online' : 'badge-offline']">
                {{ gw.online ? 'Online' : 'Offline' }}
              </span>
            </td>
            <td>
              <button class="btn btn-danger btn-sm" @click="remove(gw.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile card list -->
      <div class="gw-cards">
        <div v-for="gw in store.gateways" :key="gw.id" class="gw-mobile-card">
          <router-link :to="`/gateways/${gw.id}`" class="gw-mobile-link">
            <div class="gw-mobile-top">
              <strong>{{ gw.name }}</strong>
              <span :class="['badge', gw.online ? 'badge-online' : 'badge-offline']">
                {{ gw.online ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="gw-mobile-meta">
              <code>{{ gw.id }}</code>
              <span>{{ gw.nodeCount || 0 }} nodes</span>
            </div>
          </router-link>
          <button class="btn btn-danger btn-sm gw-mobile-del" @click="remove(gw.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useGatewayStore } from '../stores/gateways'

const store = useGatewayStore()
const loading = computed(() => store.loading)

function remove(id) {
  if (confirm('Delete this gateway? This cannot be undone.')) {
    store.remove(id)
  }
}

onMounted(() => store.fetchAll())
</script>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.gw-table-wrap {
  overflow: hidden;
}

.gw-table {
  width: 100%;
  border-collapse: collapse;
}

.gw-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  background: #f6f8fa;
  font-size: 0.75rem;
  color: #656d76;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #d0d7de;
}

.gw-table td {
  padding: 0.75rem 1rem;
  border-top: 1px solid #f3f4f6;
  font-size: 0.9rem;
}

.gw-name {
  color: #0969da;
  font-weight: 600;
}

.gw-name:hover {
  text-decoration: underline;
}

code {
  background: #f3f4f6;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.btn-sm {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
}

.state-msg, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #656d76;
}

.empty-state p {
  margin-bottom: 1rem;
}

.gw-cards {
  display: none;
}

@media (max-width: 640px) {
  .gw-table { display: none; }
  .gw-cards { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; }

  .gw-mobile-card {
    display: flex;
    align-items: center;
    background: #fafafa;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    overflow: hidden;
  }

  .gw-mobile-link {
    flex: 1;
    display: block;
    padding: 0.75rem;
    text-decoration: none;
    color: inherit;
  }

  .gw-mobile-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.35rem;
  }

  .gw-mobile-top strong {
    font-size: 0.9rem;
    color: #0969da;
  }

  .gw-mobile-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.78rem;
    color: #656d76;
  }

  .gw-mobile-meta code {
    font-size: 0.7rem;
  }

  .gw-mobile-del {
    margin-right: 0.5rem;
    flex-shrink: 0;
  }
}
</style>
