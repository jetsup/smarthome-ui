<template>
  <div class="fade-in">
    <router-link to="/displays" class="back-link"><Icon name="arrow-left" /> Back to Displays</router-link>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!hmi" class="card section">{{ error || 'Display not found.' }}</div>

    <template v-else>
      <div class="head">
        <div>
          <h3 class="page-title">{{ hmi.name }}</h3>
          <p class="hint">Gateway: <strong>{{ hmi.gatewayName }}</strong> · Display ID {{ hmi.deviceId.slice(-4) }} · MAC <code>{{ hmi.mac || hmi.deviceId }}</code></p>
        </div>
        <span :class="['badge', hmi.online ? 'badge-online' : 'badge-offline']">{{ hmi.online ? 'Online' : 'Offline' }}</span>
      </div>

      <div v-if="msg" :class="msgOk ? 'ok-box' : 'err-box'">{{ msg }}</div>

      <!-- Rename -->
      <div class="card section">
        <div class="section-header"><h4>Name</h4></div>
        <form class="name-form" @submit.prevent="rename">
          <input v-model="nameInput" class="field-input" maxlength="40" required>
          <button class="btn btn-primary" :disabled="renaming || nameInput.trim() === hmi.name">Save</button>
        </form>
      </div>

      <!-- Appearance -->
      <div class="card section">
        <div class="section-header"><h4>Appearance</h4><span class="hint">The display applies changes within a few seconds.</span></div>
        <div class="ap-row">
          <span>Theme</span>
          <div class="seg">
            <button :class="{ on: hmi.theme !== 'light' }" @click="setLook({ theme: 'dark' })">Dark</button>
            <button :class="{ on: hmi.theme === 'light' }" @click="setLook({ theme: 'light' })">Light</button>
          </div>
        </div>
        <div class="ap-row">
          <span>Accent colour</span>
          <div class="swatches">
            <button v-for="a in accents" :key="a" class="sw" :class="{ on: (hmi.accent || '00A8E8').toUpperCase() === a }"
              :style="{ background: '#' + shownAccent(a) }" :aria-label="'Accent #' + a" @click="setLook({ accent: a })"></button>
          </div>
        </div>
        <p class="hint ap-note">White switches to black on a light screen automatically.</p>
        <div class="ap-row">
          <span>Background colour</span>
          <div class="swatches">
            <button v-for="b in backgrounds" :key="b[0]" class="sw" :class="{ on: (hmi.background || '') === b[0], auto: !b[0] }"
              :style="b[0] ? { background: '#' + b[0] } : {}" :title="b[1]" :aria-label="'Background ' + b[1]"
              @click="setLook({ background: b[0] })"></button>
          </div>
        </div>
        <div class="ap-row">
          <span>Brightness <small>{{ brightness }}%</small></span>
          <input type="range" min="10" max="100" step="5" v-model.number="brightness" @change="setLook({ brightness })" />
        </div>
        <div class="ap-row">
          <span>Screen off after <small>saves power</small></span>
          <select :value="hmi.sleepAfter || 0" @change="setLook({ sleepAfter: Number($event.target.value) })">
            <option v-for="o in sleepOptions" :key="o[0]" :value="o[0]">{{ o[1] }}</option>
          </select>
        </div>
        <div class="ap-row">
          <span>RGB light with the screen</span>
          <label class="check"><input type="checkbox" :checked="hmi.ledSleepOff !== false" @change="setLook({ ledSleepOff: $event.target.checked })" /> Turn off when the screen turns off</label>
        </div>
        <div class="ap-row">
          <span>RGB light <small>onboard LED</small></span>
          <label class="check"><input type="checkbox" :checked="hmi.statusLed !== false" @change="setLook({ statusLed: $event.target.checked })" /> On</label>
        </div>
        <template v-if="hmi.statusLed !== false">
          <div class="ap-row">
            <span>Pattern</span>
            <div class="seg wrap">
              <button v-for="p in patterns" :key="p[0]" :class="{ on: (hmi.ledMode || 'solid') === p[0] }" @click="setLook({ ledMode: p[0] })">{{ p[1] }}</button>
            </div>
          </div>
          <div class="ap-row">
            <span>Colour <small v-if="!hmi.ledColor">follows accent</small></span>
            <div class="swatches">
              <button v-for="col in ledColors" :key="col" class="sw" :class="{ on: (hmi.ledColor || '') === col, auto: !col }"
                :style="col ? { background: '#' + col } : {}" :title="col ? '#' + col : 'Follow the accent colour'"
                @click="setLook({ ledColor: col })"></button>
            </div>
          </div>
          <div class="ap-row">
            <span>LED brightness <small>{{ ledBrightness }}%</small></span>
            <input type="range" min="1" max="100" v-model.number="ledBrightness" @change="setLook({ ledBrightness })" />
          </div>
          <div v-if="(hmi.ledMode || 'solid') !== 'solid'" class="ap-row">
            <span>Pattern speed <small>{{ ledSpeed }}</small></span>
            <input type="range" min="1" max="100" v-model.number="ledSpeed" @change="setLook({ ledSpeed })" />
          </div>
        </template>
      </div>

      <!-- Nodes -->
      <div class="card section">
        <div class="section-header">
          <h4>Nodes on this display</h4>
          <p class="hint">A node can be shown on only <strong>one</strong> display. Turning a node on here moves it from the display that had it.</p>
        </div>
        <div v-if="nodes.length === 0" class="placeholder-text">This gateway has no nodes yet.</div>
        <div v-else class="list">
          <label v-for="n in nodes" :key="n.deviceId" class="row">
            <input
              type="checkbox"
              class="check"
              :checked="n.hmiId === hmi.id"
              :disabled="busy"
              @change="toggle(n, $event.target.checked, $event)"
            >
            <div class="row-main">
              <strong>{{ n.name || 'Device ' + n.deviceId }}</strong>
              <span class="row-sub">
                {{ n.hmiId === hmi.id ? 'Shown on this display'
                  : n.hmiId ? 'On “' + n.hmiName + '”' : 'Not on any display' }}
              </span>
            </div>
            <span :class="['dot', n.isOnline ? 'on' : 'off']" :title="n.isOnline ? 'Online' : 'Offline'"></span>
          </label>
        </div>
      </div>

      <!-- Unpair -->
      <div class="card section danger-zone">
        <div class="section-header">
          <h4>Unpair</h4>
          <p class="hint">The display stops showing your nodes and returns to its pairing screen. Its nodes become unassigned.</p>
        </div>
        <button class="btn btn-danger" @click="unpair">Unpair this display</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { confirmDialog, notify } from '../services/dialog'

const route = useRoute()
const router = useRouter()
const hmi = ref(null)
const nodes = ref([])
const loading = ref(true)
const busy = ref(false)
const renaming = ref(false)
const error = ref('')
const msg = ref('')
const msgOk = ref(false)
const nameInput = ref('')
const brightness = ref(100)
const backgrounds = [['', 'Default'], ['000000', 'Black'], ['121214', 'Graphite'], ['0B1F33', 'Navy'], ['10261C', 'Forest'],
  ['2A1538', 'Plum'], ['F2F4F7', 'Paper'], ['FFF4E0', 'Cream'], ['E6F0FF', 'Sky']]
const patterns = [['solid', 'Solid'], ['blink', 'Blink'], ['breathe', 'Breathe'], ['fade', 'Fade'], ['rainbow', 'Rainbow cycle'],
  ['random', 'Random'], ['strobe', 'Strobe'], ['twinkle', 'Twinkle'], ['flicker', 'Flame'], ['sparkle', 'Sparkle']]
const ledColors = ['', 'FF2D2D', 'FF8A00', 'FFD400', '3FB950', '00A8E8', '3B5BFF', 'A371F7', 'FF4FA3', 'FFFFFF']
const ledBrightness = ref(40)
const ledSpeed = ref(50)

// Is the display's page light? (custom background wins over the theme)
function pageIsLight() {
  const bg = hmi.value?.background
  if (bg) {
    const n = parseInt(bg, 16)
    return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 140
  }
  return hmi.value?.theme === 'light'
}
// A white accent is unreadable on a light page, so it shows (and is drawn) as near-black.
function shownAccent(a) { return a === 'FFFFFF' && pageIsLight() ? '111418' : a }

const sleepOptions = [[0, 'Never'], [15, '15 seconds'], [30, '30 seconds'], [60, '1 minute'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes'], [1800, '30 minutes']]
const accents = ['00A8E8', '3FB950', 'F0A030', 'A371F7', 'F85149', 'E85D9A', '14B8A6', 'FFFFFF']

const path = `/hmis/${route.params.id}`

function apply(data) {
  hmi.value = data.hmi
  nodes.value = data.nodes || []
  nameInput.value = data.hmi.name
  brightness.value = data.hmi.brightness || 100
  ledBrightness.value = data.hmi.ledBrightness || 40
  ledSpeed.value = data.hmi.ledSpeed || 50
}

async function setLook(body) {
  try {
    const { data } = await api.put(`${path}/appearance`, body)
    Object.assign(hmi.value, data)
    brightness.value = data.brightness || brightness.value
  } catch (e) {
    say(e.response?.data?.error || 'Could not save', false)
  }
}

function say(text, ok = true) {
  msg.value = text
  msgOk.value = ok
}

async function load() {
  try {
    const { data } = await api.get(path)
    apply(data)
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load this display'
  } finally {
    loading.value = false
  }
}

async function rename() {
  renaming.value = true
  try {
    await api.put(path, { name: nameInput.value })
    await load()
    say('Renamed.')
  } catch (e) {
    say(e.response?.data?.error || 'Could not rename', false)
  } finally {
    renaming.value = false
  }
}

async function toggle(n, on, ev) {
  const mine = new Set(nodes.value.filter((x) => x.hmiId === hmi.value.id).map((x) => x.deviceId))
  if (on) {
    if (n.hmiId && n.hmiId !== hmi.value.id) {
      const label = n.name || 'Device ' + n.deviceId
      if (!(await confirmDialog({ title: 'Move this node?', message: `“${label}” is on “${n.hmiName}”.`, note: 'A node can only be on one display, so it will be taken off the other one.', confirmText: 'Move here' }))) {
        ev.target.checked = false
        return
      }
    }
    mine.add(n.deviceId)
  } else {
    mine.delete(n.deviceId)
  }
  busy.value = true
  msg.value = ''
  try {
    const { data } = await api.put(`${path}/nodes`, { deviceIds: [...mine] })
    apply(data)
  } catch (e) {
    say(e.response?.data?.error || 'Could not change the assignment', false)
    await load()
  } finally {
    busy.value = false
  }
}

async function unpair() {
  if (!(await confirmDialog({ title: 'Unpair this display?', message: `“${hmi.value.name}” will stop showing your nodes.`, confirmText: 'Unpair', danger: true }))) return
  try {
    await api.delete(path)
    router.push('/displays')
  } catch (e) {
    say(e.response?.data?.error || 'Could not unpair', false)
  }
}

onMounted(load)
</script>

<style scoped>
.back-link { display:inline-block; color:var(--c-accent); font-size:0.85rem; margin-bottom:1rem; }
.back-link:hover { text-decoration:underline; }
.head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:1rem; }
.page-title { font-size:1.15rem; font-weight:700; margin:0 0 0.25rem; }
.section { padding:1.5rem; margin-bottom:1rem; }
.section-header { margin-bottom:1rem; }
.section-header h4 { font-size:0.95rem; font-weight:700; margin:0; }
.hint { color:var(--c-muted); font-size:0.82rem; margin:0.35rem 0 0; line-height:1.45; }
.placeholder-text { color:var(--c-muted); font-size:0.88rem; }
.name-form { display:flex; gap:0.75rem; flex-wrap:wrap; }
.field-input {
  flex:1; min-width:200px; padding:0.55rem 0.75rem; border:1px solid var(--c-border); border-radius:6px;
  font-size:0.9rem; background:var(--c-bg); box-sizing:border-box;
}
.field-input:focus { outline:none; border-color:var(--c-accent); }
.ok-box, .err-box { padding:0.55rem 0.75rem; border-radius:6px; font-size:0.85rem; margin-bottom:1rem; }
.ok-box { background:var(--c-ok-bg); color:var(--c-ok-text); }
.err-box { background:var(--c-danger-bg); color:var(--c-danger); }
.list { display:flex; flex-direction:column; gap:0.5rem; }
.row {
  display:flex; align-items:center; gap:0.85rem; padding:0.65rem 0.9rem; cursor:pointer;
  background:var(--c-bg); border:1px solid var(--c-border); border-radius:8px;
}
.check { width:18px; height:18px; accent-color:var(--c-accent-btn); }
.row-main { display:flex; flex-direction:column; flex:1; min-width:0; }
.row-sub { color:var(--c-muted); font-size:0.78rem; margin-top:2px; }
.dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.dot.on { background:var(--c-ok-text); }
.dot.off { background:var(--c-border); }
.danger-zone { border-color:var(--c-danger-border); }
.state-msg { color:var(--c-muted); }
.ap-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 0; border-top: 1px solid var(--border); flex-wrap: wrap; }
.ap-row small { color: var(--text-muted); margin-left: 6px; }
.seg { display: inline-flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.seg button { background: transparent; color: var(--text-muted); border: 0; padding: 6px 16px; cursor: pointer; font: inherit; }
.seg button.on { background: var(--accent); color: #fff; }
.swatches { display: flex; gap: 10px; flex-wrap: wrap; }
.sw { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border); cursor: pointer; }
.sw.auto { background: repeating-conic-gradient(var(--border) 0 25%, transparent 0 50%) 50% / 10px 10px; }
.ap-note { margin: -4px 0 8px; }
.seg.wrap { flex-wrap: wrap; }
.sw.on { border-color: var(--text); box-shadow: 0 0 0 2px var(--bg-card, transparent); }
</style>
