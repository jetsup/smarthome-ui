<template>
  <div class="hc">
    <!-- filters: one row above the chart -->
    <div class="hc-bar">
      <div class="hc-ranges" role="tablist" aria-label="Time range">
        <button v-for="r in ranges" :key="r.h" role="tab" :aria-selected="hours === r.h" :class="{ on: hours === r.h }" @click="hours = r.h">{{ r.label }}</button>
      </div>
      <button class="hc-view" @click="table = !table"><Icon :name="table ? 'chart' : 'layers'" /> {{ table ? 'Chart' : 'Table' }}</button>
    </div>

    <!-- numbers that matter -->
    <div v-if="stats" class="hc-stats">
      <div><span>Latest</span><b>{{ fmt(stats.last) }}</b></div>
      <div><span>Lowest</span><b>{{ fmt(stats.min) }}</b></div>
      <div><span>Highest</span><b>{{ fmt(stats.max) }}</b></div>
      <div><span>Average</span><b>{{ fmt(stats.avg) }}</b></div>
    </div>

    <div v-if="loading" class="hc-empty">Loading…</div>
    <div v-else-if="error" class="hc-empty hc-err">{{ error }}</div>
    <div v-else-if="!points.length" class="hc-empty">
      <Icon name="clock" />
      <p>No history for this time range yet.</p>
      <small>The gateway records readings as they change and sends them here.</small>
    </div>

    <!-- table view (an accessible alternative to the plot) -->
    <div v-else-if="table" class="hc-table-wrap">
      <table class="hc-table">
        <thead><tr><th>Time</th><th>{{ binary ? 'Share of time active' : 'Value' }}</th><th v-if="hasBand">Lowest – highest</th></tr></thead>
        <tbody>
          <tr v-for="p in tableRows" :key="p.t">
            <td>{{ stamp(p.t) }}<span v-if="p.estimated" class="est" title="The gateway had no clock; the time was worked out afterwards"> ~</span></td>
            <td>{{ fmt(p.v) }}</td>
            <td v-if="hasBand">{{ p.lo != null ? fmt(p.lo) + ' – ' + fmt(p.hi) : '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- the plot -->
    <div v-else class="hc-plot" ref="box">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`${label} over the last ${rangeLabel}`" @pointermove="onMove" @pointerleave="hover = null" @pointerdown="onMove">
        <!-- recessive grid + y labels -->
        <g class="grid">
          <line v-for="t in yTicks" :key="'g' + t.y" :x1="padL" :x2="W - padR" :y1="t.y" :y2="t.y" />
        </g>
        <g class="ylab">
          <text v-for="t in yTicks" :key="'y' + t.y" :x="padL - 8" :y="t.y + 4" text-anchor="end">{{ t.label }}</text>
        </g>
        <g class="xlab">
          <text v-for="t in xTicks" :key="'x' + t.x" :x="t.x" :y="H - 8" text-anchor="middle">{{ t.label }}</text>
        </g>

        <!-- min-max band, then the line -->
        <path v-if="band" :d="band" class="band" :fill="color" />
        <path :d="areaPath" class="area" :fill="color" />
        <path :d="linePath" class="line" :stroke="color" />

        <!-- direct label of the latest value -->
        <g v-if="lastPt">
          <circle :cx="lastPt.x" :cy="lastPt.y" r="5" class="dot" :fill="color" />
        </g>

        <!-- crosshair + hovered point -->
        <g v-if="hover" class="cross">
          <line :x1="hover.x" :x2="hover.x" :y1="padT" :y2="H - padB" />
          <circle :cx="hover.x" :cy="hover.y" r="5" class="dot" :fill="color" />
        </g>
      </svg>

      <div v-if="hover" class="hc-tip" :style="tipStyle">
        <b>{{ fmt(hover.p.v) }}</b>
        <span v-if="hover.p.lo != null && hover.p.lo !== hover.p.hi">{{ fmt(hover.p.lo) }} – {{ fmt(hover.p.hi) }}</span>
        <small>{{ stamp(hover.p.t) }}<template v-if="hover.p.estimated"> · time estimated</template></small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '../services/api'

const props = defineProps({
  nodeId: { type: String, required: true },
  cap: { type: Number, required: true },
  channel: { type: Number, default: 0 },
  label: { type: String, default: '' },
  unit: { type: String, default: '' },
  color: { type: String, default: 'var(--c-accent)' },
  binary: { type: Boolean, default: false }, // an on/off signal: shown as the share of time it was active
})

const ranges = [{ h: 1, label: '1 h' }, { h: 6, label: '6 h' }, { h: 24, label: '24 h' }, { h: 168, label: '7 d' }]
const hours = ref(24)
const points = ref([])
const from = ref(0)
const to = ref(0)
const loading = ref(true)
const error = ref('')
const table = ref(false)
const hover = ref(null)
const box = ref(null)
let timer = null

const rangeLabel = computed(() => ranges.find((r) => r.h === hours.value)?.label || '')

async function load(quiet = false) {
  if (!quiet) loading.value = true
  try {
    const { data } = await api.get(`/nodes/${props.nodeId}/history`, { params: { cap: props.cap, channel: props.channel, hours: hours.value, buckets: 160 } })
    points.value = data.points || []
    from.value = data.from
    to.value = data.to
    error.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load the history'
  } finally { loading.value = false }
}
watch(hours, () => { hover.value = null; load() })
onMounted(() => { load(); timer = setInterval(() => load(true), 30000) })
onBeforeUnmount(() => clearInterval(timer))

// ---- geometry ----
const W = 640, H = 260, padL = 46, padR = 14, padT = 14, padB = 28
const hasBand = computed(() => points.value.some((p) => p.lo != null && p.lo !== p.hi))

const domain = computed(() => {
  if (!points.value.length) return { lo: 0, hi: 1 }
  let lo = Infinity, hi = -Infinity
  for (const p of points.value) {
    lo = Math.min(lo, p.lo ?? p.v)
    hi = Math.max(hi, p.hi ?? p.v)
  }
  if (props.binary) return { lo: 0, hi: 1 }
  if (hi === lo) { lo -= 1; hi += 1 }
  const pad = (hi - lo) * 0.1
  return nice(lo - pad, hi + pad)
})

// round the axis ends to friendly numbers (1, 2, 2.5, 5 x 10^n), so the ticks read 20, 25, 30 - not 18.8, 22.5
function nice(lo, hi) {
  const raw = (hi - lo) / 4
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag
  return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step }
}

const xOf = (t) => padL + ((t - from.value) / Math.max(1, to.value - from.value)) * (W - padL - padR)
const yOf = (v) => padT + (1 - (v - domain.value.lo) / (domain.value.hi - domain.value.lo)) * (H - padT - padB)

const pts = computed(() => points.value.map((p) => ({ p, x: xOf(p.t), y: yOf(p.v) })))

// a gap in the data (no readings for a while) is left as a gap, not joined by a misleading line
const gapAfter = computed(() => Math.max(((to.value - from.value) / 160) * 4, 300))
const linePath = computed(() => {
  let d = ''
  pts.value.forEach((q, i) => {
    const prev = pts.value[i - 1]
    const gap = !prev || q.p.t - prev.p.t > gapAfter.value
    d += gap ? `M${q.x.toFixed(1)} ${q.y.toFixed(1)}` : `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`
    if (gap && (i === pts.value.length - 1 || pts.value[i + 1].p.t - q.p.t > gapAfter.value)) d += `l0.01 0` // a lone point
  })
  return d
})
const areaPath = computed(() => {
  const base = yOf(domain.value.lo)
  let d = ''
  let run = []
  const flush = () => {
    if (run.length > 1) d += `M${run[0].x.toFixed(1)} ${base} ` + run.map((q) => `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ') + ` L${run[run.length - 1].x.toFixed(1)} ${base}Z `
    run = []
  }
  pts.value.forEach((q, i) => {
    const prev = pts.value[i - 1]
    if (prev && q.p.t - prev.p.t > gapAfter.value) flush()
    run.push(q)
  })
  flush()
  return d
})
const band = computed(() => {
  if (!hasBand.value) return ''
  const up = pts.value.map((q) => `${q.x.toFixed(1)} ${yOf(q.p.hi ?? q.p.v).toFixed(1)}`)
  const dn = pts.value.slice().reverse().map((q) => `${q.x.toFixed(1)} ${yOf(q.p.lo ?? q.p.v).toFixed(1)}`)
  return pts.value.length > 1 ? `M${up.join(' L')} L${dn.join(' L')}Z` : ''
})
const lastPt = computed(() => (pts.value.length ? pts.value[pts.value.length - 1] : null))

const yTicks = computed(() => {
  const { lo, hi } = domain.value
  if (props.binary) return [0, 0.25, 0.5, 0.75, 1].map((v) => ({ y: yOf(v), label: `${Math.round(v * 100)}%` }))
  const step = domain.value.step || (hi - lo) / 4
  const out = []
  for (let v = lo; v <= hi + step / 1000; v += step) out.push({ y: yOf(v), label: fmtAxis(v) })
  return out
})
const xTicks = computed(() => {
  const n = 5
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from.value + ((to.value - from.value) * i) / n
    return { x: xOf(t), label: hours.value > 24 ? new Date(t * 1000).toLocaleDateString([], { weekday: 'short', day: 'numeric' }) : new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  })
})

const stats = computed(() => {
  if (!points.value.length) return null
  let lo = Infinity, hi = -Infinity, sum = 0
  for (const p of points.value) { lo = Math.min(lo, p.lo ?? p.v); hi = Math.max(hi, p.hi ?? p.v); sum += p.v }
  return { last: points.value[points.value.length - 1].v, min: lo, max: hi, avg: sum / points.value.length }
})
const tableRows = computed(() => points.value.slice().reverse().slice(0, 120))

// ---- formatting ----
const fmtAxis = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(2))).toString()
function fmt(v) {
  if (v == null) return ''
  if (props.binary) return `${Math.round(v * 100)}%`
  const n = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(1))
  return props.unit ? `${n} ${props.unit}` : `${n}`
}
function stamp(t) {
  const d = new Date(t * 1000)
  return hours.value > 24 ? d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ---- hover: snap to the nearest point; a tall hit area, not just the line ----
function onMove(e) {
  if (!pts.value.length || !box.value) return
  const r = box.value.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * W
  let best = pts.value[0]
  for (const q of pts.value) if (Math.abs(q.x - x) < Math.abs(best.x - x)) best = q
  hover.value = { x: best.x, y: best.y, p: best.p }
}
const tipStyle = computed(() => {
  if (!hover.value) return {}
  const pct = (hover.value.x / W) * 100
  const flip = pct > 62
  return { left: `${pct}%`, top: `${(hover.value.y / H) * 100}%`, transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)` }
})
</script>

<style scoped>
.hc { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.hc-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.hc-ranges { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--c-surface-2); border: 1px solid var(--c-border); }
.hc-ranges button { border: none; background: none; color: var(--c-muted); font: inherit; font-size: 13px; font-weight: 600; padding: 5px 14px; border-radius: 999px; cursor: pointer; transition: all 0.15s; }
.hc-ranges button.on { background: var(--c-accent-btn); color: #fff; }
.hc-ranges button:not(.on):hover { color: var(--c-text); }
.hc-view { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text); font: inherit; font-size: 13px; font-weight: 600; padding: 5px 12px; border-radius: 999px; cursor: pointer; }
.hc-view:hover { border-color: var(--c-accent); color: var(--c-accent); }

.hc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.hc-stats div { display: flex; flex-direction: column; padding: 8px 12px; border-radius: 12px; background: var(--c-surface-2); min-width: 0; }
.hc-stats span { font-size: 11px; color: var(--c-muted); }
.hc-stats b { font-size: 16px; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.hc-plot { position: relative; touch-action: pan-y; }
.hc-plot svg { width: 100%; height: auto; display: block; overflow: visible; cursor: crosshair; }
.grid line { stroke: var(--c-border); stroke-opacity: 0.55; stroke-width: 1; shape-rendering: crispEdges; }
.ylab text, .xlab text { fill: var(--c-muted); font-size: 11px; font-family: inherit; }
.line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.area { opacity: 0.12; }
.band { opacity: 0.14; }
.dot { stroke: var(--c-surface); stroke-width: 2; }
.cross line { stroke: var(--c-muted); stroke-width: 1; stroke-dasharray: 3 3; }

.hc-tip { position: absolute; pointer-events: none; display: flex; flex-direction: column; gap: 1px; padding: 8px 12px; border-radius: 10px; background: var(--c-surface); border: 1px solid var(--c-border); box-shadow: var(--shadow-2); white-space: nowrap; z-index: 2; }
.hc-tip b { font-size: 15px; color: var(--c-text); }
.hc-tip span { font-size: 12px; color: var(--c-muted); }
.hc-tip small { font-size: 11px; color: var(--c-muted); }

.hc-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 36px 12px; text-align: center; color: var(--c-muted); font-size: 22px; }
.hc-empty p { margin: 0; font-size: 14px; color: var(--c-text); }
.hc-empty small { font-size: 12px; }
.hc-err { color: var(--c-danger); font-size: 14px; }

.hc-table-wrap { max-height: 300px; overflow: auto; border: 1px solid var(--c-border); border-radius: 12px; }
.hc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.hc-table th, .hc-table td { text-align: left; padding: 7px 12px; border-bottom: 1px solid var(--c-border); }
.hc-table th { position: sticky; top: 0; background: var(--c-surface-2); color: var(--c-muted); font-weight: 600; }
.est { color: var(--c-warn); font-weight: 700; }

@media (max-width: 520px) { .hc-stats { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .hc-ranges button { transition: none; } }
</style>
