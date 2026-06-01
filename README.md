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

You need **two terminal windows open at the same time** — one for the backend, one for the frontend. Both must be running.

**Terminal 1 — Backend**

```bash
cd /path/to/TrailDB/backend
npm install
node src/index.js
```

Runs on http://localhost:3001. Leave this running.

**Terminal 2 — Frontend**

```bash
cd /path/to/TrailDB/frontend
npm install
npm run dev
```

Runs on http://localhost:5174. Vite proxies all `/api` requests to the backend on port 3001.

Open **http://localhost:5174** in your browser. The app won't work if either process isn't running.

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

## Unraid (Docker Compose plugin)

In the Unraid Compose plugin, create a new stack and paste the following into each section.

**Compose File**

Builds both containers directly from GitHub. Change port `3005` to any free port on your server.

```yaml
services:
  backend:
    build:
      context: https://github.com/tcart38/TrailDB.git#main:backend
    restart: unless-stopped
    environment:
      - DB_PATH=/data/traildb.sqlite
      - NODE_ENV=production
    volumes:
      - ${TRAILDB_DATA_PATH}:/data

  frontend:
    build:
      context: https://github.com/tcart38/TrailDB.git#main:frontend
    restart: unless-stopped
    ports:
      - "3005:80"
    depends_on:
      - backend
```

**Env File**

```env
TRAILDB_DATA_PATH=/mnt/user/appdata/traildb/
```

Hit **Compose Up**. The first build takes a few minutes. Once running, open `http://[your-unraid-ip]:3005`.

Your database lives at `/mnt/user/appdata/traildb/traildb.sqlite` and is never touched by rebuilds.

**Updating**

To pull a new version, hit **Compose Down** then **Compose Up** in the plugin. The build will use the latest code from GitHub automatically.

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
