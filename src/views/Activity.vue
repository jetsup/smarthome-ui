<template>
  <div class="fade-in activity">
    <div class="card bar">
      <div class="chips">
        <button v-for="c in cats" :key="c.k" :class="['chip', { on: category === c.k }]" @click="category = c.k; load(true)">{{ c.l }}</button>
      </div>
      <div class="tools">
        <input v-model="q" placeholder="Search user, device, IP, details…" @input="debounce" />
        <label class="chk"><input type="checkbox" v-model="failedOnly" @change="load(true)" /> Failed only</label>
        <button class="btn" @click="exportCsv">Export CSV</button>
      </div>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!items.length" class="state-msg">No activity matches.</div>
    <div v-else class="card list">
      <div v-for="i in items" :key="i.id" class="row">
        <span :class="['dot', i.outcome === 'failed' ? 'bad' : i.category]"></span>
        <div class="main">
          <div class="line1"><strong>{{ title(i.action) }}</strong><span v-if="i.outcome === 'failed'" class="fail">failed</span></div>
          <div class="line2">{{ i.details }}</div>
          <div class="line3">
            <span>{{ i.actor || 'System' }}</span>
            <span v-if="i.device">· {{ i.device }}</span>
            <span v-if="i.ipAddress">· {{ i.ipAddress }}</span>
          </div>
        </div>
        <time :title="new Date(i.createdAt).toLocaleString()">{{ ago(i.createdAt) }}</time>
      </div>
    </div>
    <div v-if="!loading && total > 0" class="card pager">
      <button class="btn btn-sm" :disabled="page <= 1" @click="go(page - 1)"><Icon name="chevron-left" /> Previous</button>
      <span class="pinfo">Page {{ page }} of {{ pages }} <small>· {{ total }} events</small></span>
      <button class="btn btn-sm" :disabled="page >= pages" @click="go(page + 1)">Next <Icon name="chevron-right" /></button>
      <select v-model.number="pageSize" class="psize" aria-label="Events per page" @change="load(true)">
        <option :value="25">25 / page</option><option :value="50">50 / page</option><option :value="100">100 / page</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const cats = [{ k: '', l: 'All' }, { k: 'security', l: 'Security' }, { k: 'account', l: 'Account' }, { k: 'gateway', l: 'Gateways' },
  { k: 'node', l: 'Nodes' }, { k: 'display', l: 'Displays' }, { k: 'wifi', l: 'Wi-Fi' }]
const items = ref([]); const loading = ref(true)
const page = ref(1); const pages = ref(1); const total = ref(0); const pageSize = ref(50)
const category = ref(''); const q = ref(''); const failedOnly = ref(false)
let t = null
const debounce = () => { clearTimeout(t); t = setTimeout(() => load(true), 300) }
const params = (extra = {}) => ({ category: category.value || undefined, q: q.value || undefined, outcome: failedOnly.value ? 'failed' : undefined, ...extra })

// reset = filters changed: back to page 1
async function load(reset) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const { data } = await api.get('/audit', { params: params({ limit: pageSize.value, page: page.value }) })
    items.value = data.items
    total.value = data.total
    pages.value = data.pages
    if (page.value > data.pages) { page.value = data.pages; return load(false) }
  } catch { items.value = []; total.value = 0; pages.value = 1 }
  loading.value = false
}
function go(p) { page.value = Math.min(Math.max(1, p), pages.value); load(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
async function exportCsv() {
  const { data } = await api.get('/audit', { params: params({ format: 'csv' }), responseType: 'blob' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = 'smarthome-audit.csv'; a.click(); URL.revokeObjectURL(a.href)
}
const title = (a) => a.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
function ago(d) {
  const s = Math.max(0, (Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + ' min ago'
  if (s < 86400) return Math.floor(s / 3600) + ' h ago'
  return new Date(d).toLocaleDateString()
}
onMounted(() => load(true))
</script>

<style scoped>
.activity { display: flex; flex-direction: column; gap: 14px; }
.bar { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { border: 1px solid var(--border); background: transparent; color: var(--text-muted); padding: 5px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; }
.chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.tools input[type=text], .tools input:not([type]) { flex: 1; min-width: 200px; }
.chk { font-size: 13px; display: flex; gap: 6px; align-items: center; color: var(--text-muted); }
.list { padding: 4px 0; }
.row { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); align-items: flex-start; }
.row:last-of-type { border-bottom: 0; }
.dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 6px; flex: none; background: var(--accent); }
.dot.bad { background: #f85149; } .dot.security { background: #a371f7; } .dot.node { background: #3fb950; } .dot.display { background: #f0a030; }
.main { flex: 1; min-width: 0; }
.line1 { display: flex; gap: 8px; align-items: center; }
.fail { font-size: 11px; color: #f85149; border: 1px solid #f85149; border-radius: 4px; padding: 0 5px; }
.line2 { font-size: 13px; color: var(--text); word-break: break-word; }
.line3 { font-size: 12px; color: var(--text-muted); display: flex; gap: 6px; flex-wrap: wrap; }
time { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.pager { padding: 10px 14px; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; }
.pinfo { font-size: 13px; } .pinfo small { color: var(--text-muted); }
.psize { width: auto; }
</style>
