<template>
  <div class="fade-in">
    <router-link to="/gateways" class="back-link">&larr; Back to Gateways</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>

    <div v-else-if="!gw" class="empty-state card">
      <p>Gateway not found.</p>
      <router-link to="/gateways" class="btn btn-secondary">Back to Gateways</router-link>
    </div>

    <template v-else>
      <div class="detail-header">
        <div>
          <h3 class="gw-title">{{ gw.name }}</h3>
          <p class="gw-meta">ID: <code>{{ gw.id }}</code> | API Key: <code>{{ maskedKey }}</code></p>
        </div>
        <span :class="['badge', gw.online ? 'badge-online' : 'badge-offline']">
          {{ gw.online ? 'Online' : 'Offline' }}
        </span>
      </div>

      <!-- Stats cards -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ nodes.length }}</span>
          <span class="stat-label">Total Nodes</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ onlineCount }}</span>
          <span class="stat-label">Online</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ discovered.length }}</span>
          <span class="stat-label">Discovered</span>
        </div>
      </div>

      <!-- Combined nodes table -->
      <div class="card section">
        <div class="section-header">
          <h4>Nodes</h4>
          <button @click="scanAndRefresh" class="btn btn-secondary btn-sm" :disabled="scanning">
            {{ scanning ? 'Scanning…' : 'Scan for Nodes' }}
          </button>
        </div>

        <div v-if="combined.length === 0" class="state-msg">
          No nodes found. Click "Scan for Nodes" to discover nearby devices.
        </div>

        <table v-else class="node-table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>API Key</th>
              <th>Value</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in combined" :key="item.deviceId">
              <td><code>{{ item.deviceId }}</code></td>
              <td><code class="api-key">{{ item.apiKey ? maskedAPIKey(item.apiKey) : '—' }}</code></td>
              <td>{{ item.value != null ? item.value : '—' }}</td>
              <td>
                <span :class="['badge', badgeClass(item)]">
                  {{ badgeLabel(item) }}
                </span>
              </td>
              <td>{{ item.lastSeen ? relTime(item.lastSeen) : '—' }}</td>
              <td class="action-cell">
                <button v-if="item.linked && !item.inDiscovery" @click="confirmDisconnect(item)" class="btn btn-danger btn-sm">Disconnect</button>
                <button v-else @click="confirmLink(item)" class="btn btn-primary btn-sm">Connect</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Link confirmation modal -->
    <div v-if="showLinkModal" class="modal-overlay" @click.self="showLinkModal = false">
      <div class="modal">
        <h4>Link Node</h4>
        <p>Link device <code>{{ linkTarget?.deviceId }}</code> to gateway <strong>{{ gw?.name }}</strong>?</p>
        <p class="modal-note">The node will be provisioned and will appear in the nodes list once it reports in.</p>
        <div class="modal-actions">
          <button @click="showLinkModal = false" class="btn btn-secondary" :disabled="linking">Cancel</button>
          <button @click="doLink" class="btn btn-primary" :disabled="linking">{{ linking ? 'Linking…' : 'Confirm Link' }}</button>
        </div>
        <p v-if="linkConflict" class="modal-error">{{ linkConflict }}</p>
      </div>
    </div>

    <!-- Disconnect confirmation modal -->
    <div v-if="showDisconnectModal" class="modal-overlay" @click.self="showDisconnectModal = false">
      <div class="modal">
        <h4>Disconnect Node</h4>
        <p>Disconnect device <code>{{ disconnectTarget?.deviceId }}</code> from gateway <strong>{{ gw?.name }}</strong>?</p>
        <p class="modal-note">The node will be reset and start broadcasting for re-provisioning.</p>
        <div class="modal-actions">
          <button @click="showDisconnectModal = false" class="btn btn-secondary" :disabled="disconnecting">Cancel</button>
          <button @click="doDisconnect" class="btn btn-danger" :disabled="disconnecting">{{ disconnecting ? 'Disconnecting…' : 'Confirm Disconnect' }}</button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="toast-container">
      <div v-for="(toast, i) in toasts" :key="i" :class="['toast', 'toast-' + toast.type]" @click="toasts.splice(i, 1)">
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'

const route = useRoute()
const store = useGatewayStore()

const gw = computed(() => store.currentGateway)
const loading = computed(() => store.loading)

const nodes = ref([])
const discovered = ref([])
const scanning = ref(false)

// Link modal
const showLinkModal = ref(false)
const linkTarget = ref(null)
const linking = ref(false)
const linkConflict = ref('')

// Disconnect modal
const showDisconnectModal = ref(false)
const disconnectTarget = ref(null)
const disconnecting = ref(false)

// Toasts
const toasts = ref([])

const maskedKey = computed(() => {
  if (!gw.value?.apiKey) return '—'
  const k = gw.value.apiKey
  return k.length > 8 ? k.slice(0, 4) + '…' + k.slice(-4) : k
})

const onlineCount = computed(() => nodes.value.filter(n => n.isOnline).length)

const combined = computed(() => {
  const linkedIds = new Set(nodes.value.map(n => n.deviceId))
  const discSet = new Set(discovered.value)
  const linked = nodes.value.map(n => ({
    ...n,
    linked: true,
    inDiscovery: discSet.has(n.deviceId),
  }))
  const unlinked = discovered.value
    .filter(d => !linkedIds.has(d))
    .map(d => ({ deviceId: d, linked: false, inDiscovery: true, value: null, isOnline: null, lastSeen: null }))
  return [...linked, ...unlinked]
})

function badgeClass(item) {
  if (item.isOnline === true) return 'badge-online'
  if (item.isOnline === false) return 'badge-offline'
  return 'badge-discovered'
}

function badgeLabel(item) {
  if (item.isOnline === true) return 'Online'
  if (item.isOnline === false) return 'Offline'
  return 'Discovered'
}

function maskedAPIKey(key) {
  return key.length > 8 ? key.slice(0, 8) + '…' + key.slice(-4) : key
}

function relTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  if (d.getFullYear() < 1970) return 'Never'
  const ms = Date.now() - d.getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 5) return 'just now'
  if (sec < 60) return sec + ' seconds ago'
  const min = Math.floor(sec / 60)
  if (min === 1) return '1 minute ago'
  if (min < 60) return min + ' minutes ago'
  const hr = Math.floor(min / 60)
  if (hr === 1) return '1 hour ago'
  if (hr < 24) return hr + ' hours ' + (min % 60) + ' minutes ago'
  const days = Math.floor(hr / 24)
  if (days === 1) return '1 day ago'
  return days + ' days ago'
}

function addToast(message, type = 'success') {
  toasts.value.push({ message, type })
  setTimeout(() => {
    toasts.value.shift()
  }, 4000)
}

async function fetchData() {
  await store.fetchOne(route.params.id)
  nodes.value = await store.fetchNodes(route.params.id)
  try {
    const { data } = await api.get(`/gateways/${route.params.id}/discovered`)
    discovered.value = Array.isArray(data) ? data : []
  } catch {
    discovered.value = []
  }
}

async function scanAndRefresh() {
  scanning.value = true
  try {
    await api.post(`/gateways/${route.params.id}/scan`)
    await new Promise(r => setTimeout(r, 3000))
    const { data } = await api.get(`/gateways/${route.params.id}/discovered`)
    discovered.value = Array.isArray(data) ? data : []
    addToast('Scan complete')
  } catch (e) {
    addToast('Scan failed: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    scanning.value = false
  }
}

function confirmLink(item) {
  linkTarget.value = item
  linkConflict.value = ''
  showLinkModal.value = true
}

async function doLink() {
  linking.value = true
  const deviceId = linkTarget.value.deviceId
  const force = !!linkConflict.value
  try {
    const { data } = await store.provisionNode(route.params.id, deviceId, force)
    addToast(`Node ${deviceId} linked successfully`)
    showLinkModal.value = false
    await fetchData()
  } catch (e) {
    const errData = e.response?.data
    if (errData?.status === 'gateway_conflict') {
      linkConflict.value = errData.message || 'This node is linked to another gateway.'
    } else {
      addToast('Failed to link: ' + (errData?.error || e.message), 'error')
      showLinkModal.value = false
    }
  } finally {
    linking.value = false
  }
}

function confirmDisconnect(item) {
  disconnectTarget.value = item
  showDisconnectModal.value = true
}

async function doDisconnect() {
  disconnecting.value = true
  const deviceId = disconnectTarget.value.deviceId
  try {
    await api.delete(`/gateways/${route.params.id}/nodes/${deviceId}`)
    addToast(`Node ${deviceId} disconnected`)
    showDisconnectModal.value = false
    await fetchData()
  } catch (e) {
    addToast('Failed to disconnect: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    disconnecting.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.back-link {
  display: inline-block;
  color: #0969da;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.back-link:hover {
  text-decoration: underline;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.gw-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.gw-meta {
  color: #656d76;
  font-size: 0.8rem;
}
.gw-meta code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* Stats cards */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2328;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #656d76;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
}

/* Section */
.section {
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0;
}

/* Nodes table */
.node-table {
  width: 100%;
  border-collapse: collapse;
}

.node-table th {
  text-align: left;
  padding: 0.5rem;
  font-size: 0.7rem;
  color: #656d76;
  text-transform: uppercase;
  border-bottom: 1px solid #d0d7de;
}

.node-table td {
  padding: 0.5rem;
  border-top: 1px solid #f3f4f6;
  font-size: 0.85rem;
}

.node-table code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.api-key {
  font-size: 0.7rem;
  letter-spacing: -0.3px;
}

.action-cell {
  white-space: nowrap;
}

.btn-sm {
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  width: auto;
}

.state-msg, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #656d76;
}

.state-msg a {
  color: #0969da;
}

/* Badge variants */
.badge-discovered {
  background: #ddf4ff;
  color: #0550ae;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 10px;
  padding: 1.5rem;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}

.modal h4 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.modal p {
  font-size: 0.85rem;
  color: #1f2328;
  margin-bottom: 0.5rem;
}

.modal code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.modal-note {
  color: #656d76 !important;
  font-size: 0.8rem !important;
}

.modal-error {
  color: #cf222e !important;
  font-size: 0.8rem !important;
  margin-top: 0.75rem !important;
  padding: 0.5rem;
  background: #ffebe9;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

/* Toasts */
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 2000;
}

.toast {
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  animation: slide-in 0.3s ease;
  max-width: 360px;
}

.toast-success {
  background: #dafbe1;
  color: #116329;
  border: 1px solid #b3f0c6;
}

.toast-error {
  background: #ffebe9;
  color: #cf222e;
  border: 1px solid #ffc1bb;
}

@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr; }
  .toast-container { left: 1rem; right: 1rem; bottom: 1rem; }
  .toast { max-width: 100%; }
}
</style>
