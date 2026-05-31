const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    rows.forEach(r => {
      try { result[r.key] = JSON.parse(r.value); }
      catch { result[r.key] = r.value; }
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/:key — generic value update
router.put('/:key', (req, res) => {
  try {
    const { value } = req.body;
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(req.params.key, JSON.stringify(value));
    res.json({ key: req.params.key, value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/settings/trail_types/:name — remove a trail type tag + clean locations
router.delete('/trail_types/:name', (req, res) => {
  try {
    const name = req.params.name;
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('trail_types');
    if (row) {
      const updated = JSON.parse(row.value).filter(t => t !== name);
      db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
        .run(JSON.stringify(updated), 'trail_types');
    }
    const affected = db.prepare('SELECT id, trail_types FROM locations WHERE trail_types LIKE ?')
      .all(`%"${name}"%`);
    const stmt = db.prepare('UPDATE locations SET trail_types = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const loc of affected) {
      const cleaned = JSON.parse(loc.trail_types).filter(t => t !== name);
      stmt.run(JSON.stringify(cleaned), loc.id);
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings/columns — add a new custom column definition
router.post('/columns', (req, res) => {
  try {
    const { label, type, options } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ error: 'Label is required' });

    const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const key = `c_${slug}`;

    const row = db.prepare("SELECT value FROM settings WHERE key = 'columns'").get();
    const columns = row ? JSON.parse(row.value) : [];

    if (columns.find(c => c.key === key)) {
      return res.status(400).json({ error: 'A column with that name already exists' });
    }

    const newCol = { key, label: label.trim(), type: type || 'text', enabled: true, builtin: false };
    if (options && Array.isArray(options)) newCol.options = options;

    const updated = [...columns, newCol];
    db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'columns'")
      .run(JSON.stringify(updated));

    res.status(201).json(newCol);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/settings/columns/:key — remove a custom column + wipe its data from locations
router.delete('/columns/:key', (req, res) => {
  try {
    const { key } = req.params;

    const row = db.prepare("SELECT value FROM settings WHERE key = 'columns'").get();
    if (!row) return res.status(404).json({ error: 'Not found' });

    const columns = JSON.parse(row.value);
    const col = columns.find(c => c.key === key);
    if (!col) return res.status(404).json({ error: 'Column not found' });

    const updated = columns.filter(c => c.key !== key);
    db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'columns'")
      .run(JSON.stringify(updated));

    // Wipe the key from every location's custom_data
    const locs = db.prepare("SELECT id, custom_data FROM locations WHERE custom_data != '{}'").all();
    const stmt = db.prepare('UPDATE locations SET custom_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const loc of locs) {
      try {
        const data = JSON.parse(loc.custom_data);
        if (key in data) {
          delete data[key];
          stmt.run(JSON.stringify(data), loc.id);
        }
      } catch { /* malformed JSON, skip */ }
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
