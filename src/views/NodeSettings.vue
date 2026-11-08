<template>
  <div class="fade-in">
    <router-link :to="'/nodes/' + $route.params.nodeId" class="back-link">&larr; Back to node</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!node" class="empty-state card"><p>Node not found.</p></div>

    <template v-else>
      <h3 class="page-title">{{ node.name || 'Node ' + node.nodeId }} — Settings</h3>

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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
const nameChanged = computed(() => !!node.value && nameInput.value.trim() !== (node.value.name || ''))

onMounted(async () => {
  try {
    const { data } = await api.get(`/nodes/${route.params.nodeId}`)
    node.value = data
    nameInput.value = data.name || ''
  } catch { node.value = null }
  loading.value = false
})

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
</style>
