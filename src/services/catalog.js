import { ref } from 'vue'
import api from './api'

// The hub describes every kind of module (fields, readings, actions) in one catalog;
// the forms and controls are generated from it, so new hardware needs no UI changes.
export const catalog = ref([])
let loading = null

export function loadCatalog() {
  if (!loading) {
    loading = api.get('/capabilities/catalog').then(({ data }) => { catalog.value = data.types || [] }).catch(() => { loading = null })
  }
  return loading
}

export const typeOf = (key) => catalog.value.find((t) => t.key === key)

export function blankCap(key = 'digitalOutput') {
  const t = typeOf(key)
  const cap = { type: key, pin: 0, pin2: 0, count: 0, ring: false, extra: 0, label: '' }
  for (const f of t?.fields || []) {
    if (f.key === 'ring') cap.ring = !!f.default
    else cap[f.key] = f.default
  }
  return cap
}

// A list of caps as the hub stored it -> editable copies.
export function editable(caps) {
  return (caps || []).map((c) => ({ type: c.type, pin: c.pin || 0, pin2: c.pin2 || 0, count: c.count || 0, ring: !!c.ring, extra: c.extra || 0, label: c.label || '' }))
}

// ...and back to what the hub accepts.
export function payload(caps) {
  return caps.map((c) => {
    const t = typeOf(c.type)
    const keys = new Set((t?.fields || []).map((f) => f.key))
    const out = { type: c.type, label: c.label || '' }
    if (keys.has('pin')) out.pin = Number(c.pin) || 0
    if (keys.has('pin2')) out.pin2 = Number(c.pin2) || 0
    if (keys.has('count')) out.count = Number(c.count) || 0
    if (keys.has('ring')) out.ring = !!c.ring
    if (keys.has('extra')) out.extra = Number(c.extra) || 0
    return out
  })
}
