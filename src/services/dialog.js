import { reactive } from 'vue'

// Themed replacements for window.confirm / alert.
export const dialogState = reactive({ confirm: null, toasts: [] })
let nextId = 1

/** await confirmDialog({ title, message, note, confirmText, cancelText, danger }) -> boolean */
export function confirmDialog(opts) {
  return new Promise((resolve) => {
    dialogState.confirm = {
      title: 'Are you sure?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      danger: false,
      ...(typeof opts === 'string' ? { message: opts } : opts),
      resolve: (v) => { dialogState.confirm = null; resolve(v) },
    }
  })
}

/** notify('Saved', 'ok' | 'error' | 'info') */
export function notify(message, type = 'info', ms = 4500) {
  const id = nextId++
  dialogState.toasts.push({ id, message, type })
  setTimeout(() => dismissToast(id), ms)
}
export function dismissToast(id) {
  const i = dialogState.toasts.findIndex((t) => t.id === id)
  if (i >= 0) dialogState.toasts.splice(i, 1)
}
