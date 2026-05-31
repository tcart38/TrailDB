const BASE = '/api/geo'

const handle = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || 'Request failed')
  }
  return res.json()
}

export const geocode = (query) =>
  fetch(`${BASE}/geocode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then(handle)

export const getDriveTime = (fromLat, fromLng, toLat, toLng) =>
  fetch(`${BASE}/drive-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromLat, fromLng, toLat, toLng }),
  }).then(handle)

export const refreshDriveTimes = () =>
  fetch(`${BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true }),
  }).then(handle)
