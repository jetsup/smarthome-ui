<template>
  <div class="fade-in">
    <div class="list-header">
      <h3 class="section-title">Pending Actions</h3>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>

    <div v-else-if="actions.length === 0" class="empty-state card">
      <p>No pending actions.</p>
    </div>

    <div v-else class="table-wrap card">
      <table class="action-table">
        <thead>
          <tr><th>Action</th><th>Gateway</th><th>Created</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="a in actions" :key="a.id">
            <td>{{ actionLabel(a.action) }}</td>
            <td>
              <router-link v-if="a.gatewayId" :to="`/gateways/${a.gatewayId}`" class="gw-link">{{ a.gatewayName || a.gatewayId }}</router-link>
              <span v-else>{{ a.targetId }}</span>
            </td>
            <td class="cell-muted">{{ formatDate(a.createdAt) }}</td>
            <td>
              <span :class="['badge', statusClass(a.status)]">{{ a.status }}</span>
            </td>
            <td>
              <button v-if="a.status === 'pending'" class="btn btn-danger btn-sm" @click="dismiss(a)">Dismiss</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="mobile-cards">
        <div v-for="a in actions" :key="a.id" class="mobile-card">
          <div class="mobile-card-row">
            <strong>{{ actionLabel(a.action) }}</strong>
            <span :class="['badge', statusClass(a.status)]">{{ a.status }}</span>
          </div>
          <div class="mobile-card-row cell-muted">
            <span v-if="a.gatewayName">{{ a.gatewayName }} — </span>
            <code>{{ a.targetId }}</code>
          </div>
          <div class="mobile-card-row cell-muted">{{ formatDate(a.createdAt) }}</div>
          <button v-if="a.status === 'pending'" class="btn btn-danger btn-sm" @click="dismiss(a)">Dismiss</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import { confirmDialog, notify } from '../services/dialog'

const actions = ref([])
const loading = ref(true)

function actionLabel(action) {
  const labels = { delete_gateway: 'Delete Gateway' }
  return labels[action] || action
}

function statusClass(s) {
  return s === 'pending' ? 'badge-warning' : s === 'completed' ? 'badge-online' : 'badge-offline'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

async function dismiss(a) {
  try {
    await api.delete(`/pending-actions/${a.id}`)
    actions.value = actions.value.filter(x => x.id !== a.id)
  } catch (e) {
    notify('Failed to dismiss: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function fetchActions() {
  loading.value = true
  try {
    const res = await api.get('/pending-actions')
    actions.value = res.data
  } catch (e) {
    console.error('Failed to fetch pending actions', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchActions)
</script>

<style scoped>
.list-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:1.25rem;
}

.section-title {
  font-size:1.05rem;
  font-weight:700;
}

.table-wrap {
  overflow:hidden;
}

.action-table {
  width:100%;
  border-collapse:collapse;
}

.action-table th {
  text-align:left;
  padding:0.75rem 1rem;
  background:var(--c-bg);
  font-size:0.75rem;
  color:var(--c-muted);
  text-transform:uppercase;
  letter-spacing:0.5px;
  border-bottom:1px solid var(--c-border);
}

.action-table td {
  padding:0.75rem 1rem;
  border-top:1px solid var(--c-surface-2);
  font-size:0.9rem;
}

.gw-link {
  color:var(--c-accent);
  font-weight:600;
}

.gw-link:hover {
  text-decoration:underline;
}

.cell-muted {
  color:var(--c-muted);
}

.state-msg, .empty-state {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
}

.empty-state p {
  margin-bottom:1rem;
}

.btn-sm {
  padding:0.3rem 0.75rem;
  font-size:0.8rem;
}

.mobile-cards {
  display:none;
}

code {
  background:var(--c-surface-2);
  padding:0.15rem 0.4rem;
  border-radius:4px;
  font-size:0.8rem;
}

@media (max-width: 640px) {
  .action-table { display:none; }
  .mobile-cards { display:flex; flex-direction:column; gap:0.5rem; padding:0.75rem; }

  .mobile-card {
    display:flex;
    flex-direction:column;
    gap:0.4rem;
    background:var(--c-surface-2);
    border:1px solid var(--c-border);
    border-radius:8px;
    padding:0.75rem;
  }

  .mobile-card-row {
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:0.85rem;
  }

  .mobile-card-row strong {
    font-size:0.9rem;
    color:var(--c-accent);
  }
}
</style>
