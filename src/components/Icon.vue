<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ name: { type: String, required: true } })

// Simple line icons (24x24, stroke).
const ICONS = {
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 018 0v4'],
  cloud: ['M7 18a4 4 0 010-8 5.5 5.5 0 0110.5 1.5A3.3 3.3 0 0117 18z'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-8', 'M22 20H2'],
  link: ['M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1', 'M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1'],
  book: ['M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z', 'M4 19V5', 'M8 7h7'],
  'arrow-left': ['M19 12H5', 'M11 6l-6 6 6 6'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-up': ['M6 15l6-6 6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  check: ['M5 12l5 5 9-10'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z'],
  'eye-off': ['M3 3l18 18', 'M10.6 6.1A10 10 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3.1 3.8', 'M6.5 6.9A17 17 0 002 12s3.6 7 10 7a9.7 9.7 0 004.1-.9', 'M9.9 9.9a2.5 2.5 0 003.2 3.2'],
}
const paths = computed(() => ICONS[props.name] || [])
</script>

<style>
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: none;
}
</style>
