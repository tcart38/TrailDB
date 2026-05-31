# TrailDB

A personal mountain bike trail database. Track, filter, and rate your favourite locations — purpose-built for MTB.

## Features

- **Location management** — add trail areas with address, drive time, difficulty, conditions, seasons, and notes
- **Custom data columns** — add your own fields (boolean, number, rating, text, etc.)
- **Trail types** — fully configurable with custom colours
- **Map view** — all locations on a Mapbox map with the same filters as the table
- **Filters & saved views** — dynamic filters based on your enabled columns; save filter sets by name
- **Trailforks integration** — region info widget, photos (random/popular/newest), and embedded map
- **Weather forecast** — 6-day forecast per location via Open-Meteo (no API key needed)
- **Drive time** — auto-calculated from your home address via Mapbox Directions API

---

## Stack

- **Frontend** — React 18 + Vite (port 5174 in dev)
- **Backend** — Node.js + Express REST API (port 3001)
- **Database** — SQLite via better-sqlite3
- **Maps** — Mapbox GL JS (requires a free Mapbox token)

---

## Local development

**Backend**

```bash
cd backend
npm install
node src/index.js
```

Runs on http://localhost:3001.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5174. Vite proxies `/api` → `localhost:3001`.

---

## Docker

```bash
docker compose up --build
```

Open http://localhost:3000. The SQLite database is created at `./data/traildb.sqlite` by default.

To change the data path, create a `.env` file next to `docker-compose.yml`:

```env
TRAILDB_DATA_PATH=/your/custom/path
```

---

## First-time setup

1. Go to **Settings → Home Location** and add your Mapbox token (free at mapbox.com — needed for drive times and the map)
2. Enter your home address so drive times can be calculated
3. Add your first location and hit **Drive Times** to geocode it

Coordinates can be entered in the address field instead of a street address (`44.1234, -71.5678`) — they'll be detected and used directly.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `./data/traildb.sqlite` | Path to the SQLite database |
| `PORT` | `3001` | Backend listen port |

---

## Data

Your database (`data/traildb.sqlite`) is excluded from git — it contains your personal trail data, Mapbox token, and home address. Back it up separately.

The default column setup and trail types are seeded from `backend/src/db.js` on first run.
