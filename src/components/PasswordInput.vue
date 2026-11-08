<template>
  <span class="pw-wrap">
    <input
      ref="el"
      v-bind="$attrs"
      :type="show ? 'text' : 'password'"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      type="button"
      class="pw-eye"
      :aria-label="show ? 'Hide password' : 'Show password'"
      :title="show ? 'Hide password' : 'Show password'"
      tabindex="-1"
      @click="show = !show"
    >
      <Icon :name="show ? 'eye-off' : 'eye'" />
    </button>
  </span>
</template>

<script setup>
import { ref } from 'vue'
defineOptions({ inheritAttrs: false })
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])
const show = ref(false)
const el = ref(null)
defineExpose({ focus: () => el.value?.focus() })
</script>

<style>
.pw-wrap { position: relative; display: block; width: 100%; }
.pw-wrap input { width: 100%; padding-right: 2.6rem; }
.pw-eye {
  position: absolute; top: 50%; right: 6px; transform: translateY(-50%);
  background: none; border: none; padding: 6px; cursor: pointer; line-height: 1;
  color: var(--c-muted); font-size: 1.1rem; display: inline-flex; align-items: center;
}
.pw-eye:hover { color: var(--c-text); }
</style>
