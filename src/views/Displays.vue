<template>
  <div class="fade-in">
    <h3 class="page-title">Displays</h3>

    <!-- Pair a display with the code it shows -->
    <div class="card section">
      <div class="section-header">
        <h4>Pair a display</h4>
        <p class="hint">
          On the display choose <strong>Pair this display → From the app or website</strong>. It shows a
          6-digit code. Enter it here and pick the gateway the display belongs to.
        </p>
      </div>
      <div v-if="msg" :class="msgOk ? 'ok-box' : 'err-box'">{{ msg }}</div>
      <form class="pair-form" @submit.prevent="pair">
        <input
          v-model="code"
          class="field-input code-input"
          inputmode="numeric"
          maxlength="7"
          placeholder="000 000"
          autocomplete="off"
          required
        >
        <select v-model="gatewayId" class="field-input" required>
          <option value="" disabled>Choose a gateway…</option>
          <option v-for="g in gateways" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <input v-model="name" class="field-input" maxlength="40" placeholder="Display name (optional)">
        <button type="submit" class="btn btn-primary" :disabled="pairing || !cleanCode || !gatewayId">
          {{ pairing ? 'Pairing…' : 'Pair display' }}
        </button>
      </form>
      <p v-if="gateways.length === 0 && !loading" class="hint">You need a gateway first — <router-link to="/gateways/create">create one</router-link>.</p>
    </div>

    <!-- Existing displays -->
    <div class="card section">
      <div class="section-header"><h4>Your displays</h4></div>
      <div v-if="loading" class="placeholder-text">Loading…</div>
      <div v-else-if="displays.length === 0" class="placeholder-text">No displays paired yet.</div>
      <div v-else class="list">
        <router-link v-for="d in displays" :key="d.id" :to="`/displays/${d.slug}`" class="row">
          <div class="row-main">
            <strong class="row-name">{{ d.name }}</strong>
            <span class="row-sub">Gateway: {{ d.gatewayName || '—' }} · {{ d.nodeCount }} node{{ d.nodeCount === 1 ? '' : 's' }} · ID {{ d.deviceId.slice(-4) }}</span>
          </div>
          <span :class="['badge', d.online ? 'badge-online' : 'badge-offline']">{{ d.online ? 'Online' : 'Offline' }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const displays = ref([])
const gateways = ref([])
const loading = ref(true)
const code = ref('')
const gatewayId = ref('')
const name = ref('')
const pairing = ref(false)
const msg = ref('')
const msgOk = ref(false)
let timer = null

const cleanCode = computed(() => code.value.replace(/\s+/g, ''))

async function load() {
  try {
    const [d, g] = await Promise.all([api.get('/hmis'), api.get('/gateways')])
    displays.value = Array.isArray(d.data) ? d.data : []
    gateways.value = Array.isArray(g.data) ? g.data : []
    if (!gatewayId.value && gateways.value.length === 1) gatewayId.value = gateways.value[0].id
  } catch {
    // keep the last good list on a poll error
  } finally {
    loading.value = false
  }
}

async function pair() {
  pairing.value = true
  msg.value = ''
  try {
    const { data } = await api.post('/hmis/claim', {
      code: cleanCode.value,
      gatewayId: gatewayId.value,
      name: name.value,
    })
    msgOk.value = true
    msg.value = `“${data.hmi.name}” is paired. Now choose which nodes it shows.`
    code.value = ''
    name.value = ''
    await load()
    router.push(`/displays/${data.hmi.slug}`)
  } catch (e) {
    msgOk.value = false
    msg.value = e.response?.data?.error || 'Could not pair the display'
  } finally {
    pairing.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(load, 20000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-title { font-size:1.15rem; font-weight:700; margin-bottom:1.5rem; }
.section { padding:1.5rem; margin-bottom:1rem; }
.section-header { margin-bottom:1rem; }
.section-header h4 { font-size:0.95rem; font-weight:700; margin:0; }
.hint { color:var(--c-muted); font-size:0.82rem; margin:0.35rem 0 0; line-height:1.45; }
.pair-form { display:grid; grid-template-columns:150px 1fr 1fr auto; gap:0.75rem; align-items:center; }
.field-input {
  padding:0.55rem 0.75rem; border:1px solid var(--c-border); border-radius:6px;
  font-size:0.9rem; background:var(--c-bg); width:100%; box-sizing:border-box;
}
.field-input:focus { outline:none; border-color:var(--c-accent); }
.code-input { font-size:1.1rem; letter-spacing:0.2em; text-align:center; font-weight:700; }
.ok-box, .err-box { padding:0.55rem 0.75rem; border-radius:6px; font-size:0.85rem; margin-bottom:0.75rem; }
.ok-box { background:var(--c-ok-bg); color:var(--c-ok-text); }
.err-box { background:var(--c-danger-bg); color:var(--c-danger); }
.placeholder-text { color:var(--c-muted); font-size:0.88rem; }
.list { display:flex; flex-direction:column; gap:0.5rem; }
.row {
  display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:0.7rem 0.9rem;
  background:var(--c-bg); border:1px solid var(--c-border); border-radius:8px; text-decoration:none; color:inherit;
}
.row:hover { border-color:var(--c-accent); }
.row-main { display:flex; flex-direction:column; min-width:0; }
.row-name { font-size:0.95rem; }
.row-sub { color:var(--c-muted); font-size:0.78rem; margin-top:2px; }
@media (max-width: 760px) { .pair-form { grid-template-columns:1fr; } }
</style>
