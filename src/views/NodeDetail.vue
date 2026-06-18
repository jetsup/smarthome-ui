<template>
  <div class="fade-in">
    <router-link :to="backLink" class="back-link">&larr; Back to Gateway {{ node?.gatewayId }}</router-link>

    <div v-if="initialLoading" class="state-msg">Loading…</div>

    <div v-else-if="!node" class="empty-state card">
      <p>Node not found.</p>
      <router-link :to="backLink" class="btn btn-secondary">Back to Gateways</router-link>
    </div>

    <template v-else>
      <div class="node-header">
        <div>
          <h3 class="node-title">Node {{ node.nodeId }}</h3>
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
          <span class="stat-value">{{ capabilities }}</span>
          <span class="stat-label">Capabilities</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ node.lastSeen ? relTime(node.lastSeen) : 'Never' }}</span>
          <span class="stat-label">Last Seen</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="card section">
        <h4>Control</h4>
        <p class="control-desc">Send a command value to this node.</p>
        <div class="control-form">
          <div class="input-group">
            <label for="cmd-value">Value</label>
            <input id="cmd-value" type="number" v-model.number="cmdValue" min="0" max="65535" placeholder="0–65535" />
          </div>
          <button class="btn btn-primary" @click="sendCommand" :disabled="sending">
            {{ sending ? 'Sending…' : 'Send Command' }}
          </button>
        </div>
        <p v-if="cmdResult" :class="['cmd-result', cmdResult.status === 'transmitted' ? 'success' : 'error']">
          {{ cmdResult.message }}
        </p>
      </div>

      <!-- Quick toggles for relay type -->
      <div v-if="node.deviceType === 3" class="card section">
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

const route = useRoute()

const node = ref(null)
const initialLoading = ref(true)
const cmdValue = ref(0)
const sending = ref(false)
const cmdResult = ref(null)
const toasts = ref([])

let pollTimer = null

const typeLabels = {
  0: 'Unknown',
  1: 'Analog Sensor',
  2: 'Digital Sensor',
  3: 'Relay Actuator',
  4: 'IR Transceiver',
  5: 'Hybrid',
}

const typeLabel = computed(() => typeLabels[node.value?.deviceType] || 'Unknown')

const backLink = computed(() => {
  const gid = node.value?.gatewayId
  return gid ? '/gateways/' + gid : '/gateways'
})

const capabilities = computed(() => {
  const caps = node.value?.capabilities
  if (!caps) return 'None'
  const labels = []
  if (caps & 1) labels.push('Analog In')
  if (caps & 2) labels.push('Digital In')
  if (caps & 4) labels.push('Relay Out')
  if (caps & 8) labels.push('IR TX')
  if (caps & 16) labels.push('IR RX')
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

async function sendCommand() {
  sending.value = true
  cmdResult.value = null
  try {
    const { data } = await api.post(`/nodes/${route.params.nodeId}/command`, { value: cmdValue.value })
    cmdResult.value = { status: 'transmitted', message: `Command value ${data.value} sent successfully` }
    addToast(`Command ${data.value} sent`)
  } catch (e) {
    cmdResult.value = { status: 'error', message: e.response?.data?.error || 'Failed to send command' }
    addToast('Command failed', 'error')
  } finally {
    sending.value = false
  }
}

async function quickCommand(val) {
  cmdValue.value = val
  await sendCommand()
}

async function fetchNode() {
  try {
    const { data } = await api.get(`/nodes/${route.params.nodeId}`)
    if (node.value) {
      Object.assign(node.value, data)
    } else {
      node.value = data
    }
  } catch {
    node.value = null
  }
}

onMounted(async () => {
  await fetchNode()
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
  display: inline-block;
  color: #0969da;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.back-link:hover {
  text-decoration: underline;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.node-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.node-meta {
  color: #656d76;
  font-size: 0.8rem;
}
.node-meta code {
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
  margin-bottom: 1rem;
}

.section h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.control-desc {
  color: #656d76;
  font-size: 0.82rem;
  margin-bottom: 1rem;
}

.control-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.input-group {
  flex: 1;
}

.input-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.input-group input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #0969da;
}

.cmd-result {
  margin-top: 0.75rem;
  font-size: 0.82rem;
  padding: 0.5rem;
  border-radius: 6px;
}

.cmd-result.success {
  background: #dafbe1;
  color: #116329;
}

.cmd-result.error {
  background: #ffebe9;
  color: #cf222e;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-success {
  background: #238636;
  color: #fff;
}

.btn-success:hover {
  background: #2ea043;
}

.api-key-section {
  background: #f6f8fa;
}

.api-key-value {
  display: block;
  word-break: break-all;
  font-size: 0.8rem;
  background: #fff;
  padding: 0.5rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  margin-top: 0.25rem;
}

.state-msg, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #656d76;
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

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr; }
  .control-form { flex-direction: column; }
  .toast-container { left: 1rem; right: 1rem; bottom: 1rem; }
  .toast { max-width: 100%; }
}
</style>
