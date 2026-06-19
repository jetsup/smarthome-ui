<template>
  <div class="fade-in">
    <router-link :to="'/gateways/' + $route.params.id" class="back-link">&larr; Back to Gateway</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>

    <template v-else-if="gw">
      <h3 class="page-title">{{ gw.name }} — Settings</h3>

      <!-- WiFi -->
      <div class="card section">
        <div class="section-header">
          <h4>WiFi Network</h4>
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

      <!-- Future settings placeholder -->
      <div class="card section">
        <div class="section-header">
          <h4>More Settings</h4>
        </div>
        <p class="placeholder-text">Additional configuration options will be added here.</p>
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

onMounted(async () => {
  await store.fetchOne(route.params.id)
  loading.value = false
})

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
  } catch (e) {
    wifiError.value = 'Failed to save: ' + (e.response?.data?.error || e.message)
  } finally {
    wifiSaving.value = false
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
</style>
