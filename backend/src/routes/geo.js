const express = require('express');
const router = express.Router();
const db = require('../db');

const MAPBOX_BASE = 'https://api.mapbox.com';

// Returns { lat, lng } if str looks like "44.1234, -71.5678", otherwise null
function parseCoords(str) {
  const m = str.trim().match(/^(-?\d{1,3}\.?\d*)\s*[,\s]\s*(-?\d{1,3}\.?\d*)$/)
  if (!m) return null
  const lat = parseFloat(m[1]), lng = parseFloat(m[2])
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function getToken() {
  // Prefer env var, fall back to stored setting
  if (process.env.MAPBOX_TOKEN) return process.env.MAPBOX_TOKEN;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'mapbox_token'").get();
  return row ? JSON.parse(row.value) : null;
}

async function geocodeMapbox(query, token) {
  const url = `${MAPBOX_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&types=address,place,poi`;
  const r = await fetch(url);
  const data = await r.json();
  if (!data.features?.length) return null;
  const [lng, lat] = data.features[0].geometry.coordinates;
  return { lat, lng, display_name: data.features[0].place_name };
}

async function routeMapbox(fromLat, fromLng, toLat, toLng, token) {
  const url = `${MAPBOX_BASE}/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${token}&overview=false`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.code !== 'Ok' || !data.routes?.length) return null;
  return Math.round(data.routes[0].duration / 60);
}

// POST /api/geo/geocode
router.post('/geocode', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  const token = getToken();
  if (!token) return res.status(400).json({ error: 'No Mapbox token configured. Add one in Settings → Home Location.' });
  try {
    const result = await geocodeMapbox(query, token);
    if (!result) return res.status(404).json({ error: 'No results found' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Geocoding failed: ' + err.message });
  }
});

// POST /api/geo/drive-time
router.post('/drive-time', async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.body;
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng are required' });
  }
  const token = getToken();
  if (!token) return res.status(400).json({ error: 'No Mapbox token configured.' });
  try {
    const minutes = await routeMapbox(fromLat, fromLng, toLat, toLng, token);
    if (minutes == null) return res.status(404).json({ error: 'No route found' });
    res.json({ minutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Routing failed: ' + err.message });
  }
});

// POST /api/geo/refresh — bulk geocode + drive times for all unlocked locations
// Pass { force: true } to recalculate even recently-computed values (used by the manual button).
// Omit (or pass force: false) for background/scheduled runs that respect the 30-day window.
router.post('/refresh', async (req, res) => {
  try {
    const token = getToken();
    if (!token) return res.status(400).json({ error: 'No Mapbox token configured. Add one in Settings → Home Location.' });

    const homeSetting = db.prepare("SELECT value FROM settings WHERE key = 'home_location'").get();
    if (!homeSetting) return res.status(400).json({ error: 'No home location set in Settings' });
    const home = JSON.parse(homeSetting.value);
    if (home.lat == null || home.lng == null) {
      return res.status(400).json({ error: 'Home location has not been geocoded yet' });
    }

    const force = req.body?.force !== false; // default true — manual button always force-refreshes
    const whereStale = force
      ? 'drive_time_locked = 0'
      : `drive_time_locked = 0 AND (drive_time_computed_at IS NULL OR drive_time_computed_at < datetime('now', '-30 days'))`;

    const stale = db.prepare(`
      SELECT id, name, region, state, address, lat, lng
      FROM locations WHERE ${whereStale}
    `).all();

    let updated = 0;
    const errors = [];

    for (const loc of stale) {
      try {
        let lat = loc.lat, lng = loc.lng;

        // Always re-geocode when force=true so updated addresses are picked up
        if (force || lat == null || lng == null) {
          const q = loc.address || [loc.name, loc.region, loc.state].filter(Boolean).join(', ');
          if (!q.trim()) { errors.push(`${loc.name}: no address to geocode`); continue; }
          // If the address is raw coordinates, use them directly — no geocoding needed
          const direct = parseCoords(q)
          if (direct) {
            lat = direct.lat; lng = direct.lng;
          } else {
            const geo = await geocodeMapbox(q, token);
            if (geo) { lat = geo.lat; lng = geo.lng; }
          }
        }

        if (lat == null || lng == null) {
          errors.push(`${loc.name}: could not geocode`);
          continue;
        }

        const minutes = await routeMapbox(home.lat, home.lng, lat, lng, token);
        if (minutes == null) {
          errors.push(`${loc.name}: no route found`);
          continue;
        }

        db.prepare(`
          UPDATE locations
          SET lat = ?, lng = ?, drive_time_minutes = ?, drive_time_computed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(lat, lng, minutes, loc.id);
        updated++;
      } catch (e) {
        errors.push(`${loc.name}: ${e.message}`);
      }
    }

    res.json({ updated, skipped: stale.length - updated - errors.length, errors, total: stale.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
