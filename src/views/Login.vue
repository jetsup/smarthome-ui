<template>
  <div class="auth-page container fade-in">
    <div class="auth-card card">
      <h1>Sign In</h1>
      <p class="auth-sub">Welcome back. Sign in to manage your gateways.</p>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" required placeholder="••••••••" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn btn-primary btn-block">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
      <p class="switch">Don't have an account? <router-link to="/register">Create one</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
  padding-bottom: 4rem;
}

.auth-card {
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
}

.auth-card h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.auth-sub {
  color: #656d76;
  font-size: 0.9rem;
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
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.btn-block {
  width: 100%;
  justify-content: center;
  margin-top: 0.5rem;
}

.error {
  color: #bc1c1b;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.switch {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: #656d76;
}

.switch a {
  color: #0969da;
  font-weight: 600;
}

@media (max-width: 480px) {
  .auth-page { padding-top: 2rem; padding-bottom: 2rem; }
  .auth-card { padding: 1.5rem; }
}
</style>
