<template>
  <div class="fade-in">
    <router-link to="/gateways" class="back-link"><Icon name="arrow-left" /> Back to Gateways</router-link>

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
          <span class="chevron"><Icon name="chevron-right" /></span>
        </div>
        <p class="settings-desc">WiFi, device configuration, and more.</p>
      </div>

      <!-- Pairing code card -->
      <div v-if="pairingCode" class="card section pairing-card">
        <h4>HMI Pairing Code</h4>
        <p class="pairing-desc">Enter this code on the HMI to complete pairing:</p>
        <div class="pairing-code">{{ pairingCode }}</div>
        <p class="pairing-note">This code will be consumed after successful pairing.</p>
      </div>

      <!-- Combined nodes table -->
      <div class="card section" style="margin-bottom:1rem">
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
              <td>
                <span :class="['badge', badgeClass(item)]">
                  {{ badgeLabel(item) }}
                </span>
              </td>
              <td>{{ item.lastSeen ? relTime(item.lastSeen) : (item.provisioning ? 'waiting…' : '—') }}</td>
              <td class="action-cell" @click.stop>
                <button v-if="item.provisioning" class="btn btn-secondary btn-sm" disabled>Provisioning…</button>
                <button v-else-if="item.linked && !item.inDiscovery" @click="confirmDisconnect(item)" class="btn btn-danger btn-sm">Disconnect</button>
                <button v-else-if="item.linked" @click="restoreNode(item)" class="btn btn-primary btn-sm" title="This node was reset. Pair it again with the settings saved here.">Re-pair</button>
                <button v-else @click="confirmLink(item)" class="btn btn-primary btn-sm">Connect</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="combined.length === 0 && !scanning" class="state-msg" style="padding:1rem">
          No nodes linked yet. Scan for nearby devices.
        </div>
      </div>

      <!-- Capability Bindings card -->
      <div class="card section">
        <div class="section-header">
          <h4>Capability Bindings</h4>
          <button @click="openAddBinding" class="btn btn-primary btn-sm">+ Add Binding</button>
        </div>
        <div v-if="bindings.length === 0" class="state-msg" style="padding:1rem">
          No bindings configured. Bindings forward input changes to output capabilities.
        </div>
        <table v-else class="node-table">
          <thead>
            <tr>
              <th>Source (Input)</th>
              <th>Target (Output)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in bindings" :key="b.id">
              <td><code>{{ b.sourceDeviceId }}</code> pin {{ b.sourcePin }}</td>
              <td><code>{{ b.targetDeviceId }}</code> pin {{ b.targetPin }}</td>
              <td><button @click="deleteBinding(b.slug)" class="btn btn-danger btn-sm">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <RulesPanel :gateway-id="route.params.id" :nodes="nodes" />

      <!-- Add Binding modal -->
      <div v-if="showAddBinding" class="modal-overlay">
        <div class="modal">
          <h4>Add Capability Binding</h4>
          <p>When the source input changes, the target output is updated automatically.</p>
          <div class="prov-form">
            <div class="form-group">
              <label for="source-node">Source Node (input)</label>
              <select id="source-node" v-model.number="newBinding.sourceDeviceId" class="cap-type-select">
                <option :value="0" disabled>Select source node…</option>
                <option v-for="n in nodes" :key="n.deviceId" :value="n.deviceId">{{ n.name || 'Device ' + n.deviceId }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="source-cap">Source Capability (input)</label>
              <select id="source-cap" v-model.number="newBinding.sourcePin" class="cap-type-select">
                <option :value="0" disabled>Select input capability…</option>
                <option v-for="cap in sourceCapsList" :key="cap.pin" :value="cap.pin">
                  {{ cap.label || capTypeLabel(cap.type) }} (pin {{ cap.pin }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="target-node">Target Node (output)</label>
              <select id="target-node" v-model.number="newBinding.targetDeviceId" class="cap-type-select">
                <option :value="0" disabled>Select target node…</option>
                <option v-for="n in nodes" :key="n.deviceId" :value="n.deviceId">{{ n.name || 'Device ' + n.deviceId }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="target-cap">Target Capability (output)</label>
              <select id="target-cap" v-model.number="newBinding.targetPin" class="cap-type-select">
                <option :value="0" disabled>Select output capability…</option>
                <option v-for="cap in targetCapsList" :key="cap.pin" :value="cap.pin">
                  {{ cap.label || capTypeLabel(cap.type) }} (pin {{ cap.pin }})
                </option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showAddBinding = false" class="btn btn-secondary">Cancel</button>
            <button @click="doAddBinding" class="btn btn-primary" :disabled="!newBinding.sourceDeviceId || !newBinding.targetDeviceId || newBinding.sourcePin === 0 || newBinding.targetPin === 0">Add Binding</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Link / Provision modal -->
    <div v-if="showLinkModal" class="modal-overlay">
      <div class="modal modal-wide">
        <h4>Provision Node</h4>
        <p>Configure device <code>{{ linkTarget?.deviceId }}</code> for gateway <strong>{{ gw?.name }}</strong>.</p>

        <div class="prov-form">
          <div v-if="linkTarget?.paired" class="form-group">
            <label for="node-code">Pairing code</label>
            <input id="node-code" v-model="provCode" placeholder="8 letters and digits" maxlength="16" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.12em" />
            <p class="modal-note">This node is already paired to a gateway. Enter the code from its Settings page (or its QR code) to move it here.</p>
          </div>

          <div v-if="!linkTarget?.linked" class="form-group">
            <label for="adopt-code">Take over a previous node <small>(optional)</small></label>
            <input id="adopt-code" v-model="adoptCode" placeholder="Pairing code of the node it replaces" maxlength="16" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.12em" />
            <p class="modal-note">Enter the code of an earlier node to copy its name, modules, display and rules to this one. Its modules are used instead of the ones below.</p>
          </div>

          <div class="form-group">
            <label for="node-name">Node Name</label>
            <input id="node-name" v-model="provName" placeholder="e.g. Living Room Sensor" />
          </div>

          <div class="form-group">
            <label>What is wired to this node?</label>
            <CapabilityEditor v-model="provCaps" />
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
    <div v-if="showDisconnectModal" class="modal-overlay">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'
import CapabilityEditor from '../components/CapabilityEditor.vue'
import RulesPanel from '../components/RulesPanel.vue'
import { loadCatalog, blankCap, payload } from '../services/catalog'

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
const provCode = ref('')
const adoptCode = ref('')
const provName = ref('')
const provCaps = ref([])

// Disconnect modal
const showDisconnectModal = ref(false)
const disconnectTarget = ref(null)
const disconnecting = ref(false)

// Toasts
const toasts = ref([])

// Bindings
const bindings = ref([])
const showAddBinding = ref(false)
const newBinding = ref({ sourceDeviceId: 0, sourcePin: 0, targetDeviceId: 0, targetPin: 0 })

const capLabels = {
  'analogInput': 'Analog In',
  'analogOutput': 'Analog Out',
  'digitalInput': 'Digital In',
  'digitalOutput': 'Digital Out',
  'relay': 'Relay',
  'irTx': 'IR TX',
  'irRx': 'IR RX',
  'i2c': 'I2C',
  'uart': 'UART',
}

function capTypeLabel(type) {
  return capLabels[type] || type
}

function parseCapConfig(cfg) {
  if (!cfg) return []
  if (typeof cfg === 'string') {
    try { return JSON.parse(cfg) } catch { return [] }
  }
  if (Array.isArray(cfg)) return cfg
  return []
}

const inputCapTypes = ['digitalInput', 'analogInput']
const outputCapTypes = ['digitalOutput', 'analogOutput', 'relay']

const sourceCapsList = computed(() => {
  const node = nodes.value.find(n => n.deviceId === newBinding.value.sourceDeviceId)
  if (!node) return []
  return parseCapConfig(node.capabilitiesConfig).filter(c => inputCapTypes.includes(c.type))
})

const sourceCapType = computed(() => {
  const cap = sourceCapsList.value.find(c => c.pin === newBinding.value.sourcePin)
  return cap ? cap.type : ''
})

const targetCapsList = computed(() => {
  if (!newBinding.value.sourcePin) return []
  const node = nodes.value.find(n => n.deviceId === newBinding.value.targetDeviceId)
  if (!node) return []
  const allowed = sourceCapType.value === 'analogInput' ? ['analogOutput'] : ['digitalOutput', 'relay']
  return parseCapConfig(node.capabilitiesConfig).filter(c => allowed.includes(c.type))
})

watch(() => newBinding.value.sourceDeviceId, () => {
  newBinding.value.sourcePin = 0
  newBinding.value.targetPin = 0
})

watch(() => newBinding.value.targetDeviceId, () => {
  newBinding.value.targetPin = 0
})

// Pairing code
const pairingCode = ref(null)

async function fetchPairingCode() {
  try {
    const { data } = await api.get(`/pair/code/${route.params.id}`)
    pairingCode.value = data.code || null
  } catch {
    // ignore
  }
}

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
      return { deviceId: did, linked: false, inDiscovery: true, paired: !!d.paired, value: null, isOnline: null, lastSeen: null, nodeId: null }
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

async function fetchBindings() {
  try {
    const { data } = await api.get(`/gateways/${route.params.id}/bindings`)
    bindings.value = Array.isArray(data) ? data : []
  } catch {
    // ignore
  }
}

async function doAddBinding() {
  const nb = newBinding.value
  if (!nb.sourceDeviceId || !nb.targetDeviceId || !nb.sourcePin || !nb.targetPin) return

  const dup = bindings.value.find(b =>
    b.sourceDeviceId === nb.sourceDeviceId &&
    b.sourcePin === nb.sourcePin &&
    b.targetDeviceId === nb.targetDeviceId &&
    b.targetPin === nb.targetPin
  )
  if (dup) {
    addToast('This binding already exists', 'error')
    return
  }

  try {
    await api.post(`/gateways/${route.params.id}/bindings`, {
      sourceDeviceId: nb.sourceDeviceId,
      sourcePin: nb.sourcePin,
      targetDeviceId: nb.targetDeviceId,
      targetPin: nb.targetPin,
    })
    addToast('Binding created')
    showAddBinding.value = false
    newBinding.value = { sourceDeviceId: 0, sourcePin: 0, targetDeviceId: 0, targetPin: 0 }
    await fetchBindings()
  } catch (e) {
    addToast('Failed to create binding: ' + (e.response?.data?.error || e.message), 'error')
  }
}

function openAddBinding() {
  newBinding.value = { sourceDeviceId: 0, sourcePin: 0, targetDeviceId: 0, targetPin: 0 }
  showAddBinding.value = true
}

async function deleteBinding(id) {
  try {
    await api.delete(`/bindings/${id}`)
    addToast('Binding deleted')
    await fetchBindings()
  } catch (e) {
    addToast('Failed to delete binding: ' + (e.response?.data?.error || e.message), 'error')
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

const PIN_OPTIONS = [0,2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33,34,35,36,39]
const ESP32_ADC2 = new Set([0,2,4,12,13,14,15,25,26,27])
const ESP32_INPUT_ONLY = new Set([34,35,36,39])

function pinLabel(pin, type) {
  if (pin === 0) return 'Select pin'
  const hints = []
  if (ESP32_ADC2.has(pin) && (type === 'analogInput' || type === 'analogOutput')) hints.push('ADC2, conflicts with Wi-Fi')
  if (ESP32_INPUT_ONLY.has(pin) && (type === 'digitalOutput' || type === 'analogOutput' || type === 'relay')) hints.push('input only')
  let label = `GPIO ${pin}`
  if (hints.length) label += ` (${hints.join(', ')})`
  return label
}

function usedPins(excludeIndex) {
  const pins = new Set()
  provCaps.value.forEach((cap, i) => {
    if (i !== excludeIndex && cap.pin && cap.type !== 'i2c' && cap.type !== 'uart') {
      pins.add(Number(cap.pin))
    }
  })
  return pins
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
  provCode.value = ''
  adoptCode.value = ''
  provName.value = ''
  provCaps.value = [blankCap()]
  showLinkModal.value = true
}

// A node that was reset or re-flashed: pair it again with what the hub saved.
async function restoreNode(item) {
  provisioningIds.value.add(item.deviceId)
  try {
    await store.provisionNode(route.params.id, item.deviceId, false, '', [], '')
    addToast(`Node ${item.deviceId} is being paired again with its saved settings`)
  } catch (e) {
    provisioningIds.value.delete(item.deviceId)
    addToast('Failed: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function doLink() {
  linking.value = true
  const deviceId = linkTarget.value.deviceId
  provisioningIds.value.add(deviceId)
  try {
    const caps = payload(provCaps.value)
    await store.provisionNode(route.params.id, deviceId, false, provName.value, adoptCode.value.trim() ? [] : caps, provCode.value, adoptCode.value)
    addToast(`Node ${deviceId} linking in progress`)
    showLinkModal.value = false
  } catch (e) {
    provisioningIds.value.delete(deviceId)
    const errData = e.response?.data
    if (errData?.status === 'code_required' || errData?.status === 'code_invalid') {
      linkTarget.value = { ...linkTarget.value, paired: true }
      linkConflict.value = errData.error
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
    await Promise.all([fetchGateway(), fetchNodes(), fetchDiscovered(), fetchBindings(), fetchPairingCode()])
  }, 5000)
}

onMounted(() => {
  fetchData()
  fetchBindings()
  fetchPairingCode()
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
  display:inline-block;
  color:var(--c-accent);
  font-size:0.85rem;
  margin-bottom:1rem;
}
.back-link:hover {
  text-decoration:underline;
}

.detail-header {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  margin-bottom:1.5rem;
}

.gw-title {
  font-size:1.15rem;
  font-weight:700;
  margin-bottom:0.2rem;
}

.gw-meta {
  color:var(--c-muted);
  font-size:0.8rem;
}
.gw-meta code {
  background:var(--c-surface-2);
  padding:0.1rem 0.35rem;
  border-radius:4px;
  font-size:0.75rem;
}

.stats-row {
  display:grid;
  grid-template-columns:repeat(3, 1fr);
  gap:1rem;
  margin-bottom:1.5rem;
}

.stat-card {
  background:var(--c-surface);
  border:1px solid var(--c-border);
  border-radius:8px;
  padding:1.25rem;
  text-align:center;
}

.stat-value {
  display:block;
  font-size:1.75rem;
  font-weight:700;
  color:var(--c-text);
}

.stat-label {
  display:block;
  font-size:0.75rem;
  color:var(--c-muted);
  text-transform:uppercase;
  letter-spacing:0.5px;
  margin-top:0.25rem;
}

.section {
  padding:1.5rem;
}

.section-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:1rem;
}

.section-header h4 {
  font-size:0.95rem;
  font-weight:700;
  margin-bottom:0;
}

.poll-error {
  background:var(--c-danger-bg);
  color:var(--c-danger);
  padding:0.5rem;
  border-radius:6px;
  font-size:0.8rem;
  margin-bottom:0.75rem;
}

.node-table {
  width:100%;
  border-collapse:collapse;
}

.node-table th {
  text-align:left;
  padding:0.5rem;
  font-size:0.7rem;
  color:var(--c-muted);
  text-transform:uppercase;
  border-bottom:1px solid var(--c-border);
}

.node-table td {
  padding:0.5rem;
  border-top:1px solid var(--c-surface-2);
  font-size:0.85rem;
}

.node-table tr.clickable {
  cursor:pointer;
}

.node-table tr.clickable:hover {
  background:var(--c-bg);
}

.node-table code {
  background:var(--c-surface-2);
  padding:0.1rem 0.35rem;
  border-radius:4px;
  font-size:0.8rem;
}

.api-key {
  font-size:0.7rem;
  letter-spacing:-0.3px;
}

.action-cell {
  white-space:nowrap;
}

.btn-sm {
  padding:0.3rem 0.75rem;
  font-size:0.78rem;
  width:auto;
}

.state-msg, .empty-state {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
}

.state-msg a {
  color:var(--c-accent);
}

.badge-discovered {
  background:var(--c-info-bg);
  color:var(--c-accent-strong);
  padding:0.15rem 0.5rem;
  border-radius:12px;
  font-size:0.7rem;
  font-weight:600;
}

.badge-provisioning {
  background:var(--c-warn-bg);
  color:var(--c-warn-text);
  padding:0.15rem 0.5rem;
  border-radius:12px;
  font-size:0.7rem;
  font-weight:600;
}




.prov-form .form-group {
  margin-bottom:1rem;
}

.prov-form label {
  display:block;
  font-size:0.82rem;
  font-weight:600;
  margin-bottom:0.25rem;
  color:var(--c-text);
}

.prov-form input,
.prov-form select {
  width:100%;
  padding:0.45rem 0.6rem;
  border:1px solid var(--c-border);
  border-radius:6px;
  font-size:0.85rem;
  box-sizing:border-box;
}

.cap-row {
  display:flex;
  gap:0.4rem;
  align-items:center;
  margin-bottom:0.4rem;
}

.cap-type-select {
  flex:2;
  min-width:0;
}

.cap-pin {
  flex:1;
  min-width:0;
}

.cap-label {
  flex:2;
  min-width:0;
}

.cap-row .btn-sm {
  flex-shrink:0;
}

.cap-pin-err {
  border-color:var(--c-danger) !important;
  background:var(--c-danger-bg);
}

.pin-err-msg {
  display:block;
  font-size:0.72rem;
  color:var(--c-danger);
  margin-top:0.1rem;
  flex-basis:100%;
}

.pin-ref-link {
  display:inline-block;
  font-size:0.75rem;
  color:var(--c-accent);
  margin-bottom:0.4rem;
}







.toast-container {
  position:fixed;
  bottom:1.5rem;
  right:1.5rem;
  display:flex;
  flex-direction:column;
  gap:0.5rem;
  z-index:2000;
}

.toast {
  padding:0.65rem 1rem;
  border-radius:8px;
  font-size:0.85rem;
  font-weight:600;
  box-shadow:0 4px 12px rgba(0,0,0,0.15);
  cursor:pointer;
  animation:slide-in 0.3s ease;
  max-width:360px;
}

.toast-success {
  background:var(--c-ok-bg);
  color:var(--c-ok-text);
  border:1px solid var(--c-ok-bg);
}

.toast-error {
  background:var(--c-danger-bg);
  color:var(--c-danger);
  border:1px solid var(--c-danger-border);
}

@keyframes slide-in {
  from { transform:translateX(100%); opacity:0; }
  to { transform:translateX(0); opacity:1; }
}

.settings-card {
  cursor:pointer;
  transition:border-color 0.15s;
  display:flex;
  flex-direction:column;
  margin-bottom:1rem;
}
.settings-card:hover {
  border-color:var(--c-accent);
}
.settings-card .section-header {
  margin-bottom:0.25rem;
}
.chevron {
  font-size:1.5rem;
  color:var(--c-muted);
  line-height:1;
}
.settings-desc {
  color:var(--c-muted);
  font-size:0.8rem;
}

.pairing-card {
  border:2px solid var(--c-warn);
  background:var(--c-warn-bg);
  margin-bottom:1rem;
}
.pairing-desc {
  color:var(--c-text);
  font-size:0.85rem;
  margin-bottom:0.75rem;
}
.pairing-code {
  font-family:monospace;
  font-size:2.5rem;
  font-weight:800;
  letter-spacing:8px;
  text-align:center;
  color:var(--c-warn);
  background:var(--c-warn-bg);
  padding:0.75rem;
  border-radius:8px;
  border:1px dashed var(--c-warn);
}
.pairing-note {
  color:var(--c-muted);
  font-size:0.75rem;
  margin-top:0.5rem;
  text-align:center;
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns:1fr; }
  .toast-container { left:1rem; right:1rem; bottom:1rem; }
  .toast { max-width:100%; }
}
</style>
