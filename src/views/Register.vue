<template>
  <div class="auth-page container fade-in">
    <div class="auth-card card">
      <h1>Create Account</h1>
      <p class="auth-sub">Register to start managing your smart home gateways.</p>
      <form @submit.prevent="handleRegister">
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input id="firstName" v-model="firstName" type="text" required placeholder="John" />
          </div>
          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input id="lastName" v-model="lastName" type="text" required placeholder="Doe" />
          </div>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" required minlength="6" placeholder="At least 6 characters" />
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" v-model="confirmPassword" type="password" required placeholder="Repeat your password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="passError" class="error">{{ passError }}</p>
        <button type="submit" :disabled="loading" class="btn btn-primary btn-block">
          {{ loading ? 'Creating account…' : 'Create Account' }}
        </button>
      </form>
      <p class="switch">Already have an account? <router-link to="/login">Sign in</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const passError = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  passError.value = ''

  if (password.value !== confirmPassword.value) {
    passError.value = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    await auth.register(firstName.value, lastName.value, email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display:flex;
  justify-content:center;
  padding-top:4rem;
  padding-bottom:4rem;
}

.auth-card {
  padding:2.5rem;
  width:100%;
  max-width:460px;
}

.auth-card h1 {
  font-size:1.5rem;
  font-weight:700;
  margin-bottom:0.25rem;
}

.auth-sub {
  color:var(--c-muted);
  font-size:0.9rem;
  margin-bottom:1.5rem;
}

.form-row {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:1rem;
}

.form-group {
  margin-bottom:1rem;
}

.form-group label {
  display:block;
  font-size:0.85rem;
  font-weight:600;
  margin-bottom:0.3rem;
  color:var(--c-text);
}

.form-group input {
  width:100%;
  padding:0.6rem 0.75rem;
  border:1px solid var(--c-border);
  border-radius:8px;
  font-size:0.9rem;
  transition:border-color 0.2s;
}

.form-group input:focus {
  outline:none;
  border-color:var(--c-accent);
  box-shadow:0 0 0 3px rgba(9, 105, 218, 0.1);
}

.btn-block {
  width:100%;
  justify-content:center;
  margin-top:0.5rem;
}

.error {
  color:var(--c-danger);
  font-size:0.85rem;
  margin-bottom:0.5rem;
}

.switch {
  text-align:center;
  margin-top:1.25rem;
  font-size:0.85rem;
  color:var(--c-muted);
}

.switch a {
  color:var(--c-accent);
  font-weight:600;
}

@media (max-width: 480px) {
  .auth-page { padding-top:2rem; padding-bottom:2rem; }
  .auth-card { padding:1.5rem; }
  .form-row { grid-template-columns:1fr; }
}
</style>
