const express = require('express');
const router = express.Router();
const db = require('../db');

const ALLOWED_SORT = [
  'name', 'difficulty', 'distance_miles', 'elevation_gain_ft',
  'drive_time_minutes', 'personal_rating', 'conditions', 'state', 'region', 'created_at',
];

const parse = (row) => ({
  ...row,
  trail_types: JSON.parse(row.trail_types || '[]'),
  best_seasons: JSON.parse(row.best_seasons || '[]'),
  ride_logs:    JSON.parse(row.ride_logs    || '[]'),
  routes:       JSON.parse(row.routes       || '[]'),
  custom: (() => { try { return JSON.parse(row.custom_data || '{}'); } catch { return {}; } })(),
});

const toRow = (body) => {
  const {
    name, country, state, region, address, trail_types, difficulty, distance_miles, elevation_gain_ft,
    drive_time_minutes, best_seasons, personal_rating, conditions,
    trailforks_url, notes, custom, lat, lng, ride_logs, routes,
  } = body;
  return {
    name:               (name || '').trim(),
    country:            country || null,
    state:              state   || null,
    region:             region  || null,
    address:            address || null,
    trail_types:        JSON.stringify(Array.isArray(trail_types) ? trail_types : []),
    difficulty:         difficulty || null,
    distance_miles:     distance_miles !== '' && distance_miles != null ? Number(distance_miles) : null,
    elevation_gain_ft:  elevation_gain_ft !== '' && elevation_gain_ft != null ? Number(elevation_gain_ft) : null,
    drive_time_minutes:  drive_time_minutes !== '' && drive_time_minutes != null ? Number(drive_time_minutes) : null,
    drive_time_locked:   body.drive_time_locked ? 1 : 0,
    best_seasons:       JSON.stringify(Array.isArray(best_seasons) ? best_seasons : []),
    personal_rating:    personal_rating !== '' && personal_rating != null ? Number(personal_rating) : null,
    conditions:         conditions || null,
    trailforks_url:     trailforks_url || null,
    trailforks_rid:     body.trailforks_rid != null && body.trailforks_rid !== '' ? Number(body.trailforks_rid) : null,
    notes:              notes || null,
    custom_data:        JSON.stringify(custom && typeof custom === 'object' ? custom : {}),
    lat:                lat  != null && lat  !== '' ? Number(lat)  : null,
    lng:                lng  != null && lng  !== '' ? Number(lng)  : null,
    ride_logs:          JSON.stringify(Array.isArray(ride_logs) ? ride_logs : []),
    routes:             JSON.stringify(Array.isArray(routes)    ? routes    : []),
  };
};

// GET /api/locations/options — unique states + regions for filter autocomplete
router.get('/options', (req, res) => {
  try {
    const states  = db.prepare("SELECT DISTINCT state  FROM locations WHERE state  IS NOT NULL AND state  != '' ORDER BY state").all().map(r => r.state);
    const rawRegs = db.prepare("SELECT DISTINCT region, state FROM locations WHERE region IS NOT NULL AND region != '' ORDER BY region").all();
    const regions = {};
    for (const { state, region } of rawRegs) {
      if (!regions[state]) regions[state] = [];
      regions[state].push(region);
    }
    res.json({ states, regions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/locations
router.get('/', (req, res) => {
  try {
    const { difficulty, trail_type, season, rating, conditions, state, region, sort, order } = req.query;
    const wheres = [];
    const params = [];

    if (difficulty) { wheres.push('difficulty = ?');      params.push(difficulty); }
    if (trail_type) { wheres.push('trail_types LIKE ?');  params.push(`%"${trail_type}"%`); }
    if (season)     { wheres.push('best_seasons LIKE ?'); params.push(`%"${season}"%`); }
    if (rating)     { wheres.push('personal_rating = ?'); params.push(Number(rating)); }
    if (conditions) { wheres.push('conditions = ?');      params.push(conditions); }
    if (state)      { wheres.push('state = ?');           params.push(state); }
    if (region)     { wheres.push('region = ?');          params.push(region); }

    const col   = ALLOWED_SORT.includes(sort) ? sort : 'name';
    const dir   = order === 'desc' ? 'DESC' : 'ASC';
    const where = wheres.length ? ` WHERE ${wheres.join(' AND ')}` : '';
    const sql   = `SELECT * FROM locations${where} ORDER BY ${col} ${dir}`;

    res.json(db.prepare(sql).all(params).map(parse));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/locations/:id
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(parse(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/locations
router.post('/', (req, res) => {
  try {
    const row = toRow(req.body);
    if (!row.name) return res.status(400).json({ error: 'Name is required' });

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO locations
        (name, country, state, region, address, trail_types, difficulty, distance_miles, elevation_gain_ft,
         drive_time_minutes, drive_time_locked, best_seasons, personal_rating, conditions, trailforks_url, trailforks_rid, notes, custom_data, lat, lng, ride_logs, routes)
      VALUES
        (@name, @country, @state, @region, @address, @trail_types, @difficulty, @distance_miles, @elevation_gain_ft,
         @drive_time_minutes, @drive_time_locked, @best_seasons, @personal_rating, @conditions, @trailforks_url, @trailforks_rid, @notes, @custom_data, @lat, @lng, @ride_logs, @routes)
    `).run(row);

    res.status(201).json(parse(db.prepare('SELECT * FROM locations WHERE id = ?').get(lastInsertRowid)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/locations/:id
router.put('/:id', (req, res) => {
  try {
    if (!db.prepare('SELECT id FROM locations WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const row = toRow(req.body);
    if (!row.name) return res.status(400).json({ error: 'Name is required' });

    db.prepare(`
      UPDATE locations SET
        name = @name, country = @country, state = @state, region = @region, address = @address,
        trail_types = @trail_types, difficulty = @difficulty,
        distance_miles = @distance_miles, elevation_gain_ft = @elevation_gain_ft,
        drive_time_minutes = @drive_time_minutes, drive_time_locked = @drive_time_locked, best_seasons = @best_seasons,
        personal_rating = @personal_rating, conditions = @conditions,
        trailforks_url = @trailforks_url, trailforks_rid = @trailforks_rid, notes = @notes, custom_data = @custom_data,
        lat = @lat, lng = @lng, ride_logs = @ride_logs, routes = @routes,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ ...row, id: req.params.id });

    res.json(parse(db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/locations/bulk-delete
router.post('/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM locations WHERE id IN (${placeholders})`).run(ids);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/locations/:id
router.delete('/:id', (req, res) => {
  try {
    if (!db.prepare('SELECT id FROM locations WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
