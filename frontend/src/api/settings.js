const BASE = '/api/settings'

const handle = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const getSettings = () =>
  fetch(BASE).then(handle)

export const updateSetting = (key, value) =>
  fetch(`${BASE}/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }).then(handle)

export const deleteTrailType = (name) =>
  fetch(`${BASE}/trail_types/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(handle)

export const addColumn = (label, type, options) =>
  fetch(`${BASE}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, type, options }),
  }).then(handle)

export const deleteColumn = (key) =>
  fetch(`${BASE}/columns/${encodeURIComponent(key)}`, { method: 'DELETE' }).then(handle)
