<template>
  <div v-if="modules.length" class="mc">
    <div v-for="m in modules" :key="m.index" class="card section mc-card">
      <div class="section-header">
        <h4>{{ m.cap.label || m.type.label }} <small class="mc-type">{{ m.type.label }}</small></h4>
        <span v-if="m.cap.display" class="mc-state">{{ m.cap.display }}</span>
      </div>

      <!-- sensor readings -->
      <div v-if="m.readings.length" class="mc-readings">
        <div v-for="r in m.readings" :key="r.channel" class="mc-reading">
          <span class="mc-rv">{{ fmt(r) }}</span>
          <span class="mc-rl">{{ r.label }}</span>
        </div>
      </div>

      <!-- actions (patterns, sounds, set clock…) -->
      <div v-for="a in m.type.actions || []" :key="a.key" class="mc-action">
        <ActionParams v-if="a.params && a.params.length" :params="a.params" :model-value="forms[m.index + ':' + a.key]" :ring="!!m.cap.ring" @change="a.key === 'setEffect' && live ? run(m, a) : null" />
        <div class="mc-buttons">
          <button class="btn btn-primary btn-sm" :disabled="busy" @click="run(m, a)">{{ buttonLabel(a) }}</button>
          <button v-if="m.type.key === 'neopixel'" class="btn btn-secondary btn-sm" :disabled="busy" @click="off(m, a)">Turn off</button>
          <button v-if="m.type.key === 'buzzer'" class="btn btn-secondary btn-sm" :disabled="busy" @click="stopBuzz(m, a)">Stop</button>
          <label v-if="m.type.key === 'neopixel'" class="mc-live"><input v-model="live" type="checkbox" /> Apply changes instantly</label>
        </div>
      </div>
      <p v-if="msgs[m.index]" :class="msgs[m.index].ok ? 'mc-ok' : 'mc-err'">{{ msgs[m.index].text }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import api from '../services/api'
import { loadCatalog, typeOf } from '../services/catalog'
import ActionParams from './ActionParams.vue'

const props = defineProps({ node: { type: Object, required: true } })
onMounted(loadCatalog)

const busy = ref(false)
const live = ref(false)
const msgs = reactive({})
const forms = reactive({})

const modules = computed(() => {
  const out = []
  ;(props.node.capabilitiesConfig || []).forEach((cap, index) => {
    const type = typeOf(cap.type)
    if (!type) return
    const readings = (props.node.readings || []).filter((r) => r.cap === index).sort((a, b) => a.channel - b.channel)
    const hasActions = (type.actions || []).length > 0
    if (!hasActions && !readings.length) return
    if (['analogInput', 'digitalInput'].includes(cap.type)) return // already shown in the pin list
    out.push({ index, cap, type, readings })
  })
  return out
})

// Prefill each action's form: catalog defaults, then the last setting the hub remembers.
// Whenever the remembered setting changes (another phone, the display, a rule...) the
// form follows it, so every screen shows the real current preset.
const seenEffects = {}
const lastSend = {}
function syncForms() {
  for (const m of modules.value) {
    const eff = props.node.effects?.[String(m.index)] || null
    const sig = JSON.stringify(eff)
    if (Date.now() - (lastSend[m.index] || 0) < 6000) continue // don't fight a change I just made
    for (const a of m.type.actions || []) {
      const k = m.index + ':' + a.key
      if (forms[k] && seenEffects[m.index] === sig) continue
      const f = {}
      for (const p of a.params || []) f[p.key] = p.default
      Object.assign(f, eff || {})
      forms[k] = f
    }
    seenEffects[m.index] = sig
  }
}
watch([modules, () => JSON.stringify(props.node.effects)], syncForms, { immediate: true })

const buttonLabel = (a) => ({ setEffect: 'Apply pattern', play: 'Play', syncTime: 'Set clock from the system time' }[a.key] || a.label)

function fmt(r) {
  if (r.key === 'time') return new Date(r.value * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  const v = Number.isInteger(r.value) ? r.value : r.value.toFixed(1)
  return r.unit ? `${v} ${r.unit}` : String(v)
}

async function send(m, a, params) {
  busy.value = true
  lastSend[m.index] = Date.now()
  try {
    const { data } = await api.post(`/nodes/${props.node.nodeId}/action`, { cap: m.index, action: a.key, params })
    msgs[m.index] = { ok: true, text: data.status === 'saved_offline' ? data.message : 'Sent.' }
  } catch (e) {
    msgs[m.index] = { ok: false, text: e.response?.data?.error || 'Could not send' }
  } finally { busy.value = false }
}
const run = (m, a) => send(m, a, { ...forms[m.index + ':' + a.key] })
const off = (m, a) => send(m, a, { ...forms[m.index + ':' + a.key], pattern: 0 })
const stopBuzz = (m, a) => send(m, a, { pattern: 0, repeat: 1 })
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 0.75rem; flex-wrap: wrap; }
.section-header h4 { margin: 0; font-size: 0.95rem; font-weight: 700; }
.mc-card { padding: 1.25rem; }
.mc { display: flex; flex-direction: column; gap: 0; margin: 1rem 0; }
.mc-type { font-weight: 400; color: var(--c-muted); font-size: 12px; margin-left: 6px; }
.mc-state { font-size: 13px; color: var(--c-accent); font-weight: 600; }
.mc-readings { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 12px; }
.mc-reading { background: var(--c-surface-2); border: 1px solid var(--c-border); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; }
.mc-rv { font-size: 20px; font-weight: 700; }
.mc-rl { font-size: 12px; color: var(--c-muted); }
.mc-action { margin-top: 8px; }
.mc-buttons { display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
.mc-live { font-size: 12px; color: var(--c-muted); display: flex; gap: 6px; align-items: center; margin-left: auto; }
.mc-ok { color: var(--c-ok-text); font-size: 13px; margin-top: 8px; }
.mc-err { color: var(--c-danger); font-size: 13px; margin-top: 8px; }
</style>
