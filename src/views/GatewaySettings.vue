<template>
  <div class="fade-in">
    <router-link :to="'/gateways/' + $route.params.id" class="back-link">&larr; Back to Gateway</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>

    <template v-else-if="gw">
      <h3 class="page-title">{{ gw.name }} — Settings</h3>

      <!-- WiFi: Add new network -->
      <div class="card section">
        <div class="section-header">
          <h4>Add WiFi Network</h4>
        </div>
        <div v-if="wifiSaved" class="wifi-success">WiFi settings saved and sent to gateway.</div>
        <div v-if="wifiError" class="wifi-error">{{ wifiError }}</div>
        <form @submit.prevent="saveWifi" class="wifi-form">
          <div class="form-row">
            <label for="wifi-ssid">SSID</label>
            <input id="wifi-ssid" v-model="wifiSsid" placeholder="Network name" required class="field-input">
          </div>
          <div class="form-row">
            <label for="wifi-pass">Password</label>
            <input id="wifi-pass" v-model="wifiPass" type="password" placeholder="Network password" class="field-input">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="wifiSaving">{{ wifiSaving ? 'Saving…' : 'Save & Connect' }}</button>
          </div>
        </form>
      </div>

      <!-- WiFi: Saved networks -->
      <div class="card section">
        <div class="section-header">
          <h4>Saved Networks</h4>
        </div>
        <div v-if="credentials.length === 0" class="placeholder-text">No saved networks.</div>
        <div v-else class="cred-list">
          <div v-for="cred in credentials" :key="cred.id" class="cred-row">
            <div class="cred-info">
              <strong class="cred-ssid">{{ cred.ssid }}</strong>
              <span class="cred-pass">{{ cred.password ? cred.password[0] + '••••••' : '(open)' }}</span>
            </div>
            <button class="btn btn-danger btn-sm" @click="deleteCred(cred.id)">Delete</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGatewayStore } from '../stores/gateways'
import api from '../services/api'

const route = useRoute()
const store = useGatewayStore()
const loading = ref(true)
const gw = computed(() => store.currentGateway)

const wifiSsid = ref('')
const wifiPass = ref('')
const wifiSaving = ref(false)
const wifiSaved = ref(false)
const wifiError = ref('')
const credentials = ref([])

onMounted(async () => {
  await store.fetchOne(route.params.id)
  loading.value = false
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

async function saveWifi() {
  wifiSaving.value = true
  wifiError.value = ''
  wifiSaved.value = false
  try {
    await api.post(`/gateways/${route.params.id}/wifi`, {
      ssid: wifiSsid.value,
      password: wifiPass.value,
    })
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

async function deleteCred(credId) {
  try {
    await api.delete(`/gateways/${route.params.id}/wifi/${credId}`)
    await fetchCredentials()
  } catch (e) {
    wifiError.value = 'Failed to delete: ' + (e.response?.data?.error || e.message)
  }
}
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
.page-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}
.section {
  padding: 1.5rem;
  margin-bottom: 1rem;
}
.section-header {
  margin-bottom: 1rem;
}
.section-header h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0;
}
.wifi-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.form-row label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2328;
}
.field-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 0.85rem;
  background: #f6f8fa;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9,105,218,0.15);
}
.form-actions {
  margin-top: 0.25rem;
}
.wifi-success {
  background: #dafbe1;
  color: #116329;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}
.wifi-error {
  background: #ffebe9;
  color: #cf222e;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}
.placeholder-text {
  color: #656d76;
  font-size: 0.85rem;
}
.state-msg {
  padding: 2rem;
  text-align: center;
  color: #656d76;
}
.cred-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cred-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
}
.cred-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.cred-ssid {
  font-size: 0.85rem;
  color: #1f2328;
}
.cred-pass {
  font-size: 0.72rem;
  color: #656d76;
}
.btn-sm {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
}
</style>
