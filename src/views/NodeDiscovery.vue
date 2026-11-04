<template>
  <div class="fade-in">
    <router-link to="/gateways" class="back-link">&larr; Back to Gateways</router-link>
    <h3>Find Nodes</h3>
    <p class="page-desc">Scan for unprovisioned ESP-NOW nodes. Found nodes can be added to any of your gateways.</p>

    <div v-if="loadingGateways" class="state-msg">Loading gateways…</div>

    <template v-else>
      <div class="scan-bar">
        <button class="btn btn-primary" @click="startScan" :disabled="scanning">
          {{ scanning ? 'Scanning…' : 'Scan All Gateways' }}
        </button>
        <span v-if="scanning" class="scan-hint">Listening for nodes (30s timeout)…</span>
      </div>

      <div v-if="scanning" class="scanning-box">
        <div class="spinner"></div>
      </div>

      <div v-if="discovered.length > 0 && !scanning" class="discovered-section">
        <h4>Discovered Nodes</h4>
        <p class="discovered-hint">Click a node to add it to a gateway.</p>
        <table class="discovered-table">
          <thead>
            <tr><th>Device ID</th><th>Type</th><th>Heard Via</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="d in discovered" :key="d.deviceId + d.gatewayId">
              <td><code>{{ d.deviceId }}</code></td>
              <td>{{ typeLabel(d.deviceType) }}</td>
              <td><code>{{ d.gatewayId }}</code></td>
              <td>
                <button class="btn btn-primary btn-sm" @click="openAddDialog(d)">Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!scanning && discovered.length === 0 && !loadingGateways" class="state-msg">
        No nodes discovered. Ensure a node is powered on nearby and click <strong>Scan All Gateways</strong>.
      </div>
    </template>

    <!-- Gateway picker modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h4>Add Node</h4>
        <p>Device <code>{{ selectedNode?.deviceId }}</code> heard via <code>{{ selectedNode?.gatewayId }}</code></p>
        <div class="form-group">
          <label for="gw-select">Select gateway</label>
          <select id="gw-select" v-model="selectedGateway">
            <option value="" disabled>— Choose a gateway —</option>
            <option v-for="gw in gateways" :key="gw.id" :value="gw.id">
              {{ gw.name }} ({{ gw.id }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="node-name">Name</label>
          <input id="node-name" v-model="nodeName" maxlength="16" placeholder="e.g. Living room" />
        </div>
        <div class="form-group">
          <label>What is wired to this node?</label>
          <div v-for="(c, i) in caps" :key="i" class="cap-row">
            <select v-model="c.type">
              <option v-for="t in capTypes" :key="t.v" :value="t.v">{{ t.l }}</option>
            </select>
            <input v-model.number="c.pin" type="number" min="0" max="48" :placeholder="c.type === 'i2c' ? 'I2C address' : c.type === 'uart' ? 'UART no.' : 'GPIO pin'" />
            <input v-model="c.label" maxlength="10" placeholder="Label" />
            <button v-if="caps.length > 1" type="button" class="btn btn-secondary btn-sm" @click="caps.splice(i, 1)" aria-label="Remove">&times;</button>
          </div>
          <button v-if="caps.length < 8" type="button" class="btn btn-secondary btn-sm" @click="caps.push(newCap())">+ Add another</button>
          <p class="hint">Example: potentiometer on pin 34 → Analog input; LED on pin 25 → Digital output.</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showModal = false">Cancel</button>
          <button class="btn btn-primary" @click="provisionNode" :disabled="!selectedGateway || provisioning">
            {{ provisioning ? 'Adding…' : 'Add to Gateway' }}
          </button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'
import { confirmDialog, notify } from '../services/dialog'

const store = useGatewayStore()

const gateways = ref([])
const loadingGateways = ref(true)
const discovered = ref([])
const scanning = ref(false)
const showModal = ref(false)
const selectedNode = ref(null)
const selectedGateway = ref('')
const provisioning = ref(false)
const errorMsg = ref('')
const nodeName = ref('')
const capTypes = [
  { v: 'digitalOutput', l: 'Digital output' }, { v: 'analogOutput', l: 'Analog output (PWM)' },
  { v: 'analogInput', l: 'Analog input' }, { v: 'digitalInput', l: 'Digital input' },
  { v: 'relay', l: 'Relay' }, { v: 'i2c', l: 'I2C' }, { v: 'uart', l: 'UART' },
]
const newCap = () => ({ type: 'digitalOutput', pin: null, label: '' })
const caps = ref([newCap()])

function capPayload() {
  return caps.value.map((c) => {
    const io = c.type !== 'i2c' && c.type !== 'uart'
    return { type: c.type, pin: io ? (c.pin || 0) : 0, extra: io ? 0 : (c.pin || 0), label: c.label || '' }
  })
}

const typeLabels = {
  0: 'Unknown',
  1: 'Analog',
  2: 'Digital',
  3: 'Relay',
  4: 'IR',
  5: 'Hybrid',
}

function typeLabel(t) {
  return typeLabels[t] || 'Unknown'
}

let scanPoll = null

async function startScan() {
  scanning.value = true
  discovered.value = []
  try {
    await api.post('/nodes/scan')
    scanPoll = setInterval(pollDiscovered, 2000)
    setTimeout(() => stopScan(), 30000)
  } catch (e) {
    scanning.value = false
    notify('Scan failed: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function stopScan() {
  scanning.value = false
  if (scanPoll) {
    clearInterval(scanPoll)
    scanPoll = null
  }
  await pollDiscovered()
}

async function pollDiscovered() {
  try {
    const { data } = await api.get('/nodes/discovered')
    discovered.value = data
    if (data.length > 0) {
      stopScan()
    }
  } catch (e) {
    // Ignore polling errors
  }
}

function openAddDialog(d) {
  selectedNode.value = d
  selectedGateway.value = ''
  nodeName.value = ''
  caps.value = [newCap()]
  errorMsg.value = ''
  showModal.value = true
}

async function provisionNode() {
  if (!selectedNode.value || !selectedGateway.value) return
  provisioning.value = true
  errorMsg.value = ''
  try {
    await api.post('/nodes/provision', {
      deviceId: selectedNode.value.deviceId,
      gatewayId: selectedGateway.value,
      name: nodeName.value.trim(),
      capabilitiesConfig: capPayload(),
      force: false,
    })
    // Remove from discovered list
    discovered.value = discovered.value.filter(
      d => !(d.deviceId === selectedNode.value.deviceId && d.gatewayId === selectedNode.value.gatewayId)
    )
    showModal.value = false
  } catch (e) {
    const data = e.response?.data
    if (data?.status === 'gateway_conflict') {
      if (await confirmDialog({ title: 'Switch gateway?', message: data.message, confirmText: 'Switch gateway' })) {
        try {
          await api.post('/nodes/provision', {
            deviceId: selectedNode.value.deviceId,
            gatewayId: selectedGateway.value,
            name: nodeName.value.trim(),
            capabilitiesConfig: capPayload(),
            force: true,
          })
          discovered.value = discovered.value.filter(
            d => !(d.deviceId === selectedNode.value.deviceId && d.gatewayId === selectedNode.value.gatewayId)
          )
          showModal.value = false
        } catch (e2) {
          errorMsg.value = e2.response?.data?.error || 'Failed to switch gateway'
        }
      }
    } else {
      errorMsg.value = data?.error || 'Provision failed'
    }
  } finally {
    provisioning.value = false
  }
}

onMounted(async () => {
  await store.fetchAll()
  gateways.value = store.gateways
  loadingGateways.value = false
})

onUnmounted(() => {
  if (scanPoll) {
    clearInterval(scanPoll)
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
.page-desc {
  color:var(--c-muted);
  font-size:0.85rem;
  margin-bottom:1.5rem;
}
.scan-bar {
  display:flex;
  align-items:center;
  gap:1rem;
  margin-bottom:1.5rem;
}
.scan-hint {
  color:var(--c-muted);
  font-size:0.85rem;
}
.scanning-box {
  display:flex;
  justify-content:center;
  padding:3rem;
}
.spinner {
  border:3px solid var(--c-border);
  border-top-color:var(--c-accent);
  border-radius:50%;
  width:32px;
  height:32px;
  animation:spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform:rotate(360deg); }
}
.discovered-section {
  margin-top:0.5rem;
}
.discovered-section h4 {
  font-size:0.95rem;
  font-weight:700;
  margin-bottom:0.25rem;
}
.discovered-hint {
  color:var(--c-muted);
  font-size:0.8rem;
  margin-bottom:0.75rem;
}
.discovered-table {
  width:100%;
  border-collapse:collapse;
}
.discovered-table th {
  text-align:left;
  padding:0.5rem;
  font-size:0.7rem;
  color:var(--c-muted);
  text-transform:uppercase;
  border-bottom:1px solid var(--c-border);
}
.discovered-table td {
  padding:0.5rem;
  border-top:1px solid var(--c-surface-2);
  font-size:0.85rem;
}
.discovered-table code {
  background:var(--c-surface-2);
  padding:0.1rem 0.35rem;
  border-radius:4px;
  font-size:0.8rem;
}
.btn-sm {
  padding:0.3rem 0.75rem;
  font-size:0.78rem;
  width:auto;
}
.state-msg {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
}
.form-group {
  margin-bottom:1rem;
}
.form-group label {
  display:block;
  font-size:0.8rem;
  font-weight:600;
  margin-bottom:0.25rem;
  color:var(--c-text);
}
.form-group select {
  width:100%;
  padding:0.5rem 0.65rem;
  border:1px solid var(--c-border);
  border-radius:6px;
  font-size:0.85rem;
}
.form-group select:focus {
  outline:none;
  border-color:var(--c-accent);
}
.error-msg {
  color:var(--c-danger);
  font-size:0.8rem;
  margin-top:0.75rem;
}
.cap-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.cap-row select { flex: 3; }
.cap-row input { flex: 2; min-width: 0; }
.hint { font-size: 12px; opacity: .7; margin-top: 6px; }
</style>
