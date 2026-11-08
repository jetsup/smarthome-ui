<template>
  <div class="sp" ref="root">
    <button type="button" class="sp-btn" :title="'Symbol: ' + currentLabel" aria-label="Choose a symbol" @click="open = !open">
      <Icon :name="modelValue || fallback" />
    </button>
    <div v-if="open" class="sp-pop" role="dialog" aria-label="Choose a symbol">
      <button v-if="modelValue" type="button" class="sp-reset" @click="pick('')">Use the default</button>
      <div class="sp-grid">
        <button v-for="s in SYMBOLS" :key="s.key" type="button" class="sp-item" :class="{ on: s.key === (modelValue || fallback) }" :title="s.label" :aria-label="s.label" @click="pick(s.key)">
          <Icon :name="s.key" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { SYMBOLS } from '../services/symbols'

const props = defineProps({ modelValue: { type: String, default: '' }, fallback: { type: String, default: 'chip' } })
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const root = ref(null)
const currentLabel = computed(() => SYMBOLS.find((s) => s.key === (props.modelValue || props.fallback))?.label || 'Default')

function pick(k) { emit('update:modelValue', k); open.value = false }
function away(e) { if (root.value && !root.value.contains(e.target)) open.value = false }
onMounted(() => document.addEventListener('mousedown', away))
onBeforeUnmount(() => document.removeEventListener('mousedown', away))
</script>

<style scoped>
.sp { position: relative; flex: none; }
.sp-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-accent); font-size: 20px; display: grid; place-items: center; cursor: pointer; transition: transform .12s, border-color .12s; }
.sp-btn:hover { border-color: var(--c-accent); transform: translateY(-1px); }
.sp-pop { position: absolute; z-index: 40; top: 44px; left: 0; width: 292px; max-width: 80vw; padding: 10px; border-radius: 14px; background: var(--c-surface); border: 1px solid var(--c-border); box-shadow: var(--shadow-2); }
.sp-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.sp-item { aspect-ratio: 1; border-radius: 10px; border: 1px solid transparent; background: var(--c-surface-2); color: var(--c-text); font-size: 20px; display: grid; place-items: center; cursor: pointer; transition: background .12s, color .12s; }
.sp-item:hover { background: var(--c-hover); color: var(--c-accent); }
.sp-item.on { background: var(--c-accent); color: #fff; }
.sp-reset { width: 100%; margin-bottom: 8px; padding: 6px; border-radius: 8px; border: 1px dashed var(--c-border); background: none; color: var(--c-muted); font-size: 12px; cursor: pointer; }
.sp-reset:hover { color: var(--c-text); border-color: var(--c-muted); }
</style>
