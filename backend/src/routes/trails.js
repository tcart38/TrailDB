const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

const parseTrail = (row) => ({
  ...row,
  tags: JSON.parse(row.tags || '[]'),
});

const trailRow = (body, locationId) => {
  const { name, difficulty, distance_miles, elevation_gain_ft, tags, description, trailforks_url } = body;
  return {
    location_id:      Number(locationId),
    name:             (name || '').trim(),
    difficulty:       difficulty || null,
    distance_miles:   distance_miles != null && distance_miles !== '' ? Number(distance_miles) : null,
    elevation_gain_ft: elevation_gain_ft != null && elevation_gain_ft !== '' ? Number(elevation_gain_ft) : null,
    tags:             JSON.stringify(Array.isArray(tags) ? tags : []),
    description:      description || null,
    trailforks_url:   trailforks_url || null,
  };
};

// GET /api/locations/:locationId/trails
router.get('/:locationId/trails', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM trails WHERE location_id = ? ORDER BY name ASC'
    ).all(req.params.locationId);
    res.json(rows.map(parseTrail));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/locations/:locationId/trails
router.post('/:locationId/trails', (req, res) => {
  try {
    const row = trailRow(req.body, req.params.locationId);
    if (!row.name) return res.status(400).json({ error: 'Name is required' });
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO trails (location_id, name, difficulty, distance_miles, elevation_gain_ft, tags, description, trailforks_url)
      VALUES (@location_id, @name, @difficulty, @distance_miles, @elevation_gain_ft, @tags, @description, @trailforks_url)
    `).run(row);
    res.status(201).json(parseTrail(db.prepare('SELECT * FROM trails WHERE id = ?').get(lastInsertRowid)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trails/:id
router.put('/trails/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM trails WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const row = trailRow(req.body, existing.location_id);
    if (!row.name) return res.status(400).json({ error: 'Name is required' });
    db.prepare(`
      UPDATE trails SET name=@name, difficulty=@difficulty, distance_miles=@distance_miles,
        elevation_gain_ft=@elevation_gain_ft, tags=@tags, description=@description,
        trailforks_url=@trailforks_url
      WHERE id=@id
    `).run({ ...row, id: req.params.id });
    res.json(parseTrail(db.prepare('SELECT * FROM trails WHERE id = ?').get(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/trails/:id
router.delete('/trails/:id', (req, res) => {
  try {
    if (!db.prepare('SELECT id FROM trails WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    db.prepare('DELETE FROM trails WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
