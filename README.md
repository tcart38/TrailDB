# TrailDB

A personal mountain bike trail database. Curate, filter, and rate your favorite locations — like a Notion database but purpose-built for MTB.

## Stack

- **Frontend** — React + Vite dev server on port 5174 (production: nginx on port 3000)
- **Backend** — Node.js + Express REST API on port 3001
- **Database** — SQLite (single file, volume-mounted)
- **Deployment** — Docker Compose

The nginx frontend container proxies `/api/*` requests to the backend, so only port 3000 needs to be exposed externally.

---

## Quick start (local)

```bash
docker compose up --build
```

Open http://localhost:3000.

The SQLite database is created at `./data/traildb.sqlite` by default.

---

## Unraid deployment

### 1. Create the data directory

In Unraid, create the appdata folder first:

```
/mnt/user/appdata/traildb/
```

### 2. Copy the project to your Unraid server

```bash
scp -r . root@unraid:/opt/traildb
```

Or clone it directly on the server.

### 3. Configure the data path

Create a `.env` file next to `docker-compose.yml`:

```env
TRAILDB_DATA_PATH=/mnt/user/appdata/traildb
```

This mounts your Unraid appdata folder into the backend container at `/data`.

### 4. Start the stack

```bash
cd /opt/traildb
docker compose up -d --build
```

### 5. Access the app

Open `http://<unraid-ip>:3000` in your browser.

Only port **3000** needs to be exposed. Port 3001 (the backend) stays internal — the nginx container proxies API calls from the browser.

If you want direct API access, also expose port 3001 in `docker-compose.yml`.

### Updating

```bash
cd /opt/traildb
docker compose pull
docker compose up -d --build
```

The SQLite file in `/mnt/user/appdata/traildb/` is never touched by a rebuild — your data is safe.

### Unraid Community Applications

You can alternatively manage this via the Unraid Docker UI by importing the compose stack through the **Compose Manager** plugin.

---

## Development

### Backend

```bash
cd backend
npm install
npm run dev          # nodemon, hot-reload
```

Runs on http://localhost:3001. Set `DB_PATH` to override the database location.

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server with HMR
```

Runs on http://localhost:5174. Vite proxies `/api` → `localhost:3001`, so you can run both locally without Docker.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/locations` | List locations (filter + sort via query params) |
| `POST` | `/api/locations` | Create a location |
| `GET` | `/api/locations/:id` | Get a single location |
| `PUT` | `/api/locations/:id` | Update a location |
| `DELETE` | `/api/locations/:id` | Delete a location |

### Filter & sort query params

| Param | Values |
|-------|--------|
| `difficulty` | `Green` `Blue` `Black` `Double Black` |
| `trail_type` | `XC` `Enduro` `DH` `Flow` `Tech` |
| `season` | `Spring` `Summer` `Fall` `Winter` |
| `conditions` | `Perfect` `Good` `Wet` `Closed` |
| `rating` | `1`–`5` |
| `sort` | `name` `difficulty` `distance_miles` `elevation_gain_ft` `drive_time_minutes` `personal_rating` `conditions` `created_at` |
| `order` | `asc` (default) `desc` |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRAILDB_DATA_PATH` | `./data` | **Host** path for the SQLite database volume mount |
| `DB_PATH` | `/data/traildb.sqlite` | Path inside the backend container |
| `PORT` | `3001` | Backend listen port |
| `CORS_ORIGIN` | `*` | CORS allowed origin |

---

## Future: Auth via Cloudflare Access

The schema is designed for Cloudflare Access. When you put the app behind Access, authenticated users' emails arrive in the `Cf-Access-Authenticated-User-Email` request header.

To add per-user data later:
1. Add a `users` table (keyed by email).
2. Add a `user_location_data` join table for checkoffs, wishlists, and personal rating overrides.
3. Read the email header in the backend middleware and create/look up the user record.

The `locations` table and all existing API routes stay unchanged — per-user data is purely additive.

The commented schema for both tables is already in [`backend/src/db.js`](backend/src/db.js).
