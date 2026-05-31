const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/traildb.sqlite');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const DEFAULT_COLUMNS = [
  { key: 'country',            label: 'Country',              type: 'country',           enabled: true,  builtin: true  },
  { key: 'state',              label: 'State / Province',     type: 'state_province',    enabled: true,  builtin: true  },
  { key: 'region',             label: 'Region',               type: 'text_autocomplete', enabled: true,  builtin: true  },
  { key: 'address',            label: 'Address',              type: 'text',              enabled: true,  builtin: true  },
  { key: 'trail_types',        label: 'Trail Types',          type: 'tags',              enabled: true,  builtin: true  },
  { key: 'elevation_gain_ft',  label: 'Vertical',             type: 'number',            enabled: true,  builtin: true  },
  { key: 'drive_time_minutes', label: 'Drive (min)',          type: 'number',            enabled: true,  builtin: true  },
  { key: 'trailforks_url',     label: 'URL',                  type: 'url',               enabled: true,  builtin: true  },
  { key: 'trailforks_rid',     label: 'Trailforks Region ID', type: 'number',            enabled: true,  builtin: true  },
  { key: 'notes',              label: 'Notes',                type: 'textarea',          enabled: true,  builtin: true  },
  { key: 'c_lift_access',      label: 'Lift access',          type: 'boolean',           enabled: true,  builtin: false },
  { key: 'c_shuttle',          label: 'Shuttle',              type: 'boolean',           enabled: true,  builtin: false },
  { key: 'c_hike_a_bike',      label: 'Hike-a-bike',          type: 'boolean',           enabled: true,  builtin: false },
  { key: 'c_rating',           label: 'Rating',               type: 'rating',            enabled: true,  builtin: false },
  { key: 'c_visted',           label: 'Visted',               type: 'boolean',           enabled: true,  builtin: false },
  { key: 'c_wishlist',         label: 'Wishlist',             type: 'boolean',           enabled: true,  builtin: false },
];

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('trail_types', '["XC","Enduro","DH","Flow","Tech","Jumps"]'),
    ('trail_type_colors', '{"XC":"teal","Enduro":"orange","DH":"red","Flow":"green","Tech":"purple","Jumps":"amber"}');

  CREATE TABLE IF NOT EXISTS locations (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL,
    trail_types        TEXT    NOT NULL DEFAULT '[]',
    difficulty         TEXT    CHECK(difficulty IN ('Green','Blue','Black','Double Black') OR difficulty IS NULL),
    distance_miles     REAL,
    elevation_gain_ft  INTEGER,
    drive_time_minutes INTEGER,
    best_seasons       TEXT    NOT NULL DEFAULT '[]',
    personal_rating    INTEGER CHECK(personal_rating BETWEEN 1 AND 5 OR personal_rating IS NULL),
    conditions         TEXT    CHECK(conditions IN ('Perfect','Good','Wet','Closed') OR conditions IS NULL),
    trailforks_url     TEXT,
    notes              TEXT,
    custom_data        TEXT    NOT NULL DEFAULT '{}',
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  /*
   * Future auth: Cloudflare Access passes the authenticated user's email in
   * the Cf-Access-Authenticated-User-Email header. Schema additions needed:
   *
   * CREATE TABLE IF NOT EXISTS users (
   *   email        TEXT PRIMARY KEY,
   *   display_name TEXT,
   *   created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
   * );
   *
   * Per-user checkoffs, wishlists, and rating overrides:
   *
   * CREATE TABLE IF NOT EXISTS user_location_data (
   *   user_email      TEXT    NOT NULL REFERENCES users(email) ON DELETE CASCADE,
   *   location_id     INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
   *   checked_off     INTEGER NOT NULL DEFAULT 0,
   *   wishlisted      INTEGER NOT NULL DEFAULT 0,
   *   personal_rating INTEGER CHECK(personal_rating BETWEEN 1 AND 5 OR personal_rating IS NULL),
   *   notes           TEXT,
   *   PRIMARY KEY (user_email, location_id)
   * );
   *
   * The locations table personal_rating and notes columns become owner-level
   * defaults; user_location_data rows shadow them per authenticated user.
   */
`);

// Seed or migrate columns setting
const existingColumnsSetting = db.prepare("SELECT value FROM settings WHERE key = 'columns'").get();
if (!existingColumnsSetting) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('columns', ?)").run(JSON.stringify(DEFAULT_COLUMNS));
} else {
  // Migrate: insert state + region if missing
  const cols = JSON.parse(existingColumnsSetting.value);
  const keys = new Set(cols.map(c => c.key));
  let changed = false;
  if (!keys.has('state')) {
    cols.unshift({ key: 'address', label: 'Address',          type: 'text',              enabled: true, builtin: true });
    cols.unshift({ key: 'region',  label: 'Region',           type: 'text_autocomplete', enabled: true, builtin: true });
    cols.unshift({ key: 'state',   label: 'State / Province', type: 'state_province',    enabled: true, builtin: true });
    cols.unshift({ key: 'country', label: 'Country',          type: 'country',           enabled: true, builtin: true });
    changed = true;
  }
  if (!keys.has('address')) {
    const regionIdx = cols.findIndex(c => c.key === 'region');
    const insertAt = regionIdx >= 0 ? regionIdx + 1 : 2;
    cols.splice(insertAt, 0, { key: 'address', label: 'Address', type: 'text', enabled: true, builtin: true });
    changed = true;
  }
  if (!keys.has('trailforks_rid')) {
    const urlIdx = cols.findIndex(c => c.key === 'trailforks_url');
    const insertAt = urlIdx >= 0 ? urlIdx + 1 : cols.length - 1;
    cols.splice(insertAt, 0, { key: 'trailforks_rid', label: 'Trailforks Region ID', type: 'number', enabled: true, builtin: true });
    changed = true;
  }
  if (!keys.has('country')) {
    // state/region/address already present, prepend country
    cols.unshift({ key: 'country', label: 'Country', type: 'country', enabled: true, builtin: true });
    changed = true;
  }
  // Migrate state label/type if it's still the old text_autocomplete
  const stateCol = cols.find(c => c.key === 'state');
  if (stateCol && stateCol.type === 'text_autocomplete') {
    stateCol.label = 'State / Province';
    stateCol.type  = 'state_province';
    changed = true;
  }
  if (changed) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'columns'").run(JSON.stringify(cols));
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS trails (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id       INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    difficulty        TEXT CHECK(difficulty IN ('Green','Blue','Black','Double Black') OR difficulty IS NULL),
    distance_miles    REAL,
    elevation_gain_ft INTEGER,
    tags              TEXT NOT NULL DEFAULT '[]',
    description       TEXT,
    trailforks_url    TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Additive migrations — safe to re-run on existing databases
const migrate = (sql) => { try { db.exec(sql) } catch (_) { /* already exists */ } }
migrate("ALTER TABLE locations ADD COLUMN custom_data TEXT NOT NULL DEFAULT '{}'")
migrate("ALTER TABLE locations ADD COLUMN country TEXT")
migrate("ALTER TABLE locations ADD COLUMN state TEXT")
migrate("ALTER TABLE locations ADD COLUMN region TEXT")
migrate("ALTER TABLE locations ADD COLUMN address TEXT")
migrate("ALTER TABLE locations ADD COLUMN lat REAL")
migrate("ALTER TABLE locations ADD COLUMN lng REAL")
migrate("ALTER TABLE locations ADD COLUMN drive_time_computed_at DATETIME")
migrate("ALTER TABLE locations ADD COLUMN drive_time_locked INTEGER NOT NULL DEFAULT 0")
migrate("ALTER TABLE locations ADD COLUMN trailforks_rid INTEGER")
migrate("ALTER TABLE locations ADD COLUMN ride_logs TEXT NOT NULL DEFAULT '[]'")
migrate("ALTER TABLE locations ADD COLUMN routes TEXT NOT NULL DEFAULT '[]'")

module.exports = db;
