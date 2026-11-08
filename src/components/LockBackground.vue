<template>
  <div class="lb">
    <div class="lb-row">
      <!-- what the display shows now -->
      <div class="lb-frame" :class="{ empty: !current && !file }">
        <canvas v-show="file" ref="canvas" width="320" height="240" class="lb-canvas" />
        <img v-if="current && !file" :src="current" alt="Lock-screen picture now on the display" />
        <div v-if="!current && !file" class="lb-none"><Icon name="camera" /><span>No picture yet</span><small>The display uses one of its built-in backgrounds.</small></div>
      </div>

      <div class="lb-side">
        <template v-if="!file">
          <p class="lb-text">Upload any photo. The hub fits it to the display (320 × 240), smooths the colours and sends it to the screen.</p>
          <div class="lb-buttons">
            <button class="btn btn-primary btn-sm" :disabled="busy" @click="pick"><Icon name="camera" /> {{ current ? 'Choose another picture' : 'Choose a picture' }}</button>
            <button v-if="current" class="btn btn-secondary btn-sm" :disabled="busy" @click="remove">Remove</button>
          </div>
        </template>

        <template v-else>
          <p class="lb-text">Choose which part of the photo shows.</p>
          <label class="lb-slider">Zoom <input v-model.number="zoom" type="range" min="1" max="4" step="0.05" @input="draw"></label>
          <label class="lb-slider">Left – right <input v-model.number="panX" type="range" min="0" max="1" step="0.01" :disabled="!canPanX" @input="draw"></label>
          <label class="lb-slider">Up – down <input v-model.number="panY" type="range" min="0" max="1" step="0.01" :disabled="!canPanY" @input="draw"></label>
          <div class="lb-buttons">
            <button class="btn btn-primary btn-sm" :disabled="busy" @click="upload">{{ busy ? 'Sending…' : 'Use this picture' }}</button>
            <button class="btn btn-secondary btn-sm" :disabled="busy" @click="cancel">Cancel</button>
          </div>
        </template>
        <p v-if="msg" :class="ok ? 'lb-ok' : 'lb-err'" role="status">{{ msg }}</p>
      </div>
    </div>
    <input ref="input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden @change="chosen">
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '../services/api'

// The picture is cropped here (so what you see is what the display gets), shrunk to a small JPEG,
// and the hub does the final fitting and colour conversion for the display.
const props = defineProps({ path: { type: String, required: true }, version: { type: Number, default: 0 } })
const emit = defineEmits(['changed'])

const input = ref(null)
const canvas = ref(null)
const file = ref(null)
const current = ref('')
const busy = ref(false)
const msg = ref('')
const ok = ref(true)
const zoom = ref(1)
const panX = ref(0.5)
const panY = ref(0.5)
let bitmap = null

const W = 320, H = 240
const canPanX = computed(() => !!bitmap && (bitmap.width / bitmap.height > W / H || zoom.value > 1))
const canPanY = computed(() => !!bitmap && (bitmap.width / bitmap.height < W / H || zoom.value > 1))

async function loadCurrent() {
  if (current.value) { URL.revokeObjectURL(current.value); current.value = '' }
  if (!props.version) return
  try {
    const { data } = await api.get(`${props.path}/background`, { responseType: 'blob' })
    current.value = URL.createObjectURL(data)
  } catch { /* none */ }
}
onMounted(loadCurrent)
watch(() => props.version, loadCurrent)
onBeforeUnmount(() => { if (current.value) URL.revokeObjectURL(current.value) })

function say(text, good = true) { msg.value = text; ok.value = good }
const pick = () => input.value.click()

async function chosen(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (f.size > 25 * 1024 * 1024) return say('That picture is over 25 MB.', false)
  try {
    bitmap = await createImageBitmap(f, { imageOrientation: 'from-image' }) // turns phone photos upright
  } catch {
    return say('That file is not a picture this browser can read.', false)
  }
  file.value = f
  zoom.value = 1; panX.value = 0.5; panY.value = 0.5
  msg.value = ''
  await nextTick()
  draw()
}

// the same window the hub would cut: the biggest 4:3 area, zoomed in, placed by the sliders
function window_() {
  const iw = bitmap.width, ih = bitmap.height
  let cw = iw, ch = (iw * H) / W
  if (ch > ih) { ch = ih; cw = (ih * W) / H }
  cw /= zoom.value; ch /= zoom.value
  return { x: (iw - cw) * panX.value, y: (ih - ch) * panY.value, w: cw, h: ch }
}
function draw() {
  if (!bitmap || !canvas.value) return
  const w = window_()
  const c = canvas.value.getContext('2d')
  c.imageSmoothingQuality = 'high'
  c.drawImage(bitmap, w.x, w.y, w.w, w.h, 0, 0, W, H)
}

async function upload() {
  busy.value = true
  try {
    // 640 x 480 is plenty for a 320 x 240 screen and keeps the upload small
    const out = document.createElement('canvas')
    out.width = 640; out.height = 480
    const w = window_()
    out.getContext('2d').drawImage(bitmap, w.x, w.y, w.w, w.h, 0, 0, 640, 480)
    const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.92))
    const form = new FormData()
    form.append('image', blob, 'lock.jpg')
    const { data } = await api.post(`${props.path}/background`, form)
    say('Sent. The display picks it up within a few seconds.')
    cancel(false)
    emit('changed', data.version)
  } catch (e) {
    say(e.response?.data?.error || 'Could not upload the picture', false)
  } finally { busy.value = false }
}

function cancel(clear = true) {
  file.value = null
  bitmap?.close?.()
  bitmap = null
  if (clear) msg.value = ''
}

async function remove() {
  busy.value = true
  try {
    await api.delete(`${props.path}/background`)
    say('Removed. The display goes back to its built-in backgrounds.')
    emit('changed', 0)
  } catch (e) {
    say(e.response?.data?.error || 'Could not remove it', false)
  } finally { busy.value = false }
}
</script>

<style scoped>
.lb-row { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.lb-frame { width: 320px; max-width: 100%; aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; border: 1px solid var(--c-border); background: var(--c-surface-2); box-shadow: var(--shadow-1); flex: none; }
.lb-frame img, .lb-canvas { width: 100%; height: 100%; display: block; object-fit: cover; }
.lb-none { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 16px; text-align: center; color: var(--c-muted); font-size: 28px; }
.lb-none span { font-size: 14px; font-weight: 600; color: var(--c-text); }
.lb-none small { font-size: 12px; }
.lb-side { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 10px; }
.lb-text { margin: 0; font-size: 13px; color: var(--c-muted); line-height: 1.45; }
.lb-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.lb-slider { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--c-muted); }
.lb-slider input { flex: 1; accent-color: var(--c-accent); }
.lb-ok { margin: 0; font-size: 13px; color: var(--c-ok-text); }
.lb-err { margin: 0; font-size: 13px; color: var(--c-danger); }
</style>
