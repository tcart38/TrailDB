const BASE = '/api'

const handle = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const getTrails = (locationId) =>
  fetch(`${BASE}/locations/${locationId}/trails`).then(handle)

export const createTrail = (locationId, data) =>
  fetch(`${BASE}/locations/${locationId}/trails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)

export const updateTrail = (id, data) =>
  fetch(`${BASE}/trails/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)

export const deleteTrail = (id) =>
  fetch(`${BASE}/trails/${id}`, { method: 'DELETE' }).then(handle)
