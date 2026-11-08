<template>
  <div class="fade-in">
    <router-link :to="'/gateways/' + $route.params.id" class="back-link"><Icon name="arrow-left" /> Back to Gateway</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>

    <template v-else-if="gw">
      <h3 class="page-title">{{ gw.name }} settings</h3>
      <p class="hint">Hardware address (MAC): <code>{{ gw.mac || 'not reported yet' }}</code> · ID <code>{{ gw.id }}</code></p>

      <!-- Gateway name -->
      <div class="card section">
        <div class="section-header">
          <h4>Gateway name</h4>
          <p class="hint">Shown here, in the app and on the HMI display.</p>
        </div>
        <div v-if="nameMsg" :class="nameOk ? 'wifi-success' : 'wifi-error'">{{ nameMsg }}</div>
        <form @submit.prevent="saveName" class="name-form">
          <input v-model="nameInput" maxlength="40" class="field-input" placeholder="Gateway name" required>
          <button type="submit" class="btn btn-primary" :disabled="nameSaving || !nameChanged">
            {{ nameSaving ? 'Saving…' : 'Save name' }}
          </button>
        </form>
      </div>

      <!-- Nodes -->
      <div class="card section">
        <div class="section-header">
          <h4>Nodes</h4>
          <p class="hint">Actions for every node on this gateway. Pairing and saved settings are kept.</p>
        </div>
        <button class="btn btn-secondary" :disabled="restarting" @click="restartNodes">
          {{ restarting ? 'Restarting…' : 'Restart all nodes' }}
        </button>
        <button class="btn btn-secondary" :disabled="reloading" style="margin-left:8px" @click="reloadNodes">
          {{ reloading ? 'Sending…' : 'Reload saved settings on all nodes' }}
        </button>
        <p class="hint">Reload sends every node its saved name, modules and key again, for nodes that were erased or re-flashed.</p>
      </div>

      <!-- Delete -->
      <div class="card section">
        <div class="section-header">
          <h4>Delete gateway</h4>
          <p class="hint">Removes this gateway with its displays, rules and saved Wi-Fi networks. Online nodes are unpaired so any gateway nearby can discover them. Nodes that cannot be reached are kept as unassigned nodes on the Gateways page. Asks for your password.</p>
        </div>
        <button class="btn btn-danger" :disabled="deleting" @click="deleteGateway">{{ deleting ? 'Deleting…' : 'Delete gateway' }}</button>
      </div>

      <!-- WiFi: Saved networks (priority order) -->
      <div class="card section">
        <div class="section-header">
          <h4>Wi-Fi networks</h4>
          <p class="hint">At start-up the gateway joins the highest network in this list that is in range. Use the arrows to change the priority.</p>
        </div>
        <div v-if="wifiError" class="wifi-error">{{ wifiError }}</div>
        <div v-if="credentials.length === 0" class="placeholder-text">No saved networks.</div>
        <div v-else class="cred-list">
          <div v-for="(cred, i) in credentials" :key="cred.id" class="cred-row">
            <span class="prio" :class="{ first: i === 0 }">{{ i + 1 }}</span>
            <div class="cred-info">
              <strong class="cred-ssid">{{ cred.ssid }}</strong>
              <span class="cred-pass">{{ i === 0 ? 'Preferred · ' : '' }}{{ cred.password ? cred.password[0] + '••••••' : 'Open network' }}</span>
            </div>
            <div class="row-actions">
              <button class="btn btn-sm icon-btn" :disabled="i === 0 || busy" @click="move(i, -1)" title="Higher priority"><Icon name="chevron-up" /></button>
              <button class="btn btn-sm icon-btn" :disabled="i === credentials.length - 1 || busy" @click="move(i, 1)" title="Lower priority"><Icon name="chevron-down" /></button>
              <button class="btn btn-danger btn-sm" @click="deleteCred(cred)">Forget</button>
            </div>
          </div>
        </div>
      </div>

      <!-- WiFi: Add new network -->
      <div class="card section">
        <div class="section-header">
          <h4>Add a network</h4>
          <p class="hint">New networks go to the bottom of the list. Move them up to make them preferred.</p>
        </div>
        <div v-if="wifiSaved" class="wifi-success">{{ wifiSavedMsg }}</div>
        <form @submit.prevent="saveWifi(false)" class="wifi-form">
          <div class="form-row">
            <label for="wifi-ssid">SSID</label>
            <input id="wifi-ssid" v-model="wifiSsid" placeholder="Network name" required maxlength="32" class="field-input">
          </div>
          <div class="form-row">
            <label for="wifi-pass">Password</label>
            <input id="wifi-pass" v-model="wifiPass" type="password" placeholder="Network password" maxlength="63" class="field-input">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="wifiSaving">{{ wifiSaving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="btn" :disabled="wifiSaving || !wifiSsid" @click="saveWifi(true)">Save and switch now</button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'
import { confirmDialog, notify } from '../services/dialog'

const route = useRoute()
const store = useGatewayStore()
const router = useRouter()
const deleting = ref(false)
const loading = ref(true)
const gw = computed(() => store.currentGateway)

const wifiSsid = ref('')
const wifiPass = ref('')
const wifiSaving = ref(false)
const wifiSaved = ref(false)
const wifiError = ref('')
const credentials = ref([])
const wifiSavedMsg = ref('')
const busy = ref(false)

const nameInput = ref('')
const nameSaving = ref(false)
const nameMsg = ref('')
const nameOk = ref(false)
const nameChanged = computed(() => !!gw.value && nameInput.value.trim() !== gw.value.name)

onMounted(async () => {
  await store.fetchOne(route.params.id)
  loading.value = false
  nameInput.value = gw.value?.name || ''
  await fetchCredentials()
})

async function fetchCredentials() {
  try {
    const { data } = await api.get(`/gateways/${route.params.id}/wifi`)
    credentials.value = Array.isArray(data) ? data : []
  } catch {
    // ignore
  }
}

const restarting = ref(false)
const reloading = ref(false)
async function deleteGateway() {
  const ok = await confirmDialog({
    title: 'Delete this gateway?',
    message: `${gw.value.name} is removed. Nodes that are online are unpaired so any gateway can discover them. Nodes that cannot be reached are kept as unassigned nodes.`,
    note: 'Enter your password to confirm.',
    confirmText: 'Delete',
    danger: true,
    password: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await store.remove(route.params.id, ok)
    notify('Gateway deleted.', 'ok')
    router.push('/gateways')
  } catch (e) {
    notify(e.response?.data?.error || 'Could not delete the gateway', 'error')
  } finally { deleting.value = false }
}

async function reloadNodes() {
  const ok = await confirmDialog({
    title: 'Reload saved settings on all nodes?',
    message: 'Every node on this gateway gets its saved settings again and restarts.',
    confirmText: 'Send',
  })
  if (!ok) return
  reloading.value = true
  try {
    const { data } = await api.post(`/gateways/${route.params.id}/reload-nodes`)
    notify(data.count ? `Settings sent to ${data.count} node${data.count === 1 ? '' : 's'}` : 'This gateway has no nodes yet.', 'ok')
  } catch (e) {
    notify(e.response?.data?.error || 'Could not send the settings', 'error')
  } finally {
    reloading.value = false
  }
}

async function restartNodes() {
  const ok = await confirmDialog({
    title: 'Restart all nodes?',
    message: 'Every node on this gateway restarts for a few seconds. Their settings and pairing are kept.',
    confirmText: 'Restart',
  })
  if (!ok) return
  restarting.value = true
  try {
    const { data } = await api.post(`/gateways/${route.params.id}/restart-nodes`)
    notify(data.count ? `Restarting ${data.count} node${data.count === 1 ? '' : 's'}…` : 'This gateway has no nodes yet.', 'ok')
  } catch (e) {
    notify(e.response?.data?.error || 'Could not restart the nodes', 'error')
  } finally {
    restarting.value = false
  }
}

async function saveName() {
  nameSaving.value = true
  nameMsg.value = ''
  try {
    const { data } = await api.put(`/gateways/${route.params.id}`, { name: nameInput.value })
    if (store.currentGateway) store.currentGateway.name = data.name
    nameInput.value = data.name
    nameOk.value = true
    nameMsg.value = 'Renamed. The gateway and any paired HMI will show the new name.'
  } catch (e) {
    nameOk.value = false
    nameMsg.value = 'Could not rename: ' + (e.response?.data?.error || e.message)
  } finally {
    nameSaving.value = false
  }
}

async function saveWifi(connectNow) {
  wifiSaving.value = true
  wifiError.value = ''
  wifiSaved.value = false
  try {
    await api.post(`/gateways/${route.params.id}/wifi`, {
      ssid: wifiSsid.value,
      password: wifiPass.value,
      connectNow,
    })
    wifiSavedMsg.value = connectNow
      ? 'Saved. The gateway is switching to this network.'
      : 'Saved at the bottom of the list.'
    wifiSaved.value = true
    wifiSsid.value = ''
    wifiPass.value = ''
    await fetchCredentials()
  } catch (e) {
    wifiError.value = 'Failed to save: ' + (e.response?.data?.error || e.message)
  } finally {
    wifiSaving.value = false
  }
}

async function move(i, delta) {
  const list = [...credentials.value]
  const j = i + delta
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  const before = credentials.value
  credentials.value = list
  busy.value = true
  wifiError.value = ''
  try {
    await api.put(`/gateways/${route.params.id}/wifi/order`, { ids: list.map((c) => c.id) })
  } catch (e) {
    credentials.value = before
    wifiError.value = 'Could not change the order: ' + (e.response?.data?.error || e.message)
  } finally {
    busy.value = false
  }
}

async function deleteCred(cred) {
  if (!(await confirmDialog({ title: 'Forget this network?', message: `“${cred.ssid}”`, note: 'The gateway will no longer connect to it.', confirmText: 'Forget', danger: true }))) return
  try {
    await api.delete(`/gateways/${route.params.id}/wifi/${cred.slug}`)
    await fetchCredentials()
  } catch (e) {
    wifiError.value = 'Failed to delete: ' + (e.response?.data?.error || e.message)
  }
}
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
.page-title {
  font-size:1.15rem;
  font-weight:700;
  margin-bottom:1.5rem;
}
.section {
  padding:1.5rem;
  margin-bottom:1rem;
}
.section-header {
  margin-bottom:1rem;
}
.section-header h4 {
  font-size:0.95rem;
  font-weight:700;
  margin-bottom:0;
}
.wifi-form {
  display:flex;
  flex-direction:column;
  gap:0.75rem;
}
.form-row {
  display:flex;
  flex-direction:column;
  gap:0.25rem;
}
.form-row label {
  font-size:0.8rem;
  font-weight:600;
  color:var(--c-text);
}
.field-input {
  padding:0.5rem 0.75rem;
  border:1px solid var(--c-border);
  border-radius:6px;
  font-size:0.85rem;
  background:var(--c-bg);
  width:100%;
  box-sizing:border-box;
}
.field-input:focus {
  outline:none;
  border-color:var(--c-accent);
  box-shadow:0 0 0 3px rgba(9,105,218,0.15);
}
.form-actions {
  margin-top:0.25rem;
}
.wifi-success {
  background:var(--c-ok-bg);
  color:var(--c-ok-text);
  padding:0.5rem;
  border-radius:6px;
  font-size:0.8rem;
  margin-bottom:0.5rem;
}
.wifi-error {
  background:var(--c-danger-bg);
  color:var(--c-danger);
  padding:0.5rem;
  border-radius:6px;
  font-size:0.8rem;
  margin-bottom:0.5rem;
}
.placeholder-text {
  color:var(--c-muted);
  font-size:0.85rem;
}
.state-msg {
  padding:2rem;
  text-align:center;
  color:var(--c-muted);
}
.cred-list {
  display:flex;
  flex-direction:column;
  gap:0.5rem;
}
.cred-row {
  display:flex;
  align-items:center;
  gap:0.75rem;
  justify-content:space-between;
  padding:0.5rem 0.75rem;
  background:var(--c-bg);
  border:1px solid var(--c-border);
  border-radius:6px;
}
.cred-info {
  flex:1;
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:0.1rem;
}
.cred-ssid {
  font-size:0.85rem;
  color:var(--c-text);
}
.cred-pass {
  font-size:0.72rem;
  color:var(--c-muted);
}
.btn-sm {
  padding:0.3rem 0.75rem;
  font-size:0.8rem;
}
.hint {
  color:var(--c-muted);
  font-size:0.8rem;
  margin:0.25rem 0 0;
  line-height:1.4;
}
.name-form {
  display:flex;
  gap:0.75rem;
  align-items:center;
  flex-wrap:wrap;
}
.name-form .field-input {
  flex:1;
  min-width:200px;
}
.prio {
  width:26px;
  height:26px;
  border-radius:50%;
  background:var(--c-surface-2);
  color:var(--c-text);
  font-size:0.75rem;
  font-weight:700;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.prio.first {
  background:var(--c-accent-btn);
  color:#fff;
}
.row-actions {
  display:flex;
  gap:0.4rem;
  align-items:center;
}
.icon-btn {
  padding:0.25rem 0.5rem;
  min-width:30px;
}
.icon-btn:disabled {
  opacity:0.35;
  cursor:default;
}
.form-actions {
  display:flex;
  gap:0.75rem;
  flex-wrap:wrap;
}
</style>
