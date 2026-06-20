<template>
  <div class="fade-in">
    <router-link to="/gateways" class="back-link">&larr; Back to Gateways</router-link>

    <div v-if="initialLoading" class="state-msg">Loading…</div>

    <div v-else-if="!gw" class="empty-state card">
      <p>Gateway not found.</p>
      <router-link to="/gateways" class="btn btn-secondary">Back to Gateways</router-link>
    </div>

    <template v-else>
      <div class="detail-header">
        <div>
          <h3 class="gw-title">{{ gw.name }}</h3>
          <p class="gw-meta">
            ID: <code>{{ gw.id }}</code> |
            API Key: <code>{{ maskedKey }}</code> |
            Last Seen: {{ gw.lastSeen ? relTime(gw.lastSeen) : 'Never' }}
          </p>
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

      <!-- Settings link -->
      <div class="card section settings-card" @click="$router.push('/gateways/' + gw.id + '/settings')">
        <div class="section-header">
          <h4>Settings</h4>
          <span class="chevron">&rsaquo;</span>
        </div>
        <p class="settings-desc">WiFi, device configuration, and more.</p>
      </div>

      <!-- Combined nodes table -->
      <div class="card section">
        <div class="section-header">
          <h4>Nodes</h4>
          <button @click="scanAndRefresh" class="btn btn-secondary btn-sm" :disabled="scanning">
            {{ scanning ? 'Scanning…' : 'Scan for Nodes' }}
          </button>
        </div>

        <div v-if="pollError" class="poll-error">{{ pollError }}</div>

        <table class="node-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Node ID</th>
              <th>Device ID</th>
              <th>API Key</th>
              <th>Value</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody v-if="combined.length > 0">
            <tr v-for="item in combined" :key="item.deviceId"
                :class="{ 'clickable': item.linked && item.nodeId }"
                @click="item.linked && item.nodeId ? $router.push('/nodes/' + item.nodeId) : null">
              <td>{{ item.name || '—' }}</td>
              <td><code>{{ item.nodeId || '—' }}</code></td>
              <td><code>{{ item.deviceId }}</code></td>
              <td><code class="api-key">{{ item.apiKey ? maskedAPIKey(item.apiKey) : item.provisioning ? 'provisioning…' : '—' }}</code></td>
              <td>{{ item.value != null ? item.value : (item.provisioning ? 'awaiting first report' : '—') }}</td>
              <td>
                <span :class="['badge', badgeClass(item)]">
                  {{ badgeLabel(item) }}
                </span>
              </td>
              <td>{{ item.lastSeen ? relTime(item.lastSeen) : (item.provisioning ? 'waiting…' : '—') }}</td>
              <td class="action-cell" @click.stop>
                <button v-if="item.provisioning" class="btn btn-secondary btn-sm" disabled>Provisioning…</button>
                <button v-else-if="item.linked && !item.inDiscovery" @click="confirmDisconnect(item)" class="btn btn-danger btn-sm">Disconnect</button>
                <button v-else @click="confirmLink(item)" class="btn btn-primary btn-sm">Connect</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="combined.length === 0 && !scanning" class="state-msg" style="padding:1rem">
          No nodes linked yet. Scan for nearby devices.
        </div>
      </div>
    </template>

    <!-- Link / Provision modal -->
    <div v-if="showLinkModal" class="modal-overlay" @click.self="showLinkModal = false">
      <div class="modal modal-wide">
        <h4>Provision Node</h4>
        <p>Configure device <code>{{ linkTarget?.deviceId }}</code> for gateway <strong>{{ gw?.name }}</strong>.</p>

        <div class="prov-form">
          <div class="form-group">
            <label for="node-name">Node Name</label>
            <input id="node-name" v-model="provName" placeholder="e.g. Living Room Sensor" />
          </div>

          <div class="form-group">
            <label>Capabilities</label>
            <div v-for="(cap, i) in provCaps" :key="i" class="cap-row">
              <select v-model="cap.type" class="cap-type-select">
                <option value="digitalOutput">Digital Output</option>
                <option value="analogOutput">Analog Output</option>
                <option value="analogInput">Analog Input</option>
                <option value="digitalInput">Digital Input</option>
                <option value="relay">Relay</option>
                <option value="i2c">I2C</option>
                <option value="uart">UART</option>
              </select>
              <input v-if="cap.type !== 'i2c' && cap.type !== 'uart'" v-model.number="cap.pin" type="number" class="cap-pin" placeholder="Pin" />
              <input v-if="cap.type === 'i2c'" v-model.number="cap.extra" type="number" class="cap-pin" placeholder="Addr (hex)" />
              <input v-if="cap.type === 'uart'" v-model.number="cap.extra" type="number" class="cap-pin" placeholder="UART #" />
              <input v-model="cap.label" class="cap-label" placeholder="Label" />
              <button @click="provCaps.splice(i, 1)" class="btn btn-danger btn-sm">&times;</button>
            </div>
            <button @click="addCap" class="btn btn-secondary btn-sm">+ Add Capability</button>
          </div>
        </div>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const store = useGatewayStore()

const gw = computed(() => store.currentGateway)
const initialLoading = ref(true)

const nodes = ref([])
const discovered = ref([])
const scanning = ref(false)
const pollError = ref('')

// Track provisioning device IDs
const provisioningIds = ref(new Set())

// Link / Provision modal
const showLinkModal = ref(false)
const linkTarget = ref(null)
const linking = ref(false)
const linkConflict = ref('')
const provName = ref('')
const provCaps = ref([])

// Disconnect modal
const showDisconnectModal = ref(false)
const disconnectTarget = ref(null)
const disconnecting = ref(false)

// Toasts
const toasts = ref([])

// Track gateway online state changes for notifications
const prevOnline = ref(null)

let pollTimer = null

const maskedKey = computed(() => {
  if (!gw.value?.apiKey) return '—'
  const k = gw.value.apiKey
  return k.length > 8 ? k.slice(0, 4) + '…' + k.slice(-4) : k
})

const onlineCount = computed(() => nodes.value.filter(n => n.isOnline).length)

const combined = computed(() => {
  const linkedIds = new Set(nodes.value.map(n => n.deviceId))
  const discSet = new Set(discovered.value.map(d => typeof d === 'number' ? d : d.deviceId))

  const linked = nodes.value.map(n => ({
    ...n,
    name: n.name || '',
    linked: true,
    inDiscovery: discSet.has(n.deviceId),
    provisioning: provisioningIds.value.has(n.deviceId),
  }))

  const unlinked = discovered.value
    .filter(d => {
      const did = typeof d === 'number' ? d : d.deviceId
      return !linkedIds.has(did) && !provisioningIds.value.has(did)
    })
    .map(d => {
      const did = typeof d === 'number' ? d : d.deviceId
      return { deviceId: did, linked: false, inDiscovery: true, value: null, isOnline: null, lastSeen: null, nodeId: null }
    })

  // Add pending provisioning items
  const pending = []
  provisioningIds.value.forEach(did => {
    if (!linkedIds.has(did) && !unlinked.find(u => u.deviceId === did)) {
      pending.push({ deviceId: did, linked: false, inDiscovery: false, value: null, isOnline: null, lastSeen: null, nodeId: null, provisioning: true })
    }
  })

  return [...linked, ...unlinked, ...pending]
})

function badgeClass(item) {
  if (item.provisioning) return 'badge-provisioning'
  if (item.isOnline === true) return 'badge-online'
  if (item.isOnline === false) return 'badge-offline'
  return 'badge-discovered'
}

function badgeLabel(item) {
  if (item.provisioning) return 'Provisioning'
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
  await fetchNodes()
  await fetchDiscovered()
  initialLoading.value = false
}

async function fetchGateway() {
  await store.fetchOne(route.params.id)
  // Check for gateway online/offline transitions
  const current = gw.value?.online
  if (prevOnline.value !== null && current !== undefined && current !== prevOnline.value) {
    if (current) {
      addToast(`Gateway ${gw.value.name} is now online`, 'success')
    } else {
      addToast(`Gateway ${gw.value.name} went offline`, 'error')
    }
  }
  prevOnline.value = current
}

async function fetchNodes() {
  try {
    nodes.value = await store.fetchNodes(route.params.id)
    // Remove provisioned nodes from pending set once they appear in linked list
    const linkedIds = new Set(nodes.value.map(n => n.deviceId))
    for (const did of linkedIds) {
      provisioningIds.value.delete(did)
    }
    pollError.value = ''
  } catch (e) {
    pollError.value = 'Failed to fetch nodes'
  }
}

async function fetchDiscovered() {
  try {
    const { data } = await api.get(`/gateways/${route.params.id}/discovered`)
    discovered.value = Array.isArray(data) ? data : []
  } catch {
    // ignore
  }
}

async function scanAndRefresh() {
  scanning.value = true
  try {
    await api.post(`/gateways/${route.params.id}/scan`)
    await new Promise(r => setTimeout(r, 3000))
    await fetchDiscovered()
    addToast('Scan complete')
  } catch (e) {
    addToast('Scan failed: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    scanning.value = false
  }
}

function defaultPinForType(type) {
  const pins = { digitalOutput: 2, analogOutput: 26, analogInput: 34, digitalInput: 35, relay: 32, i2c: 0, uart: 0 }
  return pins[type] ?? 0
}

function addCap() {
  provCaps.value.push({ type: 'digitalOutput', pin: 2, extra: 0, label: '' })
}

function confirmLink(item) {
  linkTarget.value = item
  linkConflict.value = ''
  provName.value = ''
  provCaps.value = [{ type: 'digitalOutput', pin: 2, extra: 0, label: '' }]
  showLinkModal.value = true
}

async function doLink() {
  linking.value = true
  const deviceId = linkTarget.value.deviceId
  const force = !!linkConflict.value
  provisioningIds.value.add(deviceId)
  try {
    const caps = provCaps.value.map(c => ({
      type: c.type,
      pin: c.type !== 'i2c' && c.type !== 'uart' ? (Number(c.pin) || 0) : 0,
      extra: ['i2c', 'uart'].includes(c.type) ? (Number(c.extra) || 0) : 0,
      label: c.label || '',
    }))
    await store.provisionNode(route.params.id, deviceId, force, provName.value, caps)
    addToast(`Node ${deviceId} linking in progress`)
    showLinkModal.value = false
  } catch (e) {
    provisioningIds.value.delete(deviceId)
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

function startPolling() {
  pollTimer = setInterval(async () => {
    await Promise.all([fetchGateway(), fetchNodes(), fetchDiscovered()])
  }, 5000)
}

onMounted(() => {
  fetchData()
  startPolling()
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
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

.poll-error {
  background: #ffebe9;
  color: #cf222e;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}

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

.node-table tr.clickable {
  cursor: pointer;
}

.node-table tr.clickable:hover {
  background: #f6f8fa;
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

.badge-discovered {
  background: #ddf4ff;
  color: #0550ae;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-provisioning {
  background: #fff8c5;
  color: #7a5e00;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

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

.modal-wide {
  width: 560px;
}

.prov-form .form-group {
  margin-bottom: 1rem;
}

.prov-form label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #1f2328;
}

.prov-form input,
.prov-form select {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 0.85rem;
  box-sizing: border-box;
}

.cap-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.4rem;
}

.cap-type-select {
  flex: 2;
  min-width: 0;
}

.cap-pin {
  flex: 1;
  min-width: 0;
}

.cap-label {
  flex: 2;
  min-width: 0;
}

.cap-row .btn-sm {
  flex-shrink: 0;
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

.settings-card {
  cursor: pointer;
  transition: border-color 0.15s;
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}
.settings-card:hover {
  border-color: #0969da;
}
.settings-card .section-header {
  margin-bottom: 0.25rem;
}
.chevron {
  font-size: 1.5rem;
  color: #656d76;
  line-height: 1;
}
.settings-desc {
  color: #656d76;
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr; }
  .toast-container { left: 1rem; right: 1rem; bottom: 1rem; }
  .toast { max-width: 100%; }
}
</style>
