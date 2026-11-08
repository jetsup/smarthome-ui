<template>
  <div class="auth-page container fade-in">
    <div class="auth-card card">
      <!-- Step 1: email + password -->
      <template v-if="step === 'credentials'">
        <h1>Sign In</h1>
        <p class="auth-sub">Welcome back. Sign in to manage your gateways.</p>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" required placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <PasswordInput id="password" v-model="password" required placeholder="••••••••" />
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit" :disabled="loading" class="btn btn-primary btn-block">
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>
        <p class="switch">Don't have an account? <router-link to="/register">Create one</router-link></p>
      </template>

      <!-- Step 2: two-step verification -->
      <template v-else>
        <div class="shield">
          <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>
        </div>
        <h1>Verify it's you</h1>
        <p class="auth-sub">Two-step verification is on for <strong>{{ email }}</strong>.</p>

        <div v-if="available.length > 1" class="tabs">
          <button v-for="m in available" :key="m.k" type="button" :class="['tab', { on: method === m.k }]" @click="pick(m.k)">{{ m.l }}</button>
        </div>

        <!-- approve on phone: the number is shown HERE, typed on the phone -->
        <template v-if="method === 'phone'">
          <template v-if="!challengeId">
            <p class="how">We'll send a request to your phone. A 6-digit number appears here. Type it on your phone and tap <strong>Approve</strong>.</p>
            <p v-if="error" class="error">{{ error }}</p>
            <button class="btn btn-primary btn-block" :disabled="loading" @click="startPhone">{{ loading ? 'Sending…' : 'Send request to my phone' }}</button>
          </template>
          <template v-else>
            <p class="how">Open SmartHomes on your phone and enter this number:</p>
            <div class="bignum">{{ spaced }}</div>
            <p class="hint center"><span class="pulse"></span> Waiting for approval… {{ remaining }}s</p>
            <p v-if="error" class="error">{{ error }}</p>
            <button type="button" class="link" @click="startPhone">Send a new request</button>
          </template>
        </template>

        <!-- authenticator / email code -->
        <template v-else-if="method === 'totp' || method === 'email'">
          <template v-if="method === 'email' && !challengeId">
            <p class="how">We'll email a 6-digit code to <strong>{{ emailTo || 'your address' }}</strong>.</p>
            <p v-if="error" class="error">{{ error }}</p>
            <button class="btn btn-primary btn-block" :disabled="loading" @click="sendEmail">{{ loading ? 'Sending…' : 'Email me a code' }}</button>
          </template>
          <form v-else @submit.prevent="verifyCode">
            <div class="form-group">
              <label for="code">{{ method === 'totp' ? 'Code from your authenticator app' : 'Code from the email' }}</label>
              <input id="code" v-model="code" class="code-input" inputmode="numeric" maxlength="7" placeholder="000 000" autocomplete="one-time-code" required autofocus />
              <p v-if="method === 'email'" class="hint">Sent to {{ emailTo }} · expires in {{ Math.floor(remaining / 60) }}:{{ String(remaining % 60).padStart(2, '0') }}</p>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
            <button type="submit" :disabled="loading || cleanCode.length !== 6" class="btn btn-primary btn-block">{{ loading ? 'Checking…' : 'Verify' }}</button>
            <button v-if="method === 'email'" type="button" class="link" @click="sendEmail">Send a new code</button>
          </form>
        </template>

        <!-- recovery code -->
        <form v-else @submit.prevent="verifyCode">
          <div class="form-group">
            <label for="rec">Recovery code</label>
            <input id="rec" v-model="recovery" class="code-input small" placeholder="xxxxx-xxxxx" autocomplete="off" required />
            <p class="hint">Each recovery code works once.</p>
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit" :disabled="loading || !recovery.trim()" class="btn btn-primary btn-block">{{ loading ? 'Checking…' : 'Use recovery code' }}</button>
        </form>

        <div class="alts">
          <button class="link" @click="backToStart"><Icon name="arrow-left" /> Back to sign in</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const step = ref('credentials')
const methods = ref({})
const method = ref('phone')
const emailTo = ref('')
const challengeId = ref('')
const number = ref('')
const code = ref('')
const recovery = ref('')
const remaining = ref(0)
let timer = null
let poller = null

const cleanCode = computed(() => code.value.replace(/\s+/g, ''))
const spaced = computed(() => (number.value.length === 6 ? number.value.slice(0, 3) + ' ' + number.value.slice(3) : number.value))
const available = computed(() => [
  methods.value.phone && { k: 'phone', l: 'Phone' },
  methods.value.totp && { k: 'totp', l: 'Authenticator' },
  methods.value.email && { k: 'email', l: 'Email' },
  methods.value.recovery && { k: 'recovery', l: 'Recovery code' },
].filter(Boolean))

function say(e, fallback) {
  error.value = e.response?.data?.error || fallback
}

function stopAll() {
  clearInterval(timer)
  clearInterval(poller)
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const r = await auth.login(email.value, password.value)
    if (r.mfaRequired) {
      methods.value = r.methods || {}
      emailTo.value = r.emailTo || ''
      method.value = available.value[0]?.k || 'recovery'
      step.value = 'mfa'
      password.value = ''
    } else {
      router.push('/dashboard')
    }
  } catch (e) {
    say(e, 'Invalid email or password')
  } finally {
    loading.value = false
  }
}

function pick(k) {
  stopAll()
  method.value = k
  challengeId.value = ''
  number.value = ''
  code.value = ''
  error.value = ''
}

function startTimer(seconds, expiredMsg) {
  clearInterval(timer)
  remaining.value = seconds
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      stopAll()
      challengeId.value = ''
      code.value = ''
      error.value = expiredMsg
    }
  }, 1000)
}

async function startPhone() {
  stopAll()
  error.value = ''
  loading.value = true
  try {
    const r = await auth.mfaChallenge('phone')
    challengeId.value = r.challengeId
    number.value = r.number
    startTimer(r.expiresIn || 120, 'The request expired. Send a new one.')
    poller = setInterval(async () => {
      try {
        const st = await auth.mfaPoll(challengeId.value)
        if (st === 'approved') {
          stopAll()
          router.push('/dashboard')
        } else if (st === 'denied' || st === 'expired') {
          stopAll()
          challengeId.value = ''
          error.value = st === 'denied' ? 'The sign-in was denied on your phone.' : 'The request expired. Send a new one.'
        }
      } catch { /* keep polling */ }
    }, 2000)
  } catch (e) {
    say(e, 'Could not reach your phone')
  } finally {
    loading.value = false
  }
}

async function sendEmail() {
  stopAll()
  error.value = ''
  loading.value = true
  try {
    const r = await auth.mfaChallenge('email')
    challengeId.value = r.challengeId
    emailTo.value = r.sentTo || emailTo.value
    code.value = ''
    startTimer(r.expiresIn || 600, 'That code expired. Send a new one.')
  } catch (e) {
    say(e, 'Could not send the email')
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  error.value = ''
  loading.value = true
  try {
    await auth.mfaVerify({
      method: method.value,
      challengeId: method.value === 'email' ? challengeId.value : undefined,
      code: method.value === 'recovery' ? recovery.value.trim() : cleanCode.value,
    })
    stopAll()
    router.push('/dashboard')
  } catch (e) {
    say(e, 'That code is not right')
    if (e.response?.status === 410 || e.response?.status === 429) challengeId.value = ''
  } finally {
    loading.value = false
  }
}

function backToStart() {
  stopAll()
  step.value = 'credentials'
  challengeId.value = ''
  number.value = ''
  code.value = ''
  recovery.value = ''
  error.value = ''
}

onUnmounted(stopAll)
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
  max-width:420px;
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
}
.shield { width:48px; height:48px; border-radius:14px; display:grid; place-items:center; margin-bottom:1rem; background:var(--c-info-bg); color:var(--c-accent); }
.shield svg { width:26px; height:26px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.how { color:var(--c-muted); font-size:0.88rem; line-height:1.5; margin-bottom:1rem; }
.hint { color:var(--c-muted); font-size:0.78rem; margin-top:0.35rem; }
.code-input { text-align:center; font-family:var(--font-mono); font-size:1.5rem; letter-spacing:0.25em; font-weight:600; }
.code-input.small { font-size:1.05rem; letter-spacing:0.12em; }
.alts { display:flex; flex-direction:column; gap:0.35rem; margin-top:1.25rem; align-items:center; }
.link { background:none; border:none; color:var(--c-accent); font-size:0.85rem; cursor:pointer; padding:0.2rem; margin-top:0.6rem; }
.link:hover { text-decoration:underline; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin: 4px 0 16px; }
.tab { border: 1px solid var(--border); background: transparent; color: var(--text-muted); padding: 6px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; }
.tab.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.bignum { font-size: 44px; font-weight: 800; letter-spacing: 8px; text-align: center; padding: 18px 0; margin: 10px 0; border-radius: 14px; background: rgba(0, 168, 232, 0.1); border: 1px solid rgba(0, 168, 232, 0.4); font-variant-numeric: tabular-nums; }
.center { text-align: center; }
.pulse { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-right: 6px; animation: pl 1.2s infinite; }
@keyframes pl { 50% { opacity: 0.25; } }
</style>
