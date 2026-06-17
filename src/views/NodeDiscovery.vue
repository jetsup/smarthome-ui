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
            <tr><th>Device ID</th><th>Heard Via</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="d in discovered" :key="d.deviceId + d.gatewayId">
              <td><code>{{ d.deviceId }}</code></td>
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
    alert('Scan failed: ' + (e.response?.data?.error || e.message))
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
      if (confirm(data.message + '\n\nClick OK to switch gateways.')) {
        try {
          await api.post('/nodes/provision', {
            deviceId: selectedNode.value.deviceId,
            gatewayId: selectedGateway.value,
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
  display: inline-block;
  color: #0969da;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.back-link:hover {
  text-decoration: underline;
}
.page-desc {
  color: #656d76;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}
.scan-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.scan-hint {
  color: #656d76;
  font-size: 0.85rem;
}
.scanning-box {
  display: flex;
  justify-content: center;
  padding: 3rem;
}
.spinner {
  border: 3px solid #e1e4e8;
  border-top-color: #0969da;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.discovered-section {
  margin-top: 0.5rem;
}
.discovered-section h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.discovered-hint {
  color: #656d76;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}
.discovered-table {
  width: 100%;
  border-collapse: collapse;
}
.discovered-table th {
  text-align: left;
  padding: 0.5rem;
  font-size: 0.7rem;
  color: #656d76;
  text-transform: uppercase;
  border-bottom: 1px solid #d0d7de;
}
.discovered-table td {
  padding: 0.5rem;
  border-top: 1px solid #f3f4f6;
  font-size: 0.85rem;
}
.discovered-table code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
}
.btn-sm {
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  width: auto;
}
.state-msg {
  padding: 2rem;
  text-align: center;
  color: #656d76;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
}
.modal h4 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.modal p {
  font-size: 0.85rem;
  color: #656d76;
  margin-bottom: 1rem;
}
.modal code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #1f2328;
}
.form-group select {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 0.85rem;
}
.form-group select:focus {
  outline: none;
  border-color: #0969da;
}
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.error-msg {
  color: #cf222e;
  font-size: 0.8rem;
  margin-top: 0.75rem;
}
</style>
