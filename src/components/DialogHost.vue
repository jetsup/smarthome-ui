<template>
  <div v-if="state.confirm" class="modal-overlay" role="presentation">
    <div class="modal" role="alertdialog" aria-modal="true" :aria-label="state.confirm.title">
      <div :class="['dlg-icon', { danger: state.confirm.danger }]">
        <svg viewBox="0 0 24 24" v-if="state.confirm.danger"><path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
        <svg viewBox="0 0 24 24" v-else><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
      </div>
      <h4>{{ state.confirm.title }}</h4>
      <p v-if="state.confirm.message">{{ state.confirm.message }}</p>
      <p v-if="state.confirm.note" class="modal-note">{{ state.confirm.note }}</p>
      <div v-if="state.confirm.password" class="form-group" style="margin-top:12px">
        <label for="dlg-pw">Your password</label>
        <input id="dlg-pw" ref="pwInput" v-model="pw" type="password" autocomplete="current-password" @keyup.enter="okClick" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="state.confirm.resolve(false)">{{ state.confirm.cancelText }}</button>
        <button ref="okBtn" :class="['btn', state.confirm.danger ? 'btn-danger-solid' : 'btn-primary']" @click="okClick" :disabled="state.confirm.password && !pw">{{ state.confirm.confirmText }}</button>
      </div>
    </div>
  </div>

  <div class="toast-stack" aria-live="polite">
    <div v-for="t in state.toasts" :key="t.id" :class="['toast-item', t.type]">
      <span>{{ t.message }}</span>
      <button aria-label="Dismiss" @click="dismissToast(t.id)"><Icon name="x" /></button>
    </div>
  </div>
</template>

<script setup>
import { watch, nextTick, ref, onMounted, onUnmounted } from 'vue'
import { dialogState as state, dismissToast } from '../services/dialog'

const okBtn = ref(null)
const pwInput = ref(null)
const pw = ref('')
watch(() => state.confirm, async (c) => {
  pw.value = ''
  if (c) { await nextTick(); (c.password ? pwInput.value : okBtn.value)?.focus() }
})
// With `password: true` the dialog resolves with what was typed.
function okClick() {
  const c = state.confirm
  if (!c || (c.password && !pw.value)) return
  c.resolve(c.password ? pw.value : true)
}

// Esc closes the top-most dialog (confirm, or any page modal via its overlay).
function onKey(e) {
  if (e.key !== 'Escape') return
  if (state.confirm) { state.confirm.resolve(false); return }
  const overlays = document.querySelectorAll('.modal-overlay')
  const top = overlays[overlays.length - 1]
  if (top) top.dispatchEvent(new MouseEvent('click', { bubbles: false }))
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
