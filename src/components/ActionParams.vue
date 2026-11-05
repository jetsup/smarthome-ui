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
        <button v-for="c in swatches" :key="c" type="button" class="sw" :style="{ background: c }" :aria-label="c" @click="modelValue[p.key] = c; changed()"></button>
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
const props = defineProps({ params: { type: Array, required: true }, modelValue: { type: Object, required: true }, ring: Boolean })
const emit = defineEmits(['change'])
const swatches = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#00a8e8', '#5e5ce6', '#bf5af2', '#ffffff']
const changed = () => emit('change')
</script>

<style scoped>
.ap { display: flex; flex-direction: column; gap: 12px; }
.ap-row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center; }
.ap-label { font-size: 13px; color: var(--c-muted); }
.ap-input { width: 100%; }
.ap-color { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ap-color input[type=color] { width: 44px; height: 32px; padding: 0; border: 1px solid var(--c-border); border-radius: 8px; background: none; }
.sw { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--c-border); cursor: pointer; }
.ap-range { display: flex; gap: 10px; align-items: center; }
.ap-range input { flex: 1; }
.ap-range span { width: 34px; text-align: right; font-size: 13px; color: var(--c-muted); }
.ap-check { font-size: 13px; display: flex; gap: 6px; align-items: center; }
@media (max-width: 560px) { .ap-row { grid-template-columns: 1fr; gap: 4px; } }
</style>
