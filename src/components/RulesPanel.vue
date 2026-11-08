<template>
  <div class="card section rules-card">
    <div class="section-header">
      <h4>Automations</h4>
      <button class="btn btn-secondary btn-sm" :disabled="!usable" @click="openNew">+ New rule</button>
    </div>
    <p class="hint">Make modules react to each other, e.g. “when the radar sees someone, turn the ring on” or “when humidity is above 65 %, sound the buzzer”.</p>

    <div v-if="!rules.length" class="empty">No rules yet.</div>
    <div v-for="r in rules" :key="r.slug" class="rule">
      <div class="rule-main">
        <strong>{{ r.name }}</strong>
        <span class="rule-text">{{ describe(r) }}</span>
      </div>
      <label class="rule-on"><input type="checkbox" :checked="r.enabled" @change="toggle(r, $event.target.checked)" /> On</label>
      <button class="btn btn-danger btn-sm" @click="remove(r)">Delete</button>
    </div>

    <div v-if="show" class="modal-overlay">
      <div class="modal modal-wide">
        <h4>New rule</h4>
        <div class="form-group"><label>Name</label><input v-model="form.name" maxlength="40" placeholder="e.g. Humid alarm" /></div>

        <h5>When…</h5>
        <div class="row">
          <select v-model.number="form.sourceDeviceId" @change="form.sourceCap = firstSensor(form.sourceDeviceId)">
            <option v-for="n in sensorNodes" :key="n.deviceId" :value="n.deviceId">{{ n.name || n.deviceId }}</option>
          </select>
          <select v-model.number="form.sourceCap" @change="form.channel = 0">
            <option v-for="o in sourceModules" :key="o.index" :value="o.index">{{ o.label }}</option>
          </select>
          <select v-model.number="form.channel">
            <option v-for="c in sourceChannels" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <div class="row">
          <select v-model="form.op"><option v-for="o in ops" :key="o" :value="o">{{ o }}</option></select>
          <input v-model.number="form.threshold" type="number" step="any" placeholder="Value" />
          <span class="unit">{{ sourceChannel?.unit }}</span>
        </div>

        <h5>…do this</h5>
        <div class="row">
          <select v-model.number="form.targetDeviceId" @change="form.targetCap = firstActuator(form.targetDeviceId); resetAction()">
            <option v-for="n in actuatorNodes" :key="n.deviceId" :value="n.deviceId">{{ n.name || n.deviceId }}</option>
          </select>
          <select v-model.number="form.targetCap" @change="resetAction">
            <option v-for="o in targetModules" :key="o.index" :value="o.index">{{ o.label }}</option>
          </select>
          <select v-model="form.action" @change="resetParams">
            <option v-for="a in targetActions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </select>
        </div>
        <ActionParams v-if="actionDef?.params?.length" :params="actionDef.params" :model-value="form.params" :ring="!!targetCapDef?.ring" />

        <label class="chk"><input v-model="form.useElse" type="checkbox" /> When it stops being true, also…</label>
        <template v-if="form.useElse">
          <select v-model="form.elseMode">
            <option value="off" v-if="targetType?.key === 'neopixel'">Turn the LEDs off</option>
            <option value="stop" v-if="targetType?.key === 'buzzer'">Stop the sound</option>
            <option value="pinOff" v-if="targetType && targetType.kind === 'io'">Switch it off</option>
          </select>
        </template>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="show = false">Cancel</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Create rule' }}</button>
        </div>
        <p v-if="error" class="modal-error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import { loadCatalog, typeOf } from '../services/catalog'
import { confirmDialog } from '../services/dialog'
import ActionParams from './ActionParams.vue'

const props = defineProps({ gatewayId: { type: String, required: true }, nodes: { type: Array, default: () => [] } })
const rules = ref([])
const show = ref(false)
const saving = ref(false)
const error = ref('')
const ops = ['>', '<', '>=', '<=', '==', '!=']

const form = reactive({ name: '', sourceDeviceId: 0, sourceCap: 0, channel: 0, op: '>', threshold: 0, targetDeviceId: 0, targetCap: 0, action: '', params: {}, useElse: false, elseMode: 'off' })

onMounted(async () => { await loadCatalog(); load() })
watch(() => props.gatewayId, load)

async function load() {
  try { rules.value = (await api.get(`/gateways/${props.gatewayId}/rules`)).data || [] } catch { rules.value = [] }
}

// The node list may carry the module list as JSON text or as an array.
const capsOf = (n) => {
  const c = n?.capabilitiesConfig
  if (Array.isArray(c)) return c
  if (typeof c === 'string' && c) { try { return JSON.parse(c) } catch { return [] } }
  return []
}
const modulesOf = (n, pred) => capsOf(n).map((c, index) => ({ index, cap: c, type: typeOf(c.type), label: `${c.label || typeOf(c.type)?.label || c.type}` })).filter((m) => m.type && pred(m))
const isSensor = (m) => (m.type.channels || []).length > 0
const isActuator = (m) => (m.type.actions || []).length > 0 || m.type.kind === 'io'
const sensorNodes = computed(() => props.nodes.filter((n) => modulesOf(n, isSensor).length))
const actuatorNodes = computed(() => props.nodes.filter((n) => modulesOf(n, (m) => (m.type.actions || []).filter((a) => a.key !== 'syncTime').length || ['digitalOutput', 'relay', 'analogOutput'].includes(m.type.key)).length))
const usable = computed(() => sensorNodes.value.length && actuatorNodes.value.length)

const nodeBy = (id) => props.nodes.find((n) => n.deviceId === id)
const sourceModules = computed(() => modulesOf(nodeBy(form.sourceDeviceId) || {}, isSensor))
const sourceChannels = computed(() => typeOf(capsOf(nodeBy(form.sourceDeviceId))[form.sourceCap]?.type)?.channels || [])
const sourceChannel = computed(() => sourceChannels.value.find((c) => c.id === form.channel))
const targetModules = computed(() => modulesOf(nodeBy(form.targetDeviceId) || {}, (m) => (m.type.actions || []).filter((a) => a.key !== 'syncTime').length || ['digitalOutput', 'relay', 'analogOutput'].includes(m.type.key)))
const targetCapDef = computed(() => capsOf(nodeBy(form.targetDeviceId))[form.targetCap])
const targetType = computed(() => typeOf(targetCapDef.value?.type))
const targetActions = computed(() => {
  const t = targetType.value
  if (!t) return []
  const acts = (t.actions || []).filter((a) => a.key !== 'syncTime')
  return acts.length ? acts : [{ key: 'setPin', label: 'Switch on', params: [] }]
})
const actionDef = computed(() => targetActions.value.find((a) => a.key === form.action))

function firstSensor(id) { return modulesOf(nodeBy(id) || {}, isSensor)[0]?.index ?? 0 }
function firstActuator(id) { return modulesOf(nodeBy(id) || {}, (m) => (m.type.actions || []).filter((a) => a.key !== 'syncTime').length || ['digitalOutput', 'relay', 'analogOutput'].includes(m.type.key))[0]?.index ?? 0 }
function resetAction() { form.action = targetActions.value[0]?.key || ''; resetParams() }
function resetParams() { const p = {}; for (const x of actionDef.value?.params || []) p[x.key] = x.default; form.params = p }

function openNew() {
  error.value = ''
  Object.assign(form, { name: '', op: '>', threshold: 0, useElse: false, elseMode: 'off' })
  form.sourceDeviceId = sensorNodes.value[0]?.deviceId || 0
  form.sourceCap = firstSensor(form.sourceDeviceId)
  form.channel = 0
  form.targetDeviceId = actuatorNodes.value[0]?.deviceId || 0
  form.targetCap = firstActuator(form.targetDeviceId)
  resetAction()
  show.value = true
}

async function save() {
  saving.value = true; error.value = ''
  const onTrue = form.action === 'setPin' ? { action: 'setPin', value: 1 } : { action: form.action, params: { ...form.params } }
  let onFalse
  if (form.useElse) {
    if (form.elseMode === 'off') onFalse = { action: 'setEffect', params: { ...form.params, pattern: 0 } }
    else if (form.elseMode === 'stop') onFalse = { action: 'play', params: { pattern: 0, repeat: 1 } }
    else onFalse = { action: 'setPin', value: 0 }
  }
  try {
    await api.post(`/gateways/${props.gatewayId}/rules`, {
      name: form.name, sourceDeviceId: form.sourceDeviceId, sourceCap: form.sourceCap, channel: form.channel,
      op: form.op, threshold: Number(form.threshold),
      targetDeviceId: form.targetDeviceId, targetCap: form.targetCap, onTrue, onFalse,
    })
    show.value = false
    await load()
  } catch (e) { error.value = e.response?.data?.error || 'Could not save the rule' } finally { saving.value = false }
}

async function toggle(r, on) { try { await api.put(`/rules/${r.slug}/enabled`, { enabled: on }); r.enabled = on } catch { load() } }
async function remove(r) {
  if (!(await confirmDialog({ title: 'Delete this rule?', message: `“${r.name}”`, confirmText: 'Delete', danger: true }))) return
  try { await api.delete(`/rules/${r.slug}`); await load() } catch { /* ignore */ }
}

function describe(r) {
  const s = nodeBy(r.sourceDeviceId), t = nodeBy(r.targetDeviceId)
  const sc = capsOf(s)[r.sourceCap], tc = capsOf(t)[r.targetCap]
  const ch = typeOf(sc?.type)?.channels?.find((c) => c.id === r.channel)
  let act = ''
  try { act = JSON.parse(r.onTrue || '{}').action || '' } catch { /* */ }
  return `When ${s?.name || r.sourceDeviceId} · ${sc?.label || sc?.type} · ${ch?.label || 'reading'} ${r.op} ${r.threshold}${ch?.unit ? ' ' + ch.unit : ''}, then ${t?.name || r.targetDeviceId} · ${tc?.label || tc?.type} (${act})`
}
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 0.75rem; flex-wrap: wrap; }
.section-header h4 { margin: 0; font-size: 0.95rem; font-weight: 700; }
.rules-card { margin: 1rem 0; }
.hint { font-size: 12px; color: var(--c-muted); margin: 0 0 10px; }
.empty { color: var(--c-muted); font-size: 14px; padding: 8px 0; }
.rule { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--c-border); flex-wrap: wrap; }
.rule-main { flex: 1; min-width: 220px; display: flex; flex-direction: column; }
.rule-text { font-size: 12px; color: var(--c-muted); }
.rule-on { font-size: 13px; display: flex; gap: 6px; align-items: center; }
.row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; align-items: center; }
.row select, .row input { flex: 1; min-width: 120px; }
.unit { font-size: 13px; color: var(--c-muted); }
h5 { margin: 14px 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--c-muted); }
.chk { display: flex; gap: 8px; align-items: center; font-size: 13px; margin: 12px 0 6px; }
</style>
