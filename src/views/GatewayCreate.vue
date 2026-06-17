<template>
  <div class="fade-in" style="max-width: 560px;">
    <form @submit.prevent="createGateway" class="create-form card">
      <div class="form-group">
        <label for="name">Gateway Name</label>
        <input id="name" v-model="name" type="text" required placeholder="e.g. Living Room Gateway" />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="loading" class="btn btn-primary">
        {{ loading ? 'Creating…' : 'Create Gateway' }}
      </button>
    </form>

    <div v-if="created" class="result-card card">
      <h3>Gateway Created</h3>
      <div class="result-details">
        <div><span>Name</span> {{ created.name }}</div>
        <div><span>Gateway ID</span> <code>{{ created.id }}</code></div>
        <div><span>API Key</span> <code class="key-value">{{ created.apiKey }}</code></div>
      </div>
      <div class="warning">
        <strong>Important:</strong> Copy the API key now. You won't be able to see it again.
      </div>
      <div class="result-actions">
        <button class="btn btn-secondary" @click="copyKey">Copy API Key</button>
        <router-link :to="`/gateways/${created.id}`" class="btn btn-primary">View Gateway</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useGatewayStore } from '../stores/gateways'

const store = useGatewayStore()

const name = ref('')
const error = ref('')
const loading = ref(false)
const created = ref(null)

async function createGateway() {
  error.value = ''
  loading.value = true
  try {
    created.value = await store.create(name.value)
    name.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to create gateway'
  } finally {
    loading.value = false
  }
}

function copyKey() {
  if (created.value) {
    navigator.clipboard.writeText(created.value.apiKey)
  }
}
</script>

<style scoped>
.create-form {
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: #1f2328;
}

.form-group input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  font-size: 0.9rem;
}

.form-group input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.error {
  color: #bc1c1b;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.result-card {
  padding: 2rem;
}

.result-card h3 {
  font-size: 1.15rem;
  color: #116329;
  margin-bottom: 1rem;
}

.result-details {
  margin-bottom: 1rem;
}

.result-details > div {
  padding: 0.4rem 0;
  font-size: 0.9rem;
  display: flex;
  gap: 1rem;
}

.result-details span {
  color: #656d76;
  min-width: 100px;
}

code {
  background: #f3f4f6;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.key-value {
  font-size: 0.75rem;
  word-break: break-all;
}

.warning {
  background: #fff8c5;
  border: 1px solid #d4a72c;
  color: #7a5d12;
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.result-actions {
  display: flex;
  gap: 0.75rem;
}
</style>
