<template>
  <div class="fade-in">
    <router-link :to="'/nodes/' + $route.params.nodeId" class="back-link"><Icon name="arrow-left" /> Back to node</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!node" class="empty-state card"><p>Node not found.</p></div>

    <template v-else>
      <h3 class="page-title">{{ node.name || 'Node ' + node.nodeId }} settings</h3>
      <p class="hint">Hardware address (MAC): <code>{{ node.mac || 'not reported yet' }}</code> · Device ID <code>{{ node.deviceId }}</code></p>

      <!-- Name -->
      <div class="card section">
        <div class="section-header">
          <h4>Node name</h4>
          <p class="hint">Shown here, in the app and on the display. Changing it does not need the node to be paired again.</p>
        </div>
        <div v-if="nameMsg" :class="nameOk ? 'ok-msg' : 'err-msg'">{{ nameMsg }}</div>
        <form class="name-form" @submit.prevent="saveName">
          <input v-model="nameInput" maxlength="40" class="field-input" placeholder="Node name" required />
          <button type="submit" class="btn btn-primary" :disabled="saving || !nameChanged">{{ saving ? 'Saving…' : 'Save name' }}</button>
        </form>
      </div>

      <!-- Pairing code -->
      <div class="card section">
        <div class="section-header">
          <h4>Pairing code</h4>
          <p class="hint">To move this node to another gateway without reaching it, enter this code (or scan the QR in the app) when pairing it there. Keep it private.</p>
        </div>
        <div class="code-row">
          <img v-if="qr" :src="qr" alt="Pairing QR code" class="qr" />
          <div>
            <code class="pair-code">{{ node.pairCode || '—' }}</code>
            <div><button class="btn btn-secondary btn-sm" @click="copyCode">Copy code</button></div>
          </div>
        </div>
      </div>

      <!-- Maintenance -->
      <div class="card section">
        <div class="section-header">
          <h4>Maintenance</h4>
          <p class="hint">Restart reboots the node. Its pairing and saved settings are kept.</p>
        </div>
        <button class="btn btn-secondary" :disabled="restarting || !node.isOnline" @click="restart">
          {{ restarting ? 'Restarting…' : 'Restart node' }}
        </button>
        <p v-if="!node.isOnline" class="hint">The node is offline.</p>
      </div>

      <!-- Reload saved settings -->
      <div class="card section">
        <div class="section-header">
          <h4>Saved settings</h4>
          <p class="hint">Send the name, modules and key saved here to the node again. Use it when the node blinks its LED as if it were new (its memory was erased or it was re-flashed), or after changing something that did not reach it. The node restarts. It only needs to be within range of its gateway.</p>
        </div>
        <button class="btn btn-primary" :disabled="reloading" @click="reload">
          {{ reloading ? 'Sending…' : 'Reload saved settings' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import api from '../services/api'
import { confirmDialog, notify } from '../services/dialog'

const route = useRoute()
const node = ref(null)
const loading = ref(true)
const nameInput = ref('')
const saving = ref(false)
const nameMsg = ref('')
const nameOk = ref(false)
const restarting = ref(false)
const reloading = ref(false)
const qr = ref('')
const nameChanged = computed(() => !!node.value && nameInput.value.trim() !== (node.value.name || ''))

onMounted(async () => {
  try {
    const { data } = await api.get(`/nodes/${route.params.nodeId}`)
    node.value = data
    nameInput.value = data.name || ''
    if (data.pairCode) qr.value = await QRCode.toDataURL('SHNODE:' + data.pairCode, { margin: 1, width: 180 })
  } catch { node.value = null }
  loading.value = false
})

async function copyCode() {
  try { await navigator.clipboard.writeText(node.value.pairCode); notify('Pairing code copied', 'ok') } catch {}
}

async function saveName() {
  saving.value = true
  nameMsg.value = ''
  try {
    const { data } = await api.put(`/nodes/${route.params.nodeId}`, { name: nameInput.value })
    node.value.name = data.name
    nameInput.value = data.name
    nameOk.value = true
    nameMsg.value = 'Renamed.'
  } catch (e) {
    nameOk.value = false
    nameMsg.value = e.response?.data?.error || 'Could not rename'
  } finally { saving.value = false }
}

async function reload() {
  const ok = await confirmDialog({
    title: 'Reload saved settings?',
    message: 'The saved name, modules and key are sent to the node and it restarts.',
    confirmText: 'Send',
  })
  if (!ok) return
  reloading.value = true
  try {
    await api.post(`/nodes/${route.params.nodeId}/reload-config`)
    notify('Saved settings sent to the node', 'ok')
  } catch (e) {
    notify(e.response?.data?.error || 'Could not send the settings', 'error')
  } finally { reloading.value = false }
}

async function restart() {
  const ok = await confirmDialog({
    title: 'Restart this node?',
    message: 'The node reboots for a few seconds. Its pairing and settings are kept.',
    confirmText: 'Restart',
  })
  if (!ok) return
  restarting.value = true
  try {
    await api.post(`/nodes/${route.params.nodeId}/restart`)
    notify('Restarting the node…', 'ok')
  } catch (e) {
    notify(e.response?.data?.error || 'Could not restart the node', 'error')
  } finally { restarting.value = false }
}
</script>

<style scoped>
.back-link { display: inline-block; color: var(--c-accent); font-size: 0.85rem; margin-bottom: 1rem; }
.back-link:hover { text-decoration: underline; }
.page-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 1.5rem; }
.section { padding: 1.5rem; margin-bottom: 1rem; }
.section-header { margin-bottom: 1rem; }
.section-header h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0; }
.hint { font-size: 0.8rem; color: var(--c-muted); margin: 4px 0 0; }
.name-form { display: flex; gap: 10px; flex-wrap: wrap; }
.name-form .field-input { flex: 1; min-width: 200px; }
.ok-msg { color: var(--c-ok-text); font-size: 13px; margin-bottom: 8px; }
.err-msg { color: var(--c-danger); font-size: 13px; margin-bottom: 8px; }
.code-row { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
.qr { width:140px; height:140px; background:#fff; padding:6px; border-radius:8px; }
.pair-code { display:block; font-size:1.6rem; letter-spacing:.18em; margin-bottom:10px; }
</style>
