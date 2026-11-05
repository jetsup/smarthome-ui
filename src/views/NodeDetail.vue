<template>
  <div class="fade-in">
    <router-link :to="backLink" class="back-link">&larr; Back to {{ gatewayName ? `“${gatewayName}”` : 'gateway' }}</router-link>

    <div v-if="initialLoading" class="state-msg">Loading…</div>

    <div v-else-if="!node" class="empty-state card">
      <p>Node not found.</p>
      <router-link :to="backLink" class="btn btn-secondary">Back to Gateways</router-link>
    </div>

    <template v-else>
      <div class="node-header">
        <div>
          <h3 class="node-title">{{ node.name || 'Node ' + node.nodeId }}</h3>
          <p class="node-meta">
            Device ID: <code>{{ node.deviceId }}</code> |
            Gateway: <code>{{ node.gatewayId }}</code> |
            Type: {{ typeLabel }}
          </p>
        </div>
        <span :class="['badge', node.isOnline ? 'badge-online' : 'badge-offline']">
          {{ node.isOnline ? 'Online' : 'Offline' }}
        </span>
      </div>

      <!-- Status row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ node.value ?? '—' }}</span>
          <span class="stat-label">Current Value</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ capsSummary }}</span>
          <span class="stat-label">Capabilities</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ node.lastSeen ? relTime(node.lastSeen) : 'Never' }}</span>
          <span class="stat-label">Last Seen</span>
        </div>
      </div>

      <!-- Which display shows this node (a node is on one display only) -->
      <div v-if="displays.length > 0" class="card section">
        <div class="display-row">
          <div>
            <strong>Shown on display</strong>
            <p class="display-hint">A node appears on one display only; choosing another moves it.</p>
          </div>
          <select class="display-select" :value="node.hmiId ?? ''" :disabled="assigning" @change="assignDisplay($event.target.value)">
            <option value="">None</option>
            <option v-for="d in displays" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <p v-if="assignError" class="display-error">{{ assignError }}</p>
      </div>

      <!-- Per-capability controls -->
      <div v-if="caps.length > 0" class="card section">
        <div class="section-header">
          <h4>Capabilities</h4>
          <button class="btn btn-secondary btn-sm" @click="openEditCaps">Edit</button>
        </div>
        <div class="cap-list">
          <div v-for="(cap, i) in caps" :key="i" class="cap-item">
            <div class="cap-info">
              <span class="cap-label">{{ cap.label || capTypeLabel(cap.type) }}</span>
              <span class="cap-type">{{ capTypeLabel(cap.type) }}{{ cap.pin ? ` (pin ${cap.pin})` : '' }}{{ cap.type === 'neopixel' ? ` · ${cap.count} LEDs${cap.ring ? ' · ring' : ''}` : '' }}</span>
            </div>
            <div class="cap-control">
              <button v-if="cap.type === 'digitalOutput' || cap.type === 'relay'"
                :class="['btn', capStates[i] ? 'btn-success' : 'btn-secondary']"
                @click="toggleCap(i, cap)" :disabled="sending">
                {{ capStates[i] ? 'ON' : 'OFF' }}
              </button>
              <div v-else-if="cap.type === 'analogOutput'" class="analog-slider-wrap">
                <input type="range" min="0" max="255" :value="analogVals[i] ?? 0" @input="analogDrag(i, $event)" @change="analogCommit(i)" class="analog-slider" />
                <span class="analog-val">{{ analogVals[i] ?? 0 }}</span>
              </div>
              <span v-else-if="cap.type === 'analogInput'" class="cap-value">
                {{ node.value ?? '—' }}
              </span>
              <span v-else-if="cap.type === 'digitalInput'" class="cap-value">
                {{ node.value ? 'HIGH' : 'LOW' }}
              </span>
              <span v-else class="cap-value">{{ cap.display || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <ModuleControls :node="node" />

      <!-- Quick toggles for old relay type (backward compat) -->
      <div v-if="!node.capabilitiesConfig && node.deviceType === 3" class="card section">
        <h4>Relay Control</h4>
        <div class="quick-actions">
          <button class="btn btn-success" @click="quickCommand(1)" :disabled="sending">Turn On</button>
          <button class="btn btn-danger" @click="quickCommand(0)" :disabled="sending">Turn Off</button>
        </div>
      </div>

      <!-- API key info -->
      <div class="card section api-key-section">
        <h4>API Key</h4>
        <code class="api-key-value">{{ node.apiKey || '—' }}</code>
      </div>
    </template>

    <!-- Edit Capabilities modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal modal-wide">
        <h4>Edit Capabilities</h4>
        <p>Configure capabilities for device <code>{{ node?.deviceId }}</code>.</p>

        <CapabilityEditor v-model="editCaps" />

        <div class="modal-actions">
          <button @click="showEditModal = false" class="btn btn-secondary" :disabled="saving">Cancel</button>
          <button @click="saveCaps" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
        <p v-if="capsError" class="modal-error">{{ capsError }}</p>
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
import { useRoute } from 'vue-router'
import api from '../services/api'
import CapabilityEditor from '../components/CapabilityEditor.vue'
import ModuleControls from '../components/ModuleControls.vue'
import { loadCatalog, typeOf, editable, payload } from '../services/catalog'

const route = useRoute()

const node = ref(null)
const initialLoading = ref(true)
const cmdValue = ref(0)
const sending = ref(false)
const toasts = ref([])

const displays = ref([])
const assigning = ref(false)
const assignError = ref('')

async function loadDisplays() {
  try {
    const { data } = await api.get('/hmis')
    displays.value = (Array.isArray(data) ? data : []).filter((d) => d.gatewayId === node.value?.gatewayId)
  } catch {
    displays.value = []
  }
}

async function assignDisplay(val) {
  assigning.value = true
  assignError.value = ''
  try {
    await api.put(`/nodes/${node.value.nodeId}/hmi`, { hmiId: val === '' ? null : Number(val) })
    node.value.hmiId = val === '' ? null : Number(val)
  } catch (e) {
    assignError.value = e.response?.data?.error || 'Could not change the display'
  } finally {
    assigning.value = false
  }
}

const capStates = ref({})
const analogVals = ref({})
let pollTimer = null

// Edit capabilities modal
const showEditModal = ref(false)
const editCaps = ref([])
const saving = ref(false)
const capsError = ref('')

const typeLabels = {
  0: 'Unknown',
  1: 'Analog Sensor',
  2: 'Digital Sensor',
  3: 'Relay Actuator',
  4: 'IR Transceiver',
  5: 'Hybrid',
}

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
  return typeOf(type)?.label || capLabels[type] || type
}

const typeLabel = computed(() => typeLabels[node.value?.deviceType] || 'Unknown')

const backLink = computed(() => {
  const gid = node.value?.gatewayId
  return gid ? '/gateways/' + gid : '/gateways'
})

const caps = computed(() => {
  const cc = node.value?.capabilitiesConfig
  if (Array.isArray(cc) && cc.length > 0) return cc
  return []
})

const capsSummary = computed(() => {
  const cc = node.value?.capabilitiesConfig
  if (Array.isArray(cc) && cc.length > 0) {
    return cc.length > 3 ? `${cc.length} modules` : cc.map(c => capTypeLabel(c.type)).join(', ')
  }
  // Fallback to bitmask
  const capsBits = node.value?.capabilities
  if (!capsBits) return 'None'
  const labels = []
  if (capsBits & 1) labels.push('Analog In')
  if (capsBits & 2) labels.push('Digital In')
  if (capsBits & 4) labels.push('Relay Out')
  if (capsBits & 8) labels.push('IR TX')
  if (capsBits & 16) labels.push('IR RX')
  return labels.join(', ') || 'None'
})

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
  setTimeout(() => toasts.value.shift(), 4000)
}

async function sendCommand(pin) {
  sending.value = true
  try {
    const payload = { value: cmdValue.value }
    if (pin !== undefined) payload.pin = pin
    const { data } = await api.post(`/nodes/${route.params.nodeId}/command`, payload)
    if (node.value) node.value.value = cmdValue.value
    addToast(`Command ${data.value} sent`)
  } catch (e) {
    addToast('Command failed', 'error')
  } finally {
    sending.value = false
  }
}

async function toggleCap(index, cap) {
  capStates.value[index] = !capStates.value[index]
  cmdValue.value = capStates.value[index] ? 1 : 0
  await sendCommand(cap.pin)
}

function analogDrag(index, event) {
  analogVals.value[index] = Number(event.target.value)
}

function analogCommit(index) {
  const cc = node.value?.capabilitiesConfig
  if (!Array.isArray(cc) || !cc[index]) return
  cmdValue.value = analogVals.value[index] ?? 0
  sendCommand(cc[index].pin)
}

function initCapStates() {
  const cc = node.value?.capabilitiesConfig
  if (Array.isArray(cc) && cc.length > 0) {
    const states = {}
    const avals = {}
    cc.forEach((c, i) => {
      if (c.type === 'digitalOutput' || c.type === 'relay') {
        states[i] = c.value ? c.value > 0 : false
      }
      if (c.type === 'analogOutput') {
        avals[i] = c.value ?? 0
      }
    })
    capStates.value = states
    analogVals.value = avals
  }
}

async function quickCommand(val) {
  cmdValue.value = val
  await sendCommand()
}

const PIN_OPTIONS = [0,2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33,34,35,36,39]
const ESP32_ADC2 = new Set([0,2,4,12,13,14,15,25,26,27])
const ESP32_INPUT_ONLY = new Set([34,35,36,39])

function pinLabel(pin, type) {
  if (pin === 0) return '— Select pin —'
  const hints = []
  if (ESP32_ADC2.has(pin) && (type === 'analogInput' || type === 'analogOutput')) hints.push('ADC2, conflicts with Wi-Fi')
  if (ESP32_INPUT_ONLY.has(pin) && (type === 'digitalOutput' || type === 'analogOutput' || type === 'relay')) hints.push('input only')
  let label = `GPIO ${pin}`
  if (hints.length) label += ` (${hints.join(', ')})`
  return label
}

function usedPins(excludeIndex) {
  const pins = new Set()
  editCaps.value.forEach((cap, i) => {
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

function openEditCaps() {
  loadCatalog()
  editCaps.value = editable(node.value?.capabilitiesConfig)
  capsError.value = ''
  showEditModal.value = true
}

async function saveCaps() {
  saving.value = true
  capsError.value = ''
  try {
    await api.put(`/nodes/${route.params.nodeId}/capabilities`, { capabilitiesConfig: payload(editCaps.value) })
    await fetchNode()
    addToast('Capabilities updated')
    showEditModal.value = false
  } catch (e) {
    capsError.value = e.response?.data?.error || 'Failed to update capabilities'
    addToast('Update failed', 'error')
  } finally {
    saving.value = false
  }
}

const gatewayName = ref('')
async function loadGatewayName(id) {
  if (!id || gatewayName.value) return
  try { gatewayName.value = (await api.get(`/gateways/${id}`)).data?.name || '' } catch { /* keep the generic label */ }
}

async function fetchNode() {
  try {
    const { data } = await api.get(`/nodes/${route.params.nodeId}`)
    if (node.value) {
      Object.assign(node.value, data)
    } else {
      node.value = data
    }
    initCapStates()
    loadGatewayName(node.value?.gatewayId)
  } catch {
    node.value = null
  }
}

onMounted(async () => {
  await fetchNode()
  await loadDisplays()
  initialLoading.value = false
  pollTimer = setInterval(fetchNode, 5000)
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

.node-header {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  margin-bottom:1.5rem;
}

.node-title {
  font-size:1.15rem;
  font-weight:700;
  margin-bottom:0.2rem;
}

.node-meta {
  color:var(--c-muted);
  font-size:0.8rem;
}
.node-meta code {
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
  margin-bottom:1rem;
}

.section h4 {
  font-size:0.95rem;
  font-weight:700;
  margin-bottom:0.5rem;
}

.section-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:0.5rem;
}

.control-desc {
  color:var(--c-muted);
  font-size:0.82rem;
  margin-bottom:1rem;
}

.control-form {
  display:flex;
  gap:1rem;
  align-items:flex-end;
}

.input-group {
  flex:1;
}

.input-group label {
  display:block;
  font-size:0.8rem;
  font-weight:600;
  margin-bottom:0.25rem;
}

.input-group input {
  width:100%;
  padding:0.5rem 0.65rem;
  border:1px solid var(--c-border);
  border-radius:6px;
  font-size:0.9rem;
  box-sizing:border-box;
}

.input-group input:focus {
  outline:none;
  border-color:var(--c-accent);
}

.cmd-result {
  margin-top:0.75rem;
  font-size:0.82rem;
  padding:0.5rem;
  border-radius:6px;
}

.cmd-result.success {
  background:var(--c-ok-bg);
  color:var(--c-ok-text);
}

.cmd-result.error {
  background:var(--c-danger-bg);
  color:var(--c-danger);
}

.quick-actions {
  display:flex;
  gap:0.75rem;
}

.btn-success {
  background:#238636;
  color:#fff;
}

.btn-success:hover {
  background:#2ea043;
}

.cap-list {
  display:flex;
  flex-direction:column;
  gap:0.5rem;
}

.cap-item {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0.65rem 0.85rem;
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:8px;
}

.cap-label {
  font-weight:600;
  font-size:0.85rem;
}

.cap-type {
  display:block;
  font-size:0.75rem;
  color:var(--c-muted);
}

.cap-control {
  display:flex;
  align-items:center;
  gap:0.5rem;
}

.cap-value {
  font-size:0.9rem;
  font-weight:600;
  color:var(--c-text);
}

.api-key-section {
  background:var(--c-bg);
}

.api-key-value {
  display:block;
  word-break:break-all;
  font-size:0.8rem;
  background:var(--c-surface);
  padding:0.5rem;
  border:1px solid var(--c-border);
  border-radius:6px;
  margin-top:0.25rem;
}

.state-msg, .empty-state {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
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

/* Analog slider */
.analog-slider-wrap {
  display:flex;
  align-items:center;
  gap:0.5rem;
  min-width:140px;
}

.analog-slider {
  flex:1;
  accent-color:var(--c-accent);
  cursor:pointer;
}

.analog-val {
  font-size:0.85rem;
  font-weight:600;
  color:var(--c-text);
  min-width:2rem;
  text-align:right;
}

/* Modal styles matching GatewayDetail */









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

.btn-sm {
  padding:0.3rem 0.75rem;
  font-size:0.78rem;
  width:auto;
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns:1fr; }
  .control-form { flex-direction:column; }
  .toast-container { left:1rem; right:1rem; bottom:1rem; }
  .toast { max-width:100%; }
}
.display-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
.display-hint { color:var(--c-muted); font-size:0.8rem; margin:0.25rem 0 0; }
.display-select { padding:0.5rem 0.75rem; border:1px solid var(--c-border); border-radius:6px; background:var(--c-bg); font-size:0.9rem; min-width:180px; }
.display-error { color:var(--c-danger); font-size:0.82rem; margin:0.5rem 0 0; }
</style>
