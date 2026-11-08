<template>
  <div class="cap-editor">
    <div v-for="(cap, i) in modelValue" :key="i" class="mod-row">
      <div class="mod-head">
        <SymbolPicker v-model="cap.symbol" :fallback="defaultSymbol(cap.type)" />
        <select :value="cap.type" class="mod-type" @change="changeType(i, $event.target.value)">
          <optgroup v-for="g in groups" :key="g.label" :label="g.label">
            <option v-for="t in g.types" :key="t.key" :value="t.key">{{ t.label }}</option>
          </optgroup>
        </select>
        <input v-model="cap.label" class="mod-label" maxlength="10" placeholder="Label" />
        <button v-if="modelValue.length > 1" type="button" class="btn btn-secondary btn-sm" aria-label="Remove" @click="remove(i)"><Icon name="x" /></button>
      </div>
      <p v-if="typeOf(cap.type)?.hint" class="mod-hint">{{ typeOf(cap.type).hint }}</p>
      <div class="mod-fields">
        <template v-for="f in typeOf(cap.type)?.fields || []" :key="f.key">
          <label v-if="f.key === 'ring'" class="mod-check">
            <input v-model="cap.ring" type="checkbox" /> {{ f.label }}
          </label>
          <label v-else-if="f.options" class="mod-field">{{ f.label }}
            <select v-model.number="cap[f.key]"><option v-for="o in f.options" :key="o" :value="o">{{ o }}</option></select>
          </label>
          <label v-else class="mod-field">{{ f.label }}
            <input v-model.number="cap[f.key]" type="number" :min="f.min ?? 0" :max="f.max || undefined" />
          </label>
        </template>
      </div>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" :disabled="modelValue.length >= 8" @click="add">+ Add a module</button>
    <p v-if="modelValue.length >= 8" class="mod-hint">A node supports up to 8 modules.</p>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import SymbolPicker from './SymbolPicker.vue'
import { catalog, loadCatalog, typeOf, blankCap } from '../services/catalog'

const props = defineProps({ modelValue: { type: Array, required: true } })
const emit = defineEmits(['update:modelValue'])

onMounted(loadCatalog)

const groups = computed(() => [
  { label: 'Pins', types: catalog.value.filter((t) => t.kind === 'io' && !['i2c', 'uart', 'irTx', 'irRx'].includes(t.key)) },
  { label: 'Sensors', types: catalog.value.filter((t) => t.kind === 'sensor') },
  { label: 'Outputs & effects', types: catalog.value.filter((t) => t.kind === 'actuator') },
  { label: 'Advanced', types: catalog.value.filter((t) => ['i2c', 'uart', 'irTx', 'irRx'].includes(t.key)) },
].filter((g) => g.types.length))

function changeType(i, key) {
  const keep = props.modelValue[i].label
  const next = blankCap(key)
  next.label = keep
  next.symbol = ''
  const list = [...props.modelValue]
  list[i] = next
  emit('update:modelValue', list)
}
const DEFAULTS = { digitalOutput: 'power', relay: 'plug', analogOutput: 'sliders', neopixel: 'lightbulb', buzzer: 'bell', dht: 'thermometer', ld2410: 'radar', ds3231: 'clock', analogInput: 'gauge', digitalInput: 'input' }
const defaultSymbol = (t) => DEFAULTS[t] || 'chip'
const add = () => emit('update:modelValue', [...props.modelValue, blankCap('digitalOutput')])
const remove = (i) => emit('update:modelValue', props.modelValue.filter((_, k) => k !== i))
</script>

<style scoped>
.cap-editor { display: flex; flex-direction: column; gap: 10px; }
.mod-row { border: 1px solid var(--c-border); border-radius: 12px; padding: 10px 12px; background: var(--c-surface-2); }
.mod-head { display: flex; gap: 8px; align-items: center; }
.mod-type { flex: 3; min-width: 0; }
.mod-label { flex: 1.2; min-width: 0; }
.mod-hint { font-size: 12px; color: var(--c-muted); margin: 6px 0 0; }
.mod-fields { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; align-items: end; }
.mod-field { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--c-muted); min-width: 110px; flex: 1; }
.mod-field input, .mod-field select { width: 100%; }
.mod-check { display: flex; align-items: center; gap: 6px; font-size: 13px; padding-bottom: 6px; }
</style>
