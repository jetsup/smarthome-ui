<template>
  <div class="link-page">
    <div v-if="step === 'login'" class="card">
      <h2>Link Gateway</h2>
      <p>Sign in to associate this gateway with your account.</p>
      <form @submit.prevent="signIn">
        <label>Email</label>
        <input v-model="email" type="email" required autocomplete="email" />

        <label>Password</label>
        <input v-model="pass" type="password" required autocomplete="current-password" />

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>

    <div v-else-if="step === 'select'" class="card">
      <h2>Select Gateway</h2>
      <p>Choose which gateway to link to this device.</p>

      <div v-if="gateways.length === 0" class="empty">
        <p>No gateways found on your account.</p>
        <p class="hint">Go to the <a href="/gateways/create" target="_blank">dashboard</a> and create a gateway first, then come back here.</p>
        <button class="btn-primary" @click="fetchGateways">Refresh</button>
      </div>

      <div v-else class="gw-list">
        <button
          v-for="gw in gateways"
          :key="gw.id"
          class="gw-option"
          @click="selectGateway(gw)"
        >
          <strong>{{ gw.name }}</strong>
          <code>{{ gw.id }}</code>
        </button>
      </div>
    </div>

    <div v-else-if="step === 'saving'" class="card">
      <h2>Saving...</h2>
      <p>Applying the API key to the gateway.</p>
      <div class="spinner"></div>
    </div>

    <div v-else-if="step === 'done'" class="card done">
      <h2>Gateway Linked</h2>
      <p>The API key has been saved to the gateway. It will reboot and connect securely.</p>
      <p class="key-display"><code>{{ apiKey }}</code></p>
    </div>

    <div v-else-if="step === 'error'" class="card">
      <h2>Linking Failed</h2>
      <p>{{ error }}</p>
      <p class="hint">Make sure you're connected to the gateway's setup network (SmartHome-Link).</p>
      <button class="btn-primary" @click="step = 'login'">Try Again</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../services/api'

const step = ref('login')
const email = ref('')
const pass = ref('')
const error = ref('')
const loading = ref(false)
const gateways = ref([])
const apiKey = ref('')

async function signIn() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/login', {
      email: email.value,
      password: pass.value,
    })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    await fetchGateways()
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed'
    loading.value = false
  }
}

async function fetchGateways() {
  try {
    const gwRes = await api.get('/gateways')
    gateways.value = gwRes.data
    step.value = 'select'
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to load gateways'
  } finally {
    loading.value = false
  }
}

async function selectGateway(gw) {
  error.value = ''
  step.value = 'saving'
  try {
    const { data } = await api.get(`/gateways/${gw.id}/api-key`)
    apiKey.value = data.apiKey

    const res = await fetch('/gateway/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gatewayId: gw.id,
        apiKey: data.apiKey,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Gateway rejected configuration')
    }
    step.value = 'done'
  } catch (e) {
    error.value = e.message || 'Failed to configure gateway'
    step.value = 'error'
  }
}
</script>

<style scoped>
.link-page {
  display:flex;
  justify-content:center;
  padding-top:3rem;
}

.card {
  background:var(--c-surface);
  padding:2.5rem;
  border-radius:12px;
  box-shadow:0 4px 20px rgba(0, 0, 0, 0.08);
  width:100%;
  max-width:420px;
}

.card h2 {
  margin-bottom:0.5rem;
}

.card p {
  color:var(--c-muted);
  margin-bottom:1.5rem;
  font-size:0.9rem;
}

label {
  display:block;
  margin:0.75rem 0 0.25rem;
  font-size:0.9rem;
  color:var(--c-muted);
}

input {
  width:100%;
  padding:0.65rem 0.75rem;
  border:1px solid var(--c-border);
  border-radius:6px;
  font-size:0.95rem;
  box-sizing:border-box;
}

input:focus {
  outline:none;
  border-color:#0f3460;
}

.btn-primary {
  width:100%;
  margin-top:1.25rem;
  padding:0.7rem;
  background:#0f3460;
  color:#fff;
  border:none;
  border-radius:8px;
  font-size:1rem;
  font-weight:600;
  cursor:pointer;
}

.btn-primary:hover {
  background:var(--c-accent-strong);
}

.error {
  color:var(--c-danger);
  font-size:0.85rem;
  margin-top:0.5rem;
}

.empty p {
  margin-bottom:0.75rem;
}

.hint {
  font-size:0.85rem;
  color:var(--c-muted);
}

.hint a {
  color:#0f3460;
}

.gw-list {
  display:flex;
  flex-direction:column;
  gap:0.75rem;
}

.gw-option {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0.75rem 1rem;
  border:1px solid var(--c-border);
  border-radius:8px;
  background:var(--c-surface-2);
  cursor:pointer;
  font-size:0.95rem;
  text-align:left;
  width:100%;
}

.gw-option:hover {
  border-color:#0f3460;
  background:var(--c-info-bg);
}

.gw-option code {
  font-size:0.75rem;
  color:var(--c-muted);
}

.done h2 {
  color:var(--c-ok-text);
}

.key-display {
  background:var(--c-surface-2);
  padding:0.75rem;
  border-radius:6px;
  font-family:monospace;
  word-break:break-all;
  text-align:center;
}

.key-display code {
  font-size:0.8rem;
}

.spinner {
  border:3px solid var(--c-surface-2);
  border-top:3px solid #0f3460;
  border-radius:50%;
  width:32px;
  height:32px;
  animation:spin 0.8s linear infinite;
  margin:1rem auto;
}

@keyframes spin {
  to { transform:rotate(360deg); }
}
</style>
