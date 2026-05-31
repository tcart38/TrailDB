const BASE = '/api'

const handle = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const getLocationOptions = () =>
  fetch(`${BASE}/locations/options`).then(handle)

export const getLocations = (params = {}) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v != null) qs.set(k, v)
  })
  return fetch(`${BASE}/locations?${qs}`).then(handle)
}

export const createLocation = (data) =>
  fetch(`${BASE}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)

export const updateLocation = (id, data) =>
  fetch(`${BASE}/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)

export const deleteLocation = (id) =>
  fetch(`${BASE}/locations/${id}`, { method: 'DELETE' }).then(handle)

export const bulkDeleteLocations = (ids) =>
  fetch(`${BASE}/locations/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  }).then(handle)
