<template>
  <div class="ap">
    <div v-for="p in params" :key="p.key" class="ap-row">
      <label class="ap-label">{{ p.label }}</label>
      <select v-if="p.kind === 'pattern'" v-model.number="modelValue[p.key]" class="ap-input" @change="changed">
        <template v-if="p.choices.some((c) => c.ring)">
          <optgroup label="Strip / any">
            <option v-for="c in p.choices.filter((c) => !c.ring)" :key="c.value" :value="c.value">{{ c.label }}</option>
          </optgroup>
          <optgroup label="Ring animations" :disabled="!ring">
            <option v-for="c in p.choices.filter((c) => c.ring)" :key="c.value" :value="c.value" :disabled="!ring">{{ c.label }}{{ ring ? '' : ' (ring only)' }}</option>
          </optgroup>
        </template>
        <template v-else>
          <option v-for="c in p.choices" :key="c.value" :value="c.value">{{ c.label }}</option>
        </template>
      </select>
      <div v-else-if="p.kind === 'color'" class="ap-color">
        <input v-model="modelValue[p.key]" type="color" @input="changed" />
        <button v-for="c in swatches" :key="c" type="button" class="sw" :style="{ background: c }" :aria-label="c" @click="pick(p, c)"></button>
        <button v-if="p.allowRandom" type="button" class="sw sw-random"
                :class="{ on: modelValue.random && randomOk(p), blocked: !randomOk(p) }"
                :title="randomOk(p) ? 'Random colour: a new colour on every cycle' : 'Random colour cannot be used with the selected pattern'"
                :aria-label="randomOk(p) ? 'Random colour' : 'Random colour (not available with this pattern)'"
                :aria-disabled="!randomOk(p)"
                @click="randomOk(p) && pickRandom(p)">
          <svg v-if="!randomOk(p)" viewBox="0 0 24 24" class="sw-x" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </div>
      <div v-else-if="p.kind === 'range'" class="ap-range">
        <input v-model.number="modelValue[p.key]" type="range" :min="p.min" :max="p.max" @change="changed" />
        <span>{{ modelValue[p.key] }}</span>
      </div>
      <label v-else-if="p.kind === 'bool'" class="ap-check"><input v-model="modelValue[p.key]" type="checkbox" @change="changed" /> On</label>
      <input v-else v-model.number="modelValue[p.key]" type="number" :min="p.min" :max="p.max" class="ap-input" @change="changed" />
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
const props = defineProps({ params: { type: Array, required: true }, modelValue: { type: Object, required: true }, ring: Boolean })
const emit = defineEmits(['change'])
const swatches = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#00a8e8', '#5e5ce6', '#bf5af2', '#ffffff']
const changed = () => emit('change')

// Random colour needs a pattern that uses a single colour. Patterns with their
// own palette (rainbow, fire...) cannot use it.
const randomOk = (p) => !(p.noRandom || []).includes(props.modelValue.pattern)
function pick(p, c) {
  props.modelValue.random = false
  props.modelValue[p.key] = c
  changed()
}
function pickRandom(p) {
  props.modelValue.random = !props.modelValue.random
  if (!props.modelValue.random) props.modelValue[p.key] = p.default
  changed()
}
// Switching to a pattern that cannot use it falls back to the default colour.
watch(() => props.modelValue.pattern, () => {
  for (const p of props.params) {
    if (p.allowRandom && props.modelValue.random && !randomOk(p)) {
      props.modelValue.random = false
      props.modelValue[p.key] = p.default
    }
  }
}, { flush: 'sync' })
</script>

<style scoped>
.ap { display: flex; flex-direction: column; gap: 12px; }
.ap-row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center; }
.ap-label { font-size: 13px; color: var(--c-muted); }
.ap-input { width: 100%; }
.ap-color { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ap-color input[type=color] { width: 44px; height: 32px; padding: 0; border: 1px solid var(--c-border); border-radius: 8px; background: none; }
.sw { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--c-border); cursor: pointer; }
.sw-random { position: relative; padding: 0; background: conic-gradient(#ff3b30, #ffd60a, #34c759, #00a8e8, #bf5af2, #ff3b30); }
.sw-random.on { border-color: var(--c-text); box-shadow: 0 0 0 2px var(--c-accent); }
.sw-random.blocked { cursor: not-allowed; filter: grayscale(1); opacity: .55; }
.sw-x { position: absolute; inset: 2px; width: 16px; height: 16px; stroke: #d11; stroke-width: 3; stroke-linecap: round; fill: none; }
.ap-range { display: flex; gap: 10px; align-items: center; }
.ap-range input { flex: 1; }
.ap-range span { width: 34px; text-align: right; font-size: 13px; color: var(--c-muted); }
.ap-check { font-size: 13px; display: flex; gap: 6px; align-items: center; }
@media (max-width: 560px) { .ap-row { grid-template-columns: 1fr; gap: 4px; } }
</style>
