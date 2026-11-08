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
          <tr v-for="gw in store.gateways" :key="gw.id" class="clickable" @click="$router.push(`/gateways/${gw.id}`)">
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
            <td @click.stop>
              <button class="btn btn-danger btn-sm" @click="remove(gw)">Delete</button>
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
          <button class="btn btn-danger btn-sm gw-mobile-del" @click="remove(gw)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Nodes left behind by a deleted gateway -->
    <div v-if="unassigned.length" class="card un-card">
      <h4>Unassigned nodes</h4>
      <p class="un-hint">These nodes belonged to a deleted gateway. They were not reset and still work with their saved settings. Give each one to a gateway (it must be in range of that gateway).</p>
      <div v-for="n in unassigned" :key="n.id" class="un-row">
        <div class="un-info">
          <strong>{{ n.name || 'Node ' + n.deviceId }}</strong>
          <span class="un-sub">Device {{ n.deviceId }}<template v-if="n.mac"> · {{ n.mac }}</template> · {{ n.modules }} module{{ n.modules === 1 ? '' : 's' }}<template v-if="n.fromGateway"> · from {{ n.fromGateway }}</template></span>
        </div>
        <select v-model="assignTo[n.id]" class="un-select">
          <option value="" disabled>Choose a gateway</option>
          <option v-for="g in store.gateways" :key="g.id" :value="g.id">{{ g.name }}{{ g.online ? '' : ' (offline)' }}</option>
        </select>
        <button class="btn btn-primary btn-sm" :disabled="!assignTo[n.id] || busyId === n.id" @click="assign(n)">{{ busyId === n.id ? 'Sending…' : 'Assign' }}</button>
        <button class="btn btn-secondary btn-sm" :disabled="busyId === n.id" @click="forget(n)">Forget</button>
      </div>
      <p v-if="msg" :class="msgOk ? 'un-ok' : 'un-err'">{{ msg }}</p>
    </div>
  </div>

  <!-- Delete confirmation modal -->
  <div v-if="deleteTarget" class="modal-overlay">
    <div class="modal">
      <h4>Delete Gateway</h4>
      <p>Delete gateway <strong>{{ deleteTargetName }}</strong>?</p>
      <p class="modal-note">The gateway is removed together with its displays, rules and saved Wi-Fi networks.</p>
      <p class="modal-note">Nodes that are online are unpaired so any gateway can discover them. Nodes that cannot be reached are kept as unassigned nodes.</p>
      <div class="form-group">
        <label for="del-pw">Your password</label>
        <PasswordInput id="del-pw" v-model="deletePw" autocomplete="current-password" @keyup.enter="deletePw && doDelete()" />
      </div>
      <p v-if="deleteErr" class="un-err">{{ deleteErr }}</p>
      <div class="modal-actions">
        <button @click="deleteTarget = null" class="btn btn-secondary" :disabled="deleting">Cancel</button>
        <button @click="doDelete" class="btn btn-danger" :disabled="deleting || !deletePw">{{ deleting ? 'Deleting…' : 'Delete' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'
import { confirmDialog } from '../services/dialog'

const store = useGatewayStore()
const loading = computed(() => store.loading)
const deleteTarget = ref(null)
const deleteTargetName = ref('')
const deleting = ref(false)
const deletePw = ref('')
const deleteErr = ref('')
const unassigned = ref([])
const assignTo = ref({})
const busyId = ref(null)
const msg = ref('')
const msgOk = ref(true)

async function loadUnassigned() {
  try { unassigned.value = (await api.get('/nodes/unassigned')).data || [] } catch { unassigned.value = [] }
}

async function assign(n) {
  busyId.value = n.id
  msg.value = ''
  try {
    const { data } = await api.post(`/nodes/unassigned/${n.id}/assign`, { gatewayId: assignTo.value[n.id] })
    msgOk.value = true
    msg.value = data.message || 'Sent.'
    setTimeout(loadUnassigned, 4000)
  } catch (e) {
    msgOk.value = false
    msg.value = e.response?.data?.error || 'Could not assign the node'
  } finally { busyId.value = null }
}

async function forget(n) {
  const ok = await confirmDialog({
    title: 'Forget this node?',
    message: 'The saved settings are removed from the hub. The node keeps its own, and can still be paired again with its pairing code.',
    confirmText: 'Forget',
  })
  if (!ok) return
  await api.delete(`/nodes/unassigned/${n.id}`)
  loadUnassigned()
}

function remove(gw) {
  deletePw.value = ''
  deleteErr.value = ''
  deleteTargetName.value = gw.name
  deleteTarget.value = gw.id
}

async function doDelete() {
  deleting.value = true
  try {
    await store.remove(deleteTarget.value, deletePw.value)
    deleteTarget.value = null
    loadUnassigned()
  } catch (e) {
    deleteErr.value = e.response?.data?.error || 'Could not delete the gateway'
  } finally {
    deleting.value = false
  }
}

onMounted(() => { store.fetchAll(); loadUnassigned() })
</script>

<style scoped>
.un-card { margin-top: 1.25rem; padding: 1.25rem; }
.un-card h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; }
.un-hint { font-size: 0.82rem; color: var(--c-muted); margin-bottom: 12px; }
.un-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--c-border); }
.un-info { flex: 1 1 220px; display: flex; flex-direction: column; min-width: 0; }
.un-sub { font-size: 0.78rem; color: var(--c-muted); }
.un-select { min-width: 180px; }
.un-ok { color: var(--c-ok-text); font-size: 0.85rem; margin-top: 8px; }
.un-err { color: var(--c-danger); font-size: 0.85rem; margin-top: 8px; }
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

.gw-table-wrap {
  overflow:hidden;
}

.gw-table {
  width:100%;
  border-collapse:collapse;
}

.gw-table th {
  text-align:left;
  padding:0.75rem 1rem;
  background:var(--c-bg);
  font-size:0.75rem;
  color:var(--c-muted);
  text-transform:uppercase;
  letter-spacing:0.5px;
  border-bottom:1px solid var(--c-border);
}

.gw-table tr.clickable { cursor:pointer; }
.gw-table tr.clickable:hover td { background:var(--surface-2, rgba(128,128,128,.08)); }
.gw-table td {
  padding:0.75rem 1rem;
  border-top:1px solid var(--c-surface-2);
  font-size:0.9rem;
}

.gw-name {
  color:var(--c-accent);
  font-weight:600;
}

.gw-name:hover {
  text-decoration:underline;
}

code {
  background:var(--c-surface-2);
  padding:0.15rem 0.4rem;
  border-radius:4px;
  font-size:0.8rem;
}

.btn-sm {
  padding:0.3rem 0.75rem;
  font-size:0.8rem;
}

.state-msg, .empty-state {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
}

.empty-state p {
  margin-bottom:1rem;
}

.gw-cards {
  display:none;
}







@media (max-width: 640px) {
  .gw-table { display:none; }
  .gw-cards { display:flex; flex-direction:column; gap:0.5rem; padding:0.75rem; }

  .gw-mobile-card {
    display:flex;
    align-items:center;
    background:var(--c-surface-2);
    border:1px solid var(--c-border);
    border-radius:8px;
    overflow:hidden;
  }

  .gw-mobile-link {
    flex:1;
    display:block;
    padding:0.75rem;
    text-decoration:none;
    color:inherit;
  }

  .gw-mobile-top {
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:0.35rem;
  }

  .gw-mobile-top strong {
    font-size:0.9rem;
    color:var(--c-accent);
  }

  .gw-mobile-meta {
    display:flex;
    gap:0.75rem;
    font-size:0.78rem;
    color:var(--c-muted);
  }

  .gw-mobile-meta code {
    font-size:0.7rem;
  }

  .gw-mobile-del {
    margin-right:0.5rem;
    flex-shrink:0;
  }
}
</style>
