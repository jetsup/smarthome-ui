<template>
  <div class="fade-in profile">
    <div v-if="loading" class="state-msg">Loading…</div>
    <template v-else-if="me">
      <!-- Identity header -->
      <div class="card hero">
        <span class="big-avatar">{{ initials }}</span>
        <div class="hero-text">
          <h3>{{ me.firstName }} {{ me.lastName }}</h3>
          <p>{{ me.email }}</p>
          <p class="since">Member since {{ since }}</p>
        </div>
        <span :class="['pill', me.mfaEnabled ? 'pill-on' : 'pill-off']">
          {{ me.mfaEnabled ? 'Two-step on' : 'Two-step off' }}
        </span>
      </div>

      <!-- Account details -->
      <section class="card sec">
        <header><h4>Account details</h4><p class="hint">Your name and the email you sign in with.</p></header>
        <div v-if="detailsMsg" :class="detailsOk ? 'ok-box' : 'err-box'">{{ detailsMsg }}</div>
        <form class="grid" @submit.prevent="saveDetails">
          <label>First name<input v-model="form.firstName" maxlength="100" required /></label>
          <label>Last name<input v-model="form.lastName" maxlength="100" required /></label>
          <label class="span2">Email<input v-model="form.email" type="email" required /></label>
          <label v-if="emailChanged" class="span2">
            Current password <span class="req">(needed to change your email)</span>
            <PasswordInput v-model="form.currentPassword" autocomplete="current-password" required />
          </label>
          <div class="span2 actions">
            <button class="btn btn-primary" :disabled="savingDetails || !detailsChanged">{{ savingDetails ? 'Saving…' : 'Save changes' }}</button>
          </div>
        </form>
      </section>

      <!-- Password -->
      <section class="card sec">
        <header><h4>Password</h4><p class="hint">Changing it signs you out everywhere else.</p></header>
        <div v-if="pwMsg" :class="pwOk ? 'ok-box' : 'err-box'">{{ pwMsg }}</div>
        <form class="grid" @submit.prevent="changePassword">
          <label class="span2">Current password<PasswordInput v-model="pw.current" autocomplete="current-password" required /></label>
          <label>New password<PasswordInput v-model="pw.next" minlength="8" autocomplete="new-password" required /></label>
          <label>Confirm new password<PasswordInput v-model="pw.confirm" minlength="8" autocomplete="new-password" required /></label>
          <div class="span2 strength" v-if="pw.next">
            <span :class="['bar', strength.level]" :style="{ width: strength.pct + '%' }"></span>
            <small>{{ strength.label }}</small>
          </div>
          <div class="span2 actions">
            <button class="btn btn-primary" :disabled="savingPw || !pw.current || pw.next.length < 8 || pw.next !== pw.confirm">
              {{ savingPw ? 'Updating…' : 'Update password' }}
            </button>
            <small v-if="pw.confirm && pw.next !== pw.confirm" class="err-inline">Passwords don't match</small>
          </div>
        </form>
      </section>

      <!-- Security -->
      <section class="card sec">
        <header>
          <h4>Two-step verification</h4>
          <p class="hint">Optional. After your password you confirm each sign-in with any method you turn on.</p>
        </header>
        <div v-if="mfaMsg" :class="mfaOk ? 'ok-box' : 'err-box'">{{ mfaMsg }}</div>

        <div class="methods">
          <div class="method">
            <div><strong>Approve in the app</strong><small>A request on your phone; type the number shown on this sign-in screen and tap Approve.</small></div>
            <button v-if="me.methods.phone" class="btn btn-danger btn-sm" @click="askPassword('phone')">Turn off</button>
            <button v-else class="btn btn-primary btn-sm" :disabled="busy || me.phones.length === 0" :title="me.phones.length === 0 ? 'Sign in to the SmartHomes app first' : ''" @click="startEnable">Set up</button>
          </div>
          <div class="method">
            <div><strong>Authenticator app</strong><small>Codes from Google Authenticator, Microsoft Authenticator, Authy…</small></div>
            <button v-if="me.methods.totp" class="btn btn-danger btn-sm" @click="askPassword('totp')">Turn off</button>
            <button v-else class="btn btn-primary btn-sm" :disabled="busy" @click="startTotp">Set up</button>
          </div>
          <div v-if="me.emailConfigured" class="method">
            <div><strong>Email codes</strong><small>A code sent to {{ me.email }}, valid for {{ me.emailCodeMinutes }} minutes.</small></div>
            <button v-if="me.methods.email" class="btn btn-danger btn-sm" @click="askPassword('email')">Turn off</button>
            <button v-else class="btn btn-primary btn-sm" :disabled="busy" @click="startEmail">Set up</button>
          </div>
        </div>

        <!-- setup wizards -->
        <form v-if="wizard === 'confirm'" class="confirm" @submit.prevent="confirmEnable">
          <p class="step-title"><span class="n">1</span> Enter the number shown on your phone</p>
          <input v-model="enableCode" class="code-input" inputmode="numeric" maxlength="7" placeholder="000 000" autofocus required />
          <div class="actions">
            <button class="btn btn-primary" :disabled="busy || enableCode.replace(/\s/g, '').length !== 6">Confirm</button>
            <button type="button" class="btn btn-secondary" @click="cancelEnable">Cancel</button>
            <button type="button" class="link" @click="startEnable">Send a new number</button>
          </div>
        </form>

        <form v-else-if="wizard === 'totp'" class="confirm" @submit.prevent="confirmTotp">
          <p class="step-title"><span class="n">1</span> Scan with your authenticator app</p>
          <img v-if="totp.qr" :src="totp.qr" alt="QR code" class="qr" />
          <p class="hint">Can't scan? Enter this key by hand: <code>{{ totp.secret }}</code></p>
          <p class="step-title"><span class="n">2</span> Enter the 6-digit code it shows</p>
          <input v-model="enableCode" class="code-input" inputmode="numeric" maxlength="7" placeholder="000 000" required />
          <div class="actions">
            <button class="btn btn-primary" :disabled="busy || enableCode.replace(/\s/g, '').length !== 6">Turn on</button>
            <button type="button" class="btn btn-secondary" @click="cancelEnable">Cancel</button>
          </div>
        </form>

        <form v-else-if="wizard === 'email'" class="confirm" @submit.prevent="confirmEmail">
          <p class="step-title"><span class="n">1</span> Enter the code we emailed to {{ sentTo }}</p>
          <input v-model="enableCode" class="code-input" inputmode="numeric" maxlength="7" placeholder="000 000" autofocus required />
          <div class="actions">
            <button class="btn btn-primary" :disabled="busy || enableCode.replace(/\s/g, '').length !== 6">Turn on</button>
            <button type="button" class="btn btn-secondary" @click="cancelEnable">Cancel</button>
            <button type="button" class="link" @click="startEmail">Send a new code</button>
          </div>
        </form>

        <div v-else-if="wizard === 'codes' || wizard === 'regen'" class="codes-box">
          <p class="step-title">{{ wizard === 'regen' ? 'Your new recovery codes' : 'Save your recovery codes' }}</p>
          <p class="hint">If you lose your phone, each of these signs you in once. They are shown <strong>only now</strong>.</p>
          <div class="codes"><code v-for="c in newCodes" :key="c">{{ c }}</code></div>
          <div class="actions">
            <button class="btn btn-secondary" @click="copyCodes">{{ copied ? 'Copied' : 'Copy' }}</button>
            <button class="btn btn-secondary" @click="downloadCodes">Download .txt</button>
          </div>
          <label class="check"><input v-model="saved" type="checkbox" /> I've saved these codes somewhere safe</label>
          <button class="btn btn-primary" :disabled="!saved" @click="finishEnable">Done</button>
        </div>

        <form v-if="pwAction" class="pwbox" @submit.prevent="runPwAction">
          <label>
            Confirm your password to {{ pwAction === 'regen' ? 'get new recovery codes' : 'turn this method off' }}
            <PasswordInput v-model="actionPw" autocomplete="current-password" autofocus required />
          </label>
          <div class="actions">
            <button class="btn btn-primary" :disabled="busy || !actionPw">Confirm</button>
            <button type="button" class="btn btn-secondary" @click="pwAction = ''">Cancel</button>
          </div>
        </form>

        <p v-if="me.mfaEnabled" class="status-line">
          <span class="dot-on"></span> Two-step verification is <strong>on</strong>.
          <span :class="['left', me.recoveryCodesLeft <= 2 ? 'low' : '']">{{ me.recoveryCodesLeft }} recovery codes left</span>
          <button class="link" @click="askPassword('regen')">Get new recovery codes</button>
        </p>

        <!-- Phones -->
        <div v-if="me.phones.length" class="phones">
          <div class="phones-head"><strong>Phones that can approve</strong></div>
          <div v-for="p in me.phones" :key="p.id" class="phone">
            <svg viewBox="0 0 24 24" class="ico"><rect x="7" y="2.5" width="10" height="19" rx="2.4" /><path d="M11 18.5h2" /></svg>
            <div class="phone-main">
              <strong>{{ p.name }}</strong>
              <small>{{ [(p.manufacturer + ' ' + p.model).trim(), p.os].filter(Boolean).join(' · ') }} · last active {{ ago(p.lastSeen) }}</small>
            </div>
            <button class="btn btn-danger btn-sm" :disabled="me.methods.phone && me.phones.length <= 1" @click="removePhone(p)"
              :title="me.methods.phone && me.phones.length <= 1 ? 'Your only phone. Turn off app approval first' : 'Remove this phone'">Remove</button>
          </div>
        </div>
      </section>

      <!-- Signed-in devices -->
      <section class="card sec">
        <header>
          <h4>Signed-in devices</h4>
          <p class="hint">Where your account is signed in right now. Sign out any you don't recognise.</p>
        </header>
        <div v-for="x in sessions" :key="x.id" class="phone">
          <svg viewBox="0 0 24 24" class="ico">
            <template v-if="x.kind === 'app'"><rect x="7" y="2.5" width="10" height="19" rx="2.4" /><path d="M11 18.5h2" /></template>
            <template v-else><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></template>
          </svg>
          <div class="phone-main">
            <strong>{{ x.label }} <span v-if="x.current" class="this">this device</span></strong>
            <small>{{ x.ip }} · last active {{ ago(x.lastSeen) }}</small>
          </div>
          <button v-if="!x.current" class="btn btn-danger btn-sm" @click="revoke(x)">Sign out</button>
        </div>
        <div v-if="sessions.length > 1" class="actions"><button class="btn btn-secondary" @click="revokeOthers">Sign out all other devices</button></div>
      </section>
    </template>
    <div v-else class="card sec">{{ loadError || 'Could not load your profile.' }}</div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import api from '../services/api'
import { confirmDialog, notify } from '../services/dialog'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const me = ref(null)
const loading = ref(true)
const loadError = ref('')

const form = reactive({ firstName: '', lastName: '', email: '', currentPassword: '' })
const savingDetails = ref(false)
const detailsMsg = ref('')
const detailsOk = ref(false)

const pw = reactive({ current: '', next: '', confirm: '' })
const savingPw = ref(false)
const pwMsg = ref('')
const pwOk = ref(false)

const mfaMsg = ref('')
const mfaOk = ref(false)
const busy = ref(false)
const wizard = ref('idle') // idle | confirm | totp | email | codes | regen
const totp = reactive({ qr: '', secret: '' })
const sentTo = ref('')
const sessions = ref([])
const challengeId = ref('')
const enableCode = ref('')
const newCodes = ref([])
const saved = ref(false)
const copied = ref(false)
const pwAction = ref('')
const actionPw = ref('')

const initials = computed(() => ((me.value?.firstName || '?')[0] + (me.value?.lastName || '')[0]).toUpperCase())
const since = computed(() => (me.value?.createdAt ? new Date(me.value.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : ''))
const emailChanged = computed(() => !!me.value && form.email.trim().toLowerCase() !== me.value.email)
const detailsChanged = computed(() => !!me.value && (form.firstName.trim() !== me.value.firstName || form.lastName.trim() !== me.value.lastName || emailChanged.value))

const strength = computed(() => {
  const v = pw.next
  let score = 0
  if (v.length >= 8) score++
  if (v.length >= 12) score++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
  if (/\d/.test(v)) score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  const lv = ['weak', 'weak', 'fair', 'good', 'strong', 'strong'][score]
  return { level: lv, pct: Math.max(12, score * 20), label: { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' }[lv] }
})

function ago(ts) {
  if (!ts) return 'never'
  const s = (Date.now() - new Date(ts).getTime()) / 1000
  if (s < 90) return 'just now'
  if (s < 3600) return Math.round(s / 60) + ' min ago'
  if (s < 86400) return Math.round(s / 3600) + ' h ago'
  return Math.round(s / 86400) + ' days ago'
}

const err = (e, fb) => e.response?.data?.error || fb

async function load() {
  try {
    const { data } = await api.get('/profile')
    me.value = data
    Object.assign(form, { firstName: data.firstName, lastName: data.lastName, email: data.email, currentPassword: '' })
  } catch (e) {
    loadError.value = err(e, 'Could not load your profile.')
  } finally {
    loading.value = false
  }
  loadSessions()
}

async function saveDetails() {
  savingDetails.value = true
  detailsMsg.value = ''
  try {
    const { data } = await api.put('/profile', { ...form })
    auth.updateUser(data.user, data.token)
    await load()
    detailsOk.value = true
    detailsMsg.value = 'Saved.'
  } catch (e) {
    detailsOk.value = false
    detailsMsg.value = err(e, 'Could not save your details')
  } finally {
    savingDetails.value = false
  }
}

async function changePassword() {
  savingPw.value = true
  pwMsg.value = ''
  try {
    const { data } = await api.post('/profile/password', { currentPassword: pw.current, newPassword: pw.next })
    auth.updateUser({}, data.token)
    Object.assign(pw, { current: '', next: '', confirm: '' })
    pwOk.value = true
    pwMsg.value = 'Password updated. Other sessions were signed out.'
  } catch (e) {
    pwOk.value = false
    pwMsg.value = err(e, 'Could not change your password')
  } finally {
    savingPw.value = false
  }
}

// ── two-step verification ──
function say(ok, text) { mfaOk.value = ok; mfaMsg.value = text }

async function startEnable() {
  pwAction.value = ''; actionPw.value = ''
  busy.value = true; mfaMsg.value = ''
  try {
    const { data } = await api.post('/mfa/enable/start', {})
    challengeId.value = data.challengeId
    enableCode.value = ''
    wizard.value = 'confirm'
    say(true, 'A number is now showing on your phone.')
  } catch (e) {
    say(false, err(e, 'Could not start'))
  } finally { busy.value = false }
}

function cancelEnable() { wizard.value = 'idle'; mfaMsg.value = '' }

function showCodes(codes) {
  if (codes && codes.length) {
    newCodes.value = codes; saved.value = false; wizard.value = 'codes'; mfaMsg.value = ''
  } else {
    wizard.value = 'idle'
    load().then(() => say(true, 'Turned on.'))
  }
}

async function confirmEnable() {
  busy.value = true; mfaMsg.value = ''
  try {
    const { data } = await api.post('/mfa/enable/confirm', { challengeId: challengeId.value, code: enableCode.value.replace(/\s/g, '') })
    showCodes(data.recoveryCodes)
  } catch (e) {
    say(false, err(e, 'That number is not right'))
    if ([410, 429].includes(e.response?.status)) wizard.value = 'idle'
  } finally { busy.value = false }
}

async function startTotp() {
  pwAction.value = ''; actionPw.value = ''
  busy.value = true; mfaMsg.value = ''
  try {
    const { data } = await api.post('/mfa/totp/setup', {})
    totp.qr = data.qr; totp.secret = data.secret
    enableCode.value = ''; wizard.value = 'totp'
  } catch (e) { say(false, err(e, 'Could not start')) } finally { busy.value = false }
}

async function confirmTotp() {
  busy.value = true; mfaMsg.value = ''
  try {
    const { data } = await api.post('/mfa/totp/confirm', { code: enableCode.value.replace(/\s/g, '') })
    showCodes(data.recoveryCodes)
  } catch (e) { say(false, err(e, 'That code is not right')) } finally { busy.value = false }
}

async function startEmail() {
  pwAction.value = ''; actionPw.value = ''
  busy.value = true; mfaMsg.value = ''
  try {
    const { data } = await api.post('/mfa/email/start', {})
    challengeId.value = data.challengeId; sentTo.value = data.sentTo
    enableCode.value = ''; wizard.value = 'email'
    say(true, `We emailed a code to ${data.sentTo}. It is valid for ${Math.round(data.expiresIn / 60)} minutes.`)
  } catch (e) { say(false, err(e, 'Could not send the email')) } finally { busy.value = false }
}

async function confirmEmail() {
  busy.value = true; mfaMsg.value = ''
  try {
    const { data } = await api.post('/mfa/email/confirm', { challengeId: challengeId.value, code: enableCode.value.replace(/\s/g, '') })
    showCodes(data.recoveryCodes)
  } catch (e) {
    say(false, err(e, 'That code is not right'))
    if ([410, 429].includes(e.response?.status)) wizard.value = 'idle'
  } finally { busy.value = false }
}

async function finishEnable() {
  newCodes.value = []; wizard.value = 'idle'
  await load()
  say(true, 'Two-step verification is on.')
}

function askPassword(kind) {
  // one operation at a time: abandon any setup that is half done
  if (['confirm', 'totp', 'email'].includes(wizard.value)) wizard.value = 'idle'
  enableCode.value = ''
  pwAction.value = kind; actionPw.value = ''; mfaMsg.value = ''
}

async function runPwAction() {
  busy.value = true
  try {
    if (pwAction.value === 'regen') {
      const { data } = await api.post('/mfa/recovery', { password: actionPw.value })
      newCodes.value = data.recoveryCodes
      saved.value = false
      wizard.value = 'regen'
      pwAction.value = ''
      await load()
      mfaMsg.value = ''
    } else {
      await api.post(`/mfa/methods/${pwAction.value}/disable`, { password: actionPw.value })
      pwAction.value = ''
      await load()
      say(true, 'Turned off.')
    }
  } catch (e) {
    say(false, err(e, 'Something went wrong'))
  } finally { busy.value = false; actionPw.value = '' }
}

async function loadSessions() {
  try { sessions.value = (await api.get('/sessions')).data } catch { sessions.value = [] }
}

async function revoke(x) {
  if (!(await confirmDialog({ title: 'Sign out this device?', message: `“${x.label}” will be signed out immediately.`, confirmText: 'Sign out', danger: true }))) return
  try { await api.delete(`/sessions/${x.slug}`); await loadSessions() } catch (e) { say(false, err(e, 'Could not sign it out')) }
}

async function revokeOthers() {
  try { const { data } = await api.post('/sessions/revoke-others', {}); await loadSessions(); say(true, `Signed out ${data.signedOut} other device(s).`) } catch (e) { say(false, err(e, 'Could not sign them out')) }
}

async function removePhone(p) {
  if (!(await confirmDialog({ title: 'Remove this phone?', message: `“${p.name}” will stop receiving sign-in requests.`, confirmText: 'Remove', danger: true }))) return
  try {
    await api.delete(`/mfa/devices/${p.slug}`)
    await load()
    say(true, 'Phone removed.')
  } catch (e) {
    say(false, err(e, 'Could not remove this phone'))
  }
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(newCodes.value.join('\n'))
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch { /* clipboard unavailable */ }
}

function downloadCodes() {
  const blob = new Blob([`SmartHome recovery codes for ${me.value.email}\nEach code works once.\n\n${newCodes.value.join('\n')}\n`], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'smarthome-recovery-codes.txt'
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(load)
</script>

<style scoped>
.profile { max-width:820px; display:flex; flex-direction:column; gap:1.1rem; }
.state-msg { color:var(--c-muted); }
.hero { display:flex; align-items:center; gap:1.1rem; padding:1.4rem 1.6rem; position:relative; overflow:hidden; }
.hero::after { content:''; position:absolute; inset:0; background:radial-gradient(60% 120% at 0% 0%, var(--c-hover), transparent 70%); pointer-events:none; }
.big-avatar { width:64px; height:64px; border-radius:50%; display:grid; place-items:center; font-size:1.3rem; font-weight:800; color:#fff; background:var(--c-grad); box-shadow:0 0 0 3px var(--c-surface), 0 0 0 5px var(--c-glow); z-index:1; flex-shrink:0; }
.hero-text { flex:1; z-index:1; min-width:0; }
.hero-text h3 { font-size:1.2rem; margin:0; }
.hero-text p { margin:0.15rem 0 0; color:var(--c-muted); font-size:0.9rem; }
.since { font-size:0.78rem !important; font-family:var(--font-mono); }
.pill { z-index:1; font-size:0.72rem; font-weight:700; padding:0.3rem 0.75rem; border-radius:999px; flex-shrink:0; }
.pill-on { background:var(--c-ok-bg); color:var(--c-ok-text); }
.pill-off { background:var(--c-surface-2); color:var(--c-muted); }

.sec { padding:1.5rem; }
.sec header { margin-bottom:1rem; }
.sec h4 { font-size:1rem; margin:0; }
.hint { color:var(--c-muted); font-size:0.82rem; margin:0.25rem 0 0; line-height:1.45; }

.grid { display:grid; grid-template-columns:1fr 1fr; gap:0.9rem 1rem; }
.span2 { grid-column:1 / -1; }
label { display:flex; flex-direction:column; gap:0.35rem; font-size:0.8rem; font-weight:600; color:var(--c-text); }
.req { font-weight:400; color:var(--c-muted); }
input { padding:0.6rem 0.8rem; border:1px solid var(--c-border); border-radius:10px; background:var(--c-bg); color:var(--c-text); font-size:0.92rem; font-family:inherit; width:100%; transition:border-color 0.15s, box-shadow 0.15s; }
input:focus { outline:none; border-color:var(--c-accent); box-shadow:0 0 0 3px var(--c-glow); }
input[type='checkbox'] { width:auto; }
.actions { display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap; margin-top:0.25rem; }
.err-inline { color:var(--c-danger); font-size:0.8rem; }
.ok-box, .err-box { padding:0.6rem 0.8rem; border-radius:10px; font-size:0.85rem; margin-bottom:1rem; }
.ok-box { background:var(--c-ok-bg); color:var(--c-ok-text); }
.err-box { background:var(--c-danger-bg); color:var(--c-danger); }

.strength { display:flex; align-items:center; gap:0.7rem; }
.strength .bar { display:block; height:5px; border-radius:3px; transition:width 0.25s; max-width:100%; }
.strength .bar.weak { background:var(--c-danger); } .strength .bar.fair { background:var(--c-warn); }
.strength .bar.good { background:var(--c-accent); } .strength .bar.strong { background:var(--c-ok-text); }
.strength small { color:var(--c-muted); font-size:0.75rem; }

.phones { border:1px solid var(--c-border); border-radius:12px; overflow:hidden; margin-bottom:1.1rem; }
.phones-head { padding:0.8rem 1rem; background:var(--c-surface-2); display:flex; flex-direction:column; gap:0.15rem; }
.phones-head small { color:var(--c-muted); font-size:0.78rem; }
.empty { padding:1rem; color:var(--c-muted); font-size:0.88rem; }
.phone { display:flex; align-items:center; gap:0.85rem; padding:0.75rem 1rem; border-top:1px solid var(--c-border); }
.ico { width:22px; height:22px; fill:none; stroke:var(--c-accent); stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; }
.phone-main { flex:1; display:flex; flex-direction:column; min-width:0; }
.phone-main small { color:var(--c-muted); font-size:0.76rem; }

.wizard, .manage { display:flex; flex-direction:column; gap:0.8rem; align-items:flex-start; }
.wizard > *, .manage > * { max-width:100%; }
.codes-box, .pwbox { align-self:stretch; }
.step-title { display:flex; align-items:center; gap:0.6rem; font-weight:650; font-size:0.95rem; margin:0; }
.n { width:22px; height:22px; border-radius:50%; display:inline-grid; place-items:center; background:var(--c-grad); color:#fff; font-size:0.75rem; font-weight:800; }
.code-input { text-align:center; font-family:var(--font-mono); font-size:1.6rem; letter-spacing:0.25em; font-weight:600; max-width:260px; }
.codes-box { border:1px dashed var(--c-border); border-radius:12px; padding:1.1rem; display:flex; flex-direction:column; gap:0.8rem; background:var(--c-bg); }
.codes { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:0.5rem; }
.codes code { font-size:0.95rem; padding:0.45rem 0.6rem; text-align:center; letter-spacing:0.06em; }
.check { flex-direction:row; align-items:center; gap:0.5rem; font-weight:500; }
.link { background:none; border:none; color:var(--c-accent); cursor:pointer; font-size:0.85rem; }
.link:hover { text-decoration:underline; }
.status-line { display:flex; align-items:center; gap:0.5rem; font-size:0.92rem; flex-wrap:wrap; margin:0; }
.dot-on { width:8px; height:8px; border-radius:50%; background:var(--c-ok-text); box-shadow:0 0 8px var(--c-ok-text); }
.left { margin-left:auto; color:var(--c-muted); font-size:0.8rem; font-family:var(--font-mono); }
.left.low { color:var(--c-danger); }
.pwbox { border:1px solid var(--c-border); border-radius:12px; padding:1rem; background:var(--c-bg); display:flex; flex-direction:column; gap:0.7rem; }
@media (max-width: 640px) { .grid { grid-template-columns:1fr; } .hero { flex-wrap:wrap; } }
.methods { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 14px; }
.method { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; }
.method small { display: block; color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.qr { width: 180px; height: 180px; background: #fff; padding: 8px; border-radius: 10px; display: block; margin: 8px 0; }
.this { font-size: 11px; color: var(--accent); border: 1px solid var(--accent); border-radius: 999px; padding: 0 7px; margin-left: 6px; font-weight: 600; }
</style>
