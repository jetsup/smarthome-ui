<template>
  <div class="mon fade-in">
    <!-- header -->
    <header class="hero">
      <div class="hero-text">
        <p class="hello">{{ greeting }}<span v-if="firstName">, {{ firstName }}</span></p>
        <h2 class="hero-title">Your home, live</h2>
        <p class="hero-sub">{{ summary }}</p>
      </div>
      <div class="hero-actions">
        <button class="pill-btn" :class="{ on: customizing }" @click="customizing = !customizing">
          <Icon :name="customizing ? 'check' : 'settings'" />
          {{ customizing ? 'Done' : 'Customise' }}
        </button>
        <router-link to="/gateways" class="pill-btn"><Icon name="grid" /> Manage</router-link>
      </div>
    </header>

    <!-- stats -->
    <section class="stats">
      <div class="stat">
        <span class="stat-ic"><Icon name="home" /></span>
        <div><b>{{ onlineGw }}<small>/{{ gateways.length }}</small></b><span>Gateways online</span></div>
      </div>
      <div class="stat">
        <span class="stat-ic"><Icon name="chip" /></span>
        <div><b>{{ onlineNodes }}<small>/{{ totalNodes }}</small></b><span>Nodes online</span></div>
      </div>
      <div class="stat">
        <span class="stat-ic"><Icon name="layers" /></span>
        <div><b>{{ shown.length }}</b><span>Tiles on display</span></div>
      </div>
      <div class="stat" :class="{ alert: offlineTiles }">
        <span class="stat-ic"><Icon :name="offlineTiles ? 'alert' : 'shield'" /></span>
        <div><b>{{ offlineTiles ? offlineTiles : 'All good' }}</b><span>{{ offlineTiles ? 'Tiles offline' : 'Everything reachable' }}</span></div>
      </div>
    </section>

    <!-- gateway switcher -->
    <nav v-if="gateways.length" class="tabs" aria-label="Gateway">
      <button class="tab" :class="{ active: scope === 'all' }" @click="setScope('all')">
        <Icon name="layers" /> All gateways
        <span class="count">{{ gateways.length }}</span>
      </button>
      <button v-for="g in gateways" :key="g.id" class="tab" :class="{ active: scope === g.id }" @click="setScope(g.id)">
        <span class="dot" :class="g.online ? 'up' : 'down'"></span>
        {{ g.name }}
        <span class="count">{{ g.nodes }}</span>
      </button>
    </nav>

    <div v-if="loading" class="skeletons"><div v-for="n in 6" :key="n" class="skel"></div></div>

    <div v-else-if="!gateways.length" class="empty card">
      <span class="empty-ic"><Icon name="home" /></span>
      <h3>No gateways yet</h3>
      <p>Connect a gateway and pair your nodes. Everything that can be watched or controlled shows up here.</p>
      <router-link to="/gateways/create" class="pill-btn on">Add a gateway</router-link>
    </div>

    <div v-else-if="!cards.length" class="empty card">
      <span class="empty-ic"><Icon name="eye-off" /></span>
      <h3>Nothing to show</h3>
      <p v-if="hiddenCount">{{ hiddenCount }} tile{{ hiddenCount === 1 ? ' is' : 's are' }} hidden. Use Customise to bring them back.</p>
      <p v-else>None of the paired nodes has a module that can be monitored or controlled yet.</p>
      <button v-if="hiddenCount" class="pill-btn on" @click="customizing = true">Customise</button>
    </div>

    <!-- node cards -->
    <TransitionGroup v-else name="flip" tag="div" class="cards" :class="{ editing: customizing }">
      <section
        v-for="c in cards"
        :key="c.id"
        class="ncard"
        :class="{ down: !c.online, dragging: drag && drag.kind === 'card' && drag.id === c.id }"
        :style="{ '--cols': Math.min(c.widgets.length, 3) }"
        :draggable="customizing"
        @dragstart="cardStart($event, c)"
        @dragenter.prevent="cardEnter(c)"
        @dragover.prevent
        @dragend="dragEnd"
        @drop.prevent
      >
        <header class="ncard-head">
          <span v-if="customizing" class="grip" title="Drag to move this card"><Icon name="grid" /></span>
          <span class="dot" :class="c.online ? 'up' : 'down'"></span>
          <router-link :to="`/nodes/${c.id}/settings`" class="node-name">{{ c.name }}</router-link>
          <span class="gw-chip" :title="'Gateway ' + c.gatewayName">{{ c.gatewayName }}</span>
          <span v-if="!c.online" class="tag">Offline</span>
          <span v-if="customizing" class="nudge">
            <button aria-label="Move earlier" title="Move earlier" @click="nudge(c, -1)"><Icon name="chevron-left" /></button>
            <button aria-label="Move later" title="Move later" @click="nudge(c, 1)"><Icon name="chevron-right" /></button>
          </span>
        </header>

        <TransitionGroup name="flip" tag="div" class="ngrid">
          <article
            v-for="w in c.widgets"
            :key="w.id"
            class="tile"
            :class="['k-' + w.kind, { on: isOn(w), off: !w.online, hidden: w.hidden, edit: customizing, clickable: w.history && !customizing, dragging: drag && drag.kind === 'tile' && drag.id === w.id }]"
            :style="{ '--tint': tint(w) }"
            :draggable="customizing"
            :tabindex="w.history && !customizing ? 0 : -1"
            :title="w.history && !customizing ? 'Show history' : ''"
            @click="w.history && !customizing && (histTile = w)"
            @keydown.enter="w.history && !customizing && (histTile = w)"
            @dragstart="tileStart($event, c, w)"
            @dragenter.prevent.stop="tileEnter(c, w)"
            @dragend="dragEnd"
          >
            <div class="tile-top">
              <span class="badge-ic"><Icon :name="w.symbol" /></span>
              <button v-if="customizing" class="eye" :title="w.hidden ? 'Show on dashboard' : 'Hide from dashboard'" @click="toggleHidden(w)">
                <Icon :name="w.hidden ? 'eye-off' : 'eye'" />
              </button>
              <button
                v-else-if="w.kind === 'switch' || w.kind === 'light'"
                class="sw" :class="{ on: isOn(w) }" role="switch" :aria-checked="isOn(w)" :aria-label="'Toggle ' + w.label"
                :disabled="!w.online" @click="toggle(w)"
              ><i></i></button>
              <span v-else-if="w.kind === 'bool'" class="sw ro" :class="{ on: isOn(w) }" aria-hidden="true"><i></i></span>
              <span v-else-if="w.history" class="hist-hint" aria-hidden="true"><Icon name="chart" /></span>
            </div>

            <div class="tile-body">
              <template v-if="w.kind === 'gauge'">
                <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
                  <circle class="ring-bg" cx="40" cy="40" r="32" />
                  <circle class="ring-fg" cx="40" cy="40" r="32" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - frac(w))" />
                </svg>
                <div class="ring-val">
                  <b>{{ w.hasValue ? fmt(w.value) : '--' }}</b><small>{{ w.unit }}</small>
                </div>
              </template>
              <div v-else-if="w.kind === 'text'" class="big">{{ w.hasValue ? w.text : '--' }}</div>
              <div v-else-if="w.kind === 'bool'" class="big">{{ boolText(w) }}</div>
              <div v-else-if="w.kind === 'switch'" class="big">{{ !w.hasValue && !fresh(w) ? 'Unknown' : isOn(w) ? 'On' : 'Off' }}</div>
              <template v-else-if="w.kind === 'slider'">
                <div class="big">{{ pct(w) }}<small>%</small></div>
                <input
                  class="range" type="range" min="0" max="255" :value="level(w)" :disabled="!w.online || customizing"
                  :style="{ '--p': pct(w) + '%' }"
                  @input="drag_(w, $event)" @change="commit(w, $event)"
                />
              </template>
              <template v-else-if="w.kind === 'light'">
                <div class="big">{{ isOn(w) ? (w.pattern || 'On') : 'Off' }}</div>
                <input
                  class="range" type="range" min="1" max="100" :value="bright(w)" :disabled="!w.online || customizing"
                  :style="{ '--p': bright(w) + '%' }"
                  @input="drag_(w, $event)" @change="commitLight(w, $event)"
                />
              </template>
              <div v-else-if="w.kind === 'buzzer'" class="btns">
                <button class="mini" :disabled="!w.online" @click="buzz(w, 1)"><Icon name="play" /> Play</button>
                <button class="mini ghost" :disabled="!w.online" @click="buzz(w, 0)"><Icon name="stop" /> Stop</button>
              </div>
            </div>

            <footer class="tile-foot">
              <span class="t-label">{{ w.label }}</span>
              <span class="t-sub">{{ w.module }}</span>
            </footer>
            <span v-if="errs[w.id]" class="t-err">{{ errs[w.id] }}</span>
          </article>
        </TransitionGroup>
      </section>
    </TransitionGroup>

    <!-- history of one sensor -->
    <div v-if="histTile" class="modal-back" @click.self="histTile = null">
      <div class="modal-card" role="dialog" aria-modal="true" :aria-label="histTile.label + ' history'" :style="{ '--tint': tint(histTile) }">
        <header class="modal-head">
          <span class="badge-ic"><Icon :name="histTile.symbol" /></span>
          <div class="modal-title"><h3>{{ histTile.label }}</h3><small>{{ histTile.nodeName }} · {{ histTile.gatewayName }}</small></div>
          <button class="modal-x" aria-label="Close" @click="histTile = null"><Icon name="x" /></button>
        </header>
        <HistoryChart :node-id="histTile.nodeId" :cap="histTile.cap" :channel="histTile.channel" :label="histTile.label" :unit="histTile.unit" :color="tint(histTile)" :binary="histTile.kind === 'bool'" />
      </div>
    </div>

    <p v-if="customizing && hiddenCount" class="hint">
      {{ hiddenCount }} hidden.
      <button class="link" @click="showAll">Show all</button>
    </p>
    <p v-if="customizing" class="hint">Drag a card by its header, or a tile inside a card, to rearrange. On a touch screen use the arrows on a card. Changes are saved automatically.</p>
    <p v-if="customizing" class="hint">Pick a symbol for any module in the node's settings (the icon next to its name).</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import HistoryChart from '../components/HistoryChart.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const C = 2 * Math.PI * 32

const loading = ref(true)
const gateways = ref([])
const widgets = ref([])
const scope = ref('all')
const hidden = ref([])
const order = ref([]) // node ids, the way the user arranged the cards
const tileOrder = reactive({}) // node id -> tile ids
const drag = ref(null)
let saveTimer = null
const customizing = ref(false)
const histTile = ref(null) // the tile whose history is open
const errs = reactive({})
const local = reactive({}) // optimistic values: id -> { on, value, at }
const lastPattern = {} // light id -> last non-zero pattern
let timer = null

const firstName = computed(() => auth.user?.firstName || '')
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})

const onlineGw = computed(() => gateways.value.filter((g) => g.online).length)
const totalNodes = computed(() => gateways.value.reduce((a, g) => a + g.nodes, 0))
const onlineNodes = computed(() => gateways.value.reduce((a, g) => a + g.onlineNodes, 0))

const inScope = computed(() => widgets.value.filter((w) => scope.value === 'all' || w.gatewayId === scope.value))
const shown = computed(() => inScope.value.filter((w) => !w.hidden))
const hiddenCount = computed(() => inScope.value.filter((w) => w.hidden).length)
const offlineTiles = computed(() => shown.value.filter((w) => !w.online).length)

const summary = computed(() => {
  if (!gateways.value.length) return 'Connect a gateway to start monitoring.'
  const where = scope.value === 'all'
    ? `${gateways.value.length} gateway${gateways.value.length === 1 ? '' : 's'}`
    : gateways.value.find((g) => g.id === scope.value)?.name || ''
  return `${shown.value.length} live tile${shown.value.length === 1 ? '' : 's'} from ${where}.`
})

// One card per node, in the user's order (new nodes go last).
const cards = computed(() => {
  const list = customizing.value ? inScope.value : shown.value
  const map = new Map()
  for (const w of list) {
    if (!map.has(w.nodeId)) {
      const g = gateways.value.find((x) => x.id === w.gatewayId)
      map.set(w.nodeId, { id: w.nodeId, name: w.nodeName, online: w.online, gatewayName: g?.name || w.gatewayName, widgets: [] })
    }
    map.get(w.nodeId).widgets.push(w)
  }
  for (const c of map.values()) {
    const pos = tileOrder[c.id] || []
    const rank = (w) => { const i = pos.indexOf(w.id); return i < 0 ? 1e6 : i }
    c.widgets.sort((a, b) => rank(a) - rank(b))
  }
  const rank = (c) => { const i = order.value.indexOf(c.id); return i < 0 ? 1e6 : i }
  return [...map.values()].sort((a, b) => rank(a) - rank(b))
})

// ---- values ----
const TINTS = { thermometer: '#f0883e', flame: '#f85149', droplet: '#4aa3ff', waves: '#4aa3ff', cloudrain: '#4aa3ff', radar: '#a371f7', eye: '#a371f7', gauge: '#3fb950', leaf: '#3fb950', sun: '#e3b341', lightbulb: '#e3b341', bell: '#e3b341', clock: '#58a6ff' }
const tint = (w) => (w.kind === 'light' ? w.color || '#e3b341' : TINTS[w.symbol] || 'var(--c-accent)')
const fmt = (v) => (Math.abs(v) >= 100 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1))
const frac = (w) => (w.hasValue && w.max > w.min ? Math.min(1, Math.max(0, (w.value - w.min) / (w.max - w.min))) : 0)

function fresh(w) {
  const l = local[w.id]
  return l && Date.now() - l.at < 5000 ? l : null
}
const isOn = (w) => fresh(w)?.on ?? w.on
const level = (w) => fresh(w)?.value ?? w.value
const pct = (w) => Math.round((level(w) / 255) * 100)
const bright = (w) => Math.round(fresh(w)?.value ?? w.value)
const boolText = (w) => {
  if (!w.hasValue) return '--'
  if (w.symbol === 'radar' || w.symbol === 'eye') return w.on ? 'Detected' : 'Clear'
  return w.on ? 'Active' : 'Inactive'
}

// ---- loading ----
async function load() {
  try {
    const { data } = await api.get('/monitor')
    gateways.value = data.gateways
    for (const w of data.widgets) {
      if (w.kind === 'light' && w.params?.pattern) lastPattern[w.id] = w.params.pattern
    }
    widgets.value = data.widgets.map((w) => ({ ...w, hidden: hidden.value.includes(w.id) }))
    if (loading.value) {
      scope.value = data.prefs.gateway
      hidden.value = data.prefs.hidden
      order.value = data.prefs.order || []
      Object.assign(tileOrder, data.prefs.tiles || {})
      widgets.value.forEach((w) => { w.hidden = hidden.value.includes(w.id) })
    }
  } catch {
    /* keep what is on screen */
  } finally {
    loading.value = false
  }
}

function savePrefs() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await api.put('/monitor/prefs', { gateway: scope.value, hidden: hidden.value, order: order.value, tiles: { ...tileOrder } })
    } catch { /* the choice still applies for this visit */ }
  }, 300)
}

// ---- drag and drop (Customise) ----
function moveBefore(list, id, target) {
  const from = list.indexOf(id)
  const to = list.indexOf(target)
  if (from < 0 || to < 0 || from === to) return list
  const next = list.slice()
  next.splice(from, 1)
  next.splice(to, 0, id)
  return next
}
function setCardOrder(ids) {
  const rest = order.value.filter((x) => !ids.includes(x))
  order.value = [...ids, ...rest]
}
function cardStart(e, c) {
  if (!customizing.value) return e.preventDefault()
  drag.value = { kind: 'card', id: c.id }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', c.id)
}
function cardEnter(c) {
  if (drag.value?.kind !== 'card' || drag.value.id === c.id) return
  setCardOrder(moveBefore(cards.value.map((x) => x.id), drag.value.id, c.id))
}
function tileStart(e, c, w) {
  e.stopPropagation()
  if (!customizing.value) return e.preventDefault()
  drag.value = { kind: 'tile', id: w.id, node: c.id }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', w.id)
}
function tileEnter(c, w) {
  const d = drag.value
  if (d?.kind !== 'tile' || d.node !== c.id || d.id === w.id) return
  tileOrder[c.id] = moveBefore(c.widgets.map((x) => x.id), d.id, w.id)
}
function dragEnd() {
  if (drag.value) savePrefs()
  drag.value = null
}
function nudge(c, dir) {
  const ids = cards.value.map((x) => x.id)
  const i = ids.indexOf(c.id)
  const j = i + dir
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  setCardOrder(ids)
  savePrefs()
}

function setScope(id) {
  scope.value = id
  savePrefs()
}

function toggleHidden(w) {
  const set = new Set(hidden.value)
  if (set.has(w.id)) set.delete(w.id)
  else set.add(w.id)
  hidden.value = [...set]
  w.hidden = set.has(w.id)
  savePrefs()
}
function showAll() {
  const ids = new Set(inScope.value.map((w) => w.id))
  hidden.value = hidden.value.filter((id) => !ids.has(id))
  widgets.value.forEach((w) => { if (ids.has(w.id)) w.hidden = false })
  savePrefs()
}

// ---- controls ----
function fail(w, e) {
  errs[w.id] = e?.response?.data?.error || 'Could not send'
  delete local[w.id]
  setTimeout(() => delete errs[w.id], 4000)
}

async function toggle(w) {
  const on = !isOn(w)
  local[w.id] = { on, value: w.value, at: Date.now() }
  try {
    if (w.kind === 'switch') {
      await api.post(`/nodes/${w.nodeId}/command`, { pin: w.pin, value: on ? 1 : 0 })
    } else {
      const params = { ...(w.params || {}) }
      params.pattern = on ? lastPattern[w.id] || 1 : 0
      await api.post(`/nodes/${w.nodeId}/action`, { cap: w.cap, action: 'setEffect', params })
    }
  } catch (e) { fail(w, e) }
}

function drag_(w, ev) {
  const v = Number(ev.target.value)
  local[w.id] = { value: v, on: w.kind === 'slider' ? v > 0 : isOn(w), at: Date.now() }
}
async function commit(w, ev) {
  const v = Number(ev.target.value)
  local[w.id] = { value: v, on: v > 0, at: Date.now() }
  try { await api.post(`/nodes/${w.nodeId}/command`, { pin: w.pin, value: v }) } catch (e) { fail(w, e) }
}
async function commitLight(w, ev) {
  const v = Number(ev.target.value)
  local[w.id] = { value: v, on: true, at: Date.now() }
  const params = { ...(w.params || {}), brightness: v }
  if (!params.pattern) params.pattern = lastPattern[w.id] || 1
  try { await api.post(`/nodes/${w.nodeId}/action`, { cap: w.cap, action: 'setEffect', params }) } catch (e) { fail(w, e) }
}
async function buzz(w, pattern) {
  try { await api.post(`/nodes/${w.nodeId}/action`, { cap: w.cap, action: 'play', params: { pattern, repeat: 1 } }) } catch (e) { fail(w, e) }
}

function onKey(e) { if (e.key === 'Escape') histTile.value = null }
onMounted(() => {
  window.addEventListener('keydown', onKey)
  load()
  timer = setInterval(load, 3000)
})
onBeforeUnmount(() => { clearInterval(timer); clearTimeout(saveTimer); window.removeEventListener('keydown', onKey) })
</script>

<style scoped>
.mon { width: 100%; display: flex; flex-direction: column; gap: 22px; }
.muted { color: var(--c-muted); font-size: 13px; }

/* hero */
.hero { position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; padding: 28px 30px; border-radius: 22px; color: #fff; background: var(--c-grad); box-shadow: 0 18px 40px -18px var(--c-glow); }
.hero::before, .hero::after { content: ''; position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.12); }
.hero::before { width: 260px; height: 260px; right: -60px; top: -120px; }
.hero::after { width: 180px; height: 180px; right: 140px; bottom: -110px; background: rgba(255, 255, 255, 0.08); }
.hero-text { position: relative; z-index: 1; }
.hello { margin: 0; font-size: 14px; opacity: 0.85; }
.hero-title { margin: 2px 0 4px; font-size: 30px; letter-spacing: -0.02em; color: #fff; }
.hero-sub { margin: 0; font-size: 14px; opacity: 0.9; }
.hero-actions { position: relative; z-index: 1; display: flex; gap: 10px; flex-wrap: wrap; }
.pill-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.35); background: rgba(255, 255, 255, 0.16); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; backdrop-filter: blur(6px); text-decoration: none; transition: background 0.15s, transform 0.15s; }
.pill-btn:hover { background: rgba(255, 255, 255, 0.28); transform: translateY(-1px); }
.pill-btn.on { background: #fff; color: #1f2328; }
.empty .pill-btn { border-color: var(--c-border); background: var(--c-surface-2); color: var(--c-text); }
.empty .pill-btn.on { background: var(--c-accent-btn); color: #fff; border-color: var(--c-accent-btn); }

/* stats */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
.stat { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 16px; background: var(--c-surface); border: 1px solid var(--c-border); box-shadow: var(--shadow-1); }
.stat b { display: block; font-size: 22px; line-height: 1.1; letter-spacing: -0.01em; }
.stat b small { font-size: 14px; color: var(--c-muted); font-weight: 600; }
.stat span:not(.stat-ic) { font-size: 12px; color: var(--c-muted); }
.stat-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-size: 21px; color: var(--c-accent); background: var(--c-hover); }
.stat.alert .stat-ic { color: var(--c-warn); background: var(--c-warn-bg); }

/* gateway tabs */
.tabs { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 8px; scrollbar-width: thin; }
.tab { flex: none; display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.tab:hover { border-color: var(--c-accent); }
.tab.active { background: var(--c-accent-btn); border-color: var(--c-accent-btn); color: #fff; box-shadow: 0 8px 18px -8px var(--c-glow); }
.tab .count { font-size: 11px; padding: 1px 8px; border-radius: 999px; background: var(--c-surface-2); color: var(--c-muted); }
.tab.active .count { background: rgba(255, 255, 255, 0.22); color: #fff; }
.dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.dot.up { background: #3fb950; box-shadow: 0 0 0 3px rgba(63, 185, 80, 0.2); }
.dot.down { background: var(--c-muted); opacity: 0.55; }

/* node cards */
.cards { display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch; }
.ncard { --cols: 1; flex: var(--cols) 1 calc(var(--cols) * 190px + 30px); min-width: 0; max-width: 100%; display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 26px; background: linear-gradient(165deg, color-mix(in srgb, var(--c-accent) 9%, var(--c-surface-2)), var(--c-surface-2)); border: 1px solid color-mix(in srgb, var(--c-accent) 22%, var(--c-border)); box-shadow: var(--shadow-2); transition: opacity 0.15s, box-shadow 0.2s; }
.ncard.down { background: var(--c-surface-2); border-color: var(--c-border); }
.ncard-head { display: flex; align-items: center; gap: 8px; padding: 2px 6px 0; min-width: 0; }
.node-name { font-weight: 700; font-size: 15px; color: var(--c-text); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-name:hover { color: var(--c-accent); }
.gw-chip { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 999px; color: var(--c-accent); background: var(--c-hover); border: 1px solid color-mix(in srgb, var(--c-accent) 25%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40%; }
.tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--c-surface); color: var(--c-muted); }
.ngrid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 12px; }
.grip { color: var(--c-muted); cursor: grab; font-size: 18px; display: grid; place-items: center; }
.nudge { margin-left: auto; display: flex; gap: 4px; }
.nudge button { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text); cursor: pointer; display: grid; place-items: center; }
.nudge button:hover { color: var(--c-accent); border-color: var(--c-accent); }
.editing .ncard { outline: 2px dashed color-mix(in srgb, var(--c-accent) 45%, transparent); outline-offset: 3px; cursor: grab; }
.ncard.dragging, .tile.dragging { opacity: 0.35; }
.flip-move { transition: transform 0.25s ease; }

/* tile */
.tile { --tint: var(--c-accent); position: relative; display: flex; flex-direction: column; gap: 12px; min-height: 168px; padding: 16px; border-radius: 20px; background: var(--c-surface); border: 1px solid var(--c-border); box-shadow: var(--shadow-1); transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s, opacity 0.18s; }
.tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); }
.tile.on { border-color: color-mix(in srgb, var(--tint) 55%, var(--c-border)); background: linear-gradient(160deg, color-mix(in srgb, var(--tint) 13%, var(--c-surface)), var(--c-surface) 70%); }
.tile.off { opacity: 0.55; }
.tile.hidden { opacity: 0.4; border-style: dashed; }
.tile-top { display: flex; justify-content: space-between; align-items: center; }
.badge-ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 23px; color: var(--tint); background: color-mix(in srgb, var(--tint) 14%, transparent); transition: all 0.2s; }
.tile.on .badge-ic { color: #fff; background: var(--tint); box-shadow: 0 8px 20px -6px var(--tint); }
.tile-body { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; position: relative; }
.big { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
.big small { font-size: 14px; color: var(--c-muted); margin-left: 2px; }
.tile-foot { display: flex; flex-direction: column; }
.t-label { font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.t-sub { font-size: 12px; color: var(--c-muted); }
.t-err { position: absolute; left: 12px; right: 12px; bottom: 8px; font-size: 11px; color: var(--c-danger); background: var(--c-danger-bg); border-radius: 8px; padding: 3px 8px; }

/* switch */
.sw { width: 50px; height: 28px; border-radius: 999px; border: none; padding: 0; background: var(--c-border); position: relative; cursor: pointer; transition: background 0.2s; flex: none; }
.sw i { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); transition: transform 0.22s cubic-bezier(0.3, 1.4, 0.5, 1); }
.sw.on { background: var(--tint); }
.sw.on i { transform: translateX(22px); }
.sw:disabled { cursor: not-allowed; opacity: 0.6; }
.sw.ro { cursor: default; opacity: 0.9; }
.sw:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 2px; }

/* gauge ring */
.k-gauge .tile-body { flex-direction: row; align-items: center; justify-content: center; }
.ring { width: 96px; height: 96px; transform: rotate(-90deg); }
.ring circle { fill: none; stroke-width: 7; stroke-linecap: round; }
.ring-bg { stroke: var(--c-surface-2); }
.ring-fg { stroke: var(--tint); transition: stroke-dashoffset 0.6s ease; filter: drop-shadow(0 0 5px color-mix(in srgb, var(--tint) 55%, transparent)); }
.ring-val { position: absolute; display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
.ring-val b { font-size: 21px; }
.ring-val small { font-size: 11px; color: var(--c-muted); }

/* sliders */
.range { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; outline: none; cursor: pointer; background: linear-gradient(90deg, var(--tint) var(--p), var(--c-surface-2) var(--p)); }
.range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 2px solid var(--tint); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
.range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid var(--tint); }
.range:disabled { cursor: not-allowed; opacity: 0.5; }

/* buzzer */
.btns { display: flex; gap: 8px; }
.mini { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: none; background: var(--tint); color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; transition: filter 0.15s; }
.mini:hover { filter: brightness(1.1); }
.mini.ghost { background: var(--c-surface-2); color: var(--c-text); }
.mini:disabled { opacity: 0.5; cursor: not-allowed; }

/* customise */
.eye { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text); font-size: 18px; display: grid; place-items: center; cursor: pointer; }
.eye:hover { color: var(--c-accent); border-color: var(--c-accent); }
.hint { margin: 0; font-size: 13px; color: var(--c-muted); }
.link { background: none; border: none; color: var(--c-accent); cursor: pointer; font-size: 13px; padding: 0; }

/* history */
.tile.clickable { cursor: pointer; }
.hist-hint { font-size: 18px; color: var(--c-muted); opacity: 0; transition: opacity 0.15s; }
.tile:hover .hist-hint, .tile:focus-visible .hist-hint { opacity: 1; }
.tile:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 2px; }
.modal-back { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 16px; background: rgba(8, 11, 16, 0.55); backdrop-filter: blur(3px); }
.modal-card { --tint: var(--c-accent); width: min(720px, 100%); max-height: 92vh; overflow: auto; padding: 18px 20px 20px; border-radius: 22px; background: var(--c-surface); border: 1px solid var(--c-border); box-shadow: var(--shadow-2); display: flex; flex-direction: column; gap: 14px; }
.modal-head { display: flex; align-items: center; gap: 12px; }
.modal-title { flex: 1; min-width: 0; }
.modal-title h3 { margin: 0; font-size: 17px; }
.modal-title small { color: var(--c-muted); }
.modal-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text); cursor: pointer; display: grid; place-items: center; font-size: 18px; }
.modal-x:hover { color: var(--c-accent); border-color: var(--c-accent); }

/* empty + loading */
.empty { text-align: center; padding: 44px 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty h3 { margin: 0; }
.empty p { margin: 0; color: var(--c-muted); max-width: 420px; }
.empty-ic { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; font-size: 30px; color: var(--c-accent); background: var(--c-hover); }
.skeletons { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
.skel { height: 168px; border-radius: 20px; background: linear-gradient(100deg, var(--c-surface) 30%, var(--c-surface-2) 50%, var(--c-surface) 70%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border: 1px solid var(--c-border); }
@keyframes shimmer { to { background-position: -200% 0; } }

@media (max-width: 640px) {
  .hero { padding: 22px 20px; border-radius: 18px; }
  .hero-title { font-size: 24px; }
  .ncard { flex: 1 1 100%; border-radius: 22px; padding: 12px; }
  .ngrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .tile { padding: 12px; min-height: 150px; }
  .ring { width: 84px; height: 84px; }
}
@media (prefers-reduced-motion: reduce) {
  .skel { animation: none; }
  .tile, .sw i, .ring-fg { transition: none; }
}
</style>
