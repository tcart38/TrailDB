import { useState, useEffect } from 'react'
import LocationForm from './LocationForm.jsx'
import TrailList from './TrailList.jsx'
import { createLocation, updateLocation, deleteLocation } from '../api/locations.js'
import { getTrails } from '../api/trails.js'
import { defaultValue, formatDriveTime } from '../utils/columns.js'
import { getTagStyle, TAG_PRESETS } from '../utils/constants.js'

// ── Helpers ───────────────────────────────────────────────────────────────
const TYPE_PALETTE = ['tag-xc','tag-enduro','tag-dh','tag-flow','tag-tech','tag-jumps','tag-alt1','tag-alt2']
const typeClass = (t) => {
  let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return TYPE_PALETTE[h % TYPE_PALETTE.length]
}
const DIFF_CLASS  = { Green: 'badge-green', Blue: 'badge-blue', Black: 'badge-black', 'Double Black': 'badge-dblack' }
const COND_CLASS  = { Perfect: 'badge-perfect', Good: 'badge-good', Wet: 'badge-wet', Closed: 'badge-closed' }

const toFormState = (loc, columns) => {
  const custom = {}
  columns.filter(c => !c.builtin).forEach(col => {
    custom[col.key] = loc?.custom?.[col.key] ?? defaultValue(col.type)
  })
  return {
    name:               loc?.name               ?? '',
    country:            loc?.country            ?? '',
    state:              loc?.state              ?? '',
    region:             loc?.region             ?? '',
    address:            loc?.address            ?? '',
    trail_types:        loc?.trail_types         ?? [],
    difficulty:         loc?.difficulty          ?? '',
    distance_miles:     loc?.distance_miles      ?? '',
    elevation_gain_ft:  loc?.elevation_gain_ft   ?? '',
    drive_time_minutes: loc?.drive_time_minutes   ?? '',
    drive_time_locked:  loc?.drive_time_locked    ?? false,
    best_seasons:       loc?.best_seasons        ?? [],
    personal_rating:    loc?.personal_rating     ?? null,
    conditions:         loc?.conditions          ?? '',
    trailforks_url:     loc?.trailforks_url      ?? '',
    trailforks_rid:     loc?.trailforks_rid      ?? '',
    notes:              loc?.notes               ?? '',
    ride_logs:          loc?.ride_logs           ?? [],
    routes:             loc?.routes              ?? [],
    custom,
  }
}

// ── Trailforks region banner ──────────────────────────────────────────────
// Use a srcdoc iframe so DOMContentLoaded fires fresh for every location.
// Script-tag injection fails here because DOMContentLoaded already fired on
// the main page and the widget script never re-runs its initialization.
const RESIZER_URL = 'https://es.pinkbike.org/326/sprt/j/trailforks/iframeResizer.min.js'
const WIDGET_URL  = 'https://es.pinkbike.org/ttl-86400/sprt/j/trailforks/widget.js'

function regionInfoDoc(rid) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden;}</style></head><body>
<div class="TrailforksRegionInfo" data-w="100%" data-h="150px" data-rid="${rid}"
  data-counts="1" data-stats="1" data-title="1" data-activitytype="1"></div>
<script src="${RESIZER_URL}"></script>
<script src="${WIDGET_URL}"></script>
</body></html>`
}

function TrailforksRegionInfo({ rid }) {
  if (!rid) return null
  return (
    <div className="tf-region-info-wrap">
      <iframe
        key={rid}
        srcDoc={regionInfoDoc(rid)}
        width="100%"
        height="150"
        style={{ border: 'none', display: 'block' }}
        scrolling="no"
        title="Region info"
      />
    </div>
  )
}

// ── Trailforks photos ─────────────────────────────────────────────────────
const PHOTO_SORTS = [
  { id: 'random',  label: 'Random'  },
  { id: 'popular', label: 'Popular' },
  { id: 'date',    label: 'Newest'  },
]

function photosDoc(rid, sort) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden;}</style></head><body>
<div class="TrailforksPhotos" data-w="100%" data-h="235px" data-rid="${rid}"
  data-trailid="0" data-activitytype="1" data-count="3" data-title="0"
  data-sort="${sort}" data-cols="3"></div>
<script src="${RESIZER_URL}"></script>
<script src="${WIDGET_URL}"></script>
</body></html>`
}

function TrailforksPhotos({ rid }) {
  const [sort, setSort] = useState('random')
  if (!rid) return null
  return (
    <div className="tf-photos">
      <div className="tf-photos-header">
        <span className="tf-photos-label">Photos</span>
        <div className="tf-photos-sorts">
          {PHOTO_SORTS.map(s => (
            <button
              key={s.id}
              className={`tf-sort-btn${sort === s.id ? ' active' : ''}`}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <iframe
        key={`${rid}-${sort}`}
        srcDoc={photosDoc(rid, sort)}
        width="100%"
        height="235"
        style={{ border: 'none', display: 'block' }}
        scrolling="no"
        title="Photos"
      />
    </div>
  )
}

// ── Map widget embed ──────────────────────────────────────────────────────
function TrailforksWidgets({ rid, trailforksUrl }) {
  const [open, setOpen] = useState(false)
  if (!rid) return null
  const mapSrc  = `https://www.trailforks.com/widgets/region_map/?rid=${rid}`
  const openUrl = trailforksUrl || `https://www.trailforks.com/region/?rid=${rid}`
  return (
    <div className="tf-widgets">
      <button className="tf-widgets-header" onClick={() => setOpen(v => !v)}>
        <span className="tf-widgets-label">Map</span>
        <span className="tf-widgets-toggle">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="tf-widgets-body">
          <div className="tf-tab-bar">
            <a href={openUrl} target="_blank" rel="noopener noreferrer" className="tf-open-link">
              Open in Trailforks ↗
            </a>
          </div>
          <iframe src={mapSrc}
            width="100%" height={420} frameBorder="0" scrolling="no"
            loading="eager" allow="geolocation" className="tf-widget-frame"
            title="Map" />
        </div>
      )}
    </div>
  )
}

// ── Route list + Ride log list ────────────────────────────────────────────
function LinkList({ title, items, onAdd, onRemove, renderItem, renderForm }) {
  const [adding, setAdding] = useState(false)
  const cancel = () => setAdding(false)
  return (
    <div className="detail-section">
      <div className="detail-linklist-header">
        <span className="detail-section-label">{title}</span>
        {!adding && (
          <button className="detail-add-btn" onClick={() => setAdding(true)}>+ Add</button>
        )}
      </div>
      {adding && renderForm({ onSave: (entry) => { onAdd(entry); setAdding(false) }, onCancel: cancel })}
      {items.length === 0 && !adding && (
        <p className="detail-empty">None added yet</p>
      )}
      {items.map(item => (
        <div key={item.id} className="detail-link-item">
          {renderItem(item)}
          <button className="detail-link-delete" onClick={() => onRemove(item.id)} title="Remove">×</button>
        </div>
      ))}
    </div>
  )
}

function RouteList({ location, onUpdate }) {
  const [routes, setRoutes] = useState(location?.routes ?? [])
  useEffect(() => { setRoutes(location?.routes ?? []) }, [location?.id])

  const save = async (updated) => {
    setRoutes(updated)
    const fresh = await updateLocation(location.id, { ...location, routes: updated })
    onUpdate(fresh)
  }

  return (
    <LinkList
      title="Routes"
      items={routes}
      onAdd={(entry) => save([...routes, { id: Date.now(), ...entry }])}
      onRemove={(id) => save(routes.filter(r => r.id !== id))}
      renderItem={(r) => (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="detail-link">
          {r.name || 'View route'} ↗
        </a>
      )}
      renderForm={({ onSave, onCancel }) => (
        <RouteForm onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}

function RouteForm({ onSave, onCancel }) {
  const [url, setUrl]   = useState('')
  const [name, setName] = useState('')
  return (
    <div className="detail-link-form">
      <input autoFocus className="form-input form-input-sm" placeholder="Trailforks route URL…"
        value={url} onChange={e => setUrl(e.target.value)} />
      <input className="form-input form-input-sm" placeholder="Name (optional)"
        value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onSave({ url: url.trim(), name: name.trim() }) }} />
      <div className="detail-link-form-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSave({ url: url.trim(), name: name.trim() })} disabled={!url.trim()}>Add</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function RideLogList({ location, onUpdate }) {
  const [logs, setLogs] = useState(location?.ride_logs ?? [])
  useEffect(() => { setLogs(location?.ride_logs ?? []) }, [location?.id])

  const save = async (updated) => {
    setLogs(updated)
    const fresh = await updateLocation(location.id, { ...location, ride_logs: updated })
    onUpdate(fresh)
  }

  return (
    <LinkList
      title="Ride Logs"
      items={logs}
      onAdd={(entry) => save([...logs, { id: Date.now(), ...entry }])}
      onRemove={(id) => save(logs.filter(l => l.id !== id))}
      renderItem={(l) => (
        <span className="detail-link-entry">
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="detail-link">
            {l.date ? l.date : 'View ride'} ↗
          </a>
          {l.notes && <span className="detail-link-notes"> — {l.notes}</span>}
        </span>
      )}
      renderForm={({ onSave, onCancel }) => (
        <RideLogForm onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}

function RideLogForm({ onSave, onCancel }) {
  const [url,   setUrl]   = useState('')
  const [date,  setDate]  = useState('')
  const [notes, setNotes] = useState('')
  return (
    <div className="detail-link-form">
      <input autoFocus className="form-input form-input-sm" placeholder="Trailforks ride log URL…"
        value={url} onChange={e => setUrl(e.target.value)} />
      <input type="date" className="form-input form-input-sm"
        value={date} onChange={e => setDate(e.target.value)} />
      <input className="form-input form-input-sm" placeholder="Notes (optional)"
        value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="detail-link-form-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSave({ url: url.trim(), date, notes: notes.trim() })} disabled={!url.trim()}>Add</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Weather widget ────────────────────────────────────────────────────────
const weatherCache = {}  // simple in-memory cache keyed by "lat,lng"
const CACHE_TTL = 30 * 60 * 1000  // 30 minutes

function weatherIcon(code) {
  if (code === 0)             return '☀️'
  if (code <= 2)              return '🌤️'
  if (code <= 3)              return '⛅'
  if (code <= 48)             return '🌫️'
  if (code <= 67)             return '🌧️'
  if (code <= 77)             return '🌨️'
  if (code <= 82)             return '🌦️'
  if (code <= 86)             return '🌨️'
  return '⛈️'
}

function dayLabel(dateStr, index) {
  if (index === 0) return 'Today'
  // Append noon local to avoid UTC-midnight timezone shifting the day
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

function WeatherWidget({ lat, lng }) {
  const [days, setDays]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (lat == null || lng == null) return
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`

    // Serve from cache if fresh
    const cached = weatherCache[key]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setDays(cached.data); return
    }

    setLoading(true); setDays(null); setError(null)

    const url = `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=6`

    fetch(url)
      .then(r => r.json())
      .then(json => {
        const d = json.daily
        const parsed = d.time.map((t, i) => ({
          label:  dayLabel(t, i),
          icon:   weatherIcon(d.weathercode[i]),
          high:   Math.round(d.temperature_2m_max[i]),
          low:    Math.round(d.temperature_2m_min[i]),
          precip: d.precipitation_sum[i] ?? 0,
        }))
        weatherCache[key] = { data: parsed, ts: Date.now() }
        setDays(parsed)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [lat, lng])

  if (lat == null || lng == null) return null

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <span className="detail-section-label" style={{ marginBottom: 0 }}>Weather</span>
        <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="weather-credit">
          Open-Meteo ↗
        </a>
      </div>

      {loading && (
        <div className="weather-strip">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="weather-day weather-day--skeleton" />
          ))}
        </div>
      )}

      {error && (
        <p className="weather-error">Could not load forecast</p>
      )}

      {days && (
        <div className="weather-strip">
          {days.map((day, i) => (
            <div key={i} className={`weather-day${i === 0 ? ' weather-day--today' : ''}`}>
              <div className="weather-label">{day.label}</div>
              <div className="weather-icon">{day.icon}</div>
              <div className="weather-high">{day.high}°</div>
              <div className="weather-low">{day.low}°</div>
              {day.precip > 0.01
                ? <div className="weather-precip">{day.precip.toFixed(2)}"</div>
                : <div className="weather-precip weather-precip--none">—</div>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Stat cell ─────────────────────────────────────────────────────────────
function StatCell({ label, children }) {
  return (
    <div className="detail-stat-cell">
      <span className="detail-stat-cell-label">{label}</span>
      <div className="detail-stat-cell-value">{children}</div>
    </div>
  )
}

// ── View mode ─────────────────────────────────────────────────────────────
function ViewMode({ location, columns, trailTypes, trailTypeColors = {}, trails, onRefreshTrails, onUpdateLocation }) {
  const enabled = new Set(columns.filter(c => c.enabled && c.builtin).map(c => c.key))
  const col = (key) => enabled.has(key)
  const get = (key) => location[key]

  const types    = get('trail_types') || []
  const seasons  = get('best_seasons') || []
  const rating   = get('personal_rating')
  const diff     = get('difficulty')
  const cond     = get('conditions')
  const dist     = get('distance_miles')
  const elev     = get('elevation_gain_ft')
  const drive    = get('drive_time_minutes')
  const url      = get('trailforks_url')
  const notes    = get('notes')
  const rid      = get('trailforks_rid')
  const address  = get('address')

  // Custom columns with values
  const customCols = columns.filter(c => c.enabled && !c.builtin && location.custom?.[c.key] != null && location.custom?.[c.key] !== '')

  // Only show stat row if something is in it
  const hasStats = (col('distance_miles') && dist) || (col('elevation_gain_ft') && elev) || (col('drive_time_minutes') && drive) || (col('trailforks_url') && url)

  const hostname = (u) => { try { return new URL(u).hostname.replace('www.', '') } catch { return 'Link' } }

  const missingCoords = location.lat == null || location.lng == null

  return (
    <div className="detail-view">

      {/* No-coordinates notice */}
      {missingCoords && (
        <div className="detail-no-coords">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8.5"/><circle cx="8" cy="11" r="0.5" fill="currentColor" strokeWidth="0"/>
          </svg>
          {address
            ? 'Not on the map yet — hit Drive Times to geocode this location.'
            : 'Add an address or coordinates to enable drive time and map placement.'}
        </div>
      )}

      {/* Trailforks region banner — key={rid} forces full remount on location change */}
      <TrailforksRegionInfo key={rid} rid={rid} />

      {/* Trailforks photos */}
      <TrailforksPhotos rid={rid} />

      {/* ── Tags + badges + rating inline ── */}
      {(types.length > 0 || (col('difficulty') && diff) || (col('conditions') && cond) || (col('personal_rating') && rating)) && (
        <div className="detail-meta-row">
          {types.map(t => (
            <span key={t}
              className={`tag${getTagStyle(trailTypeColors[t]) ? '' : ` ${typeClass(t)}`}`}
              style={getTagStyle(trailTypeColors[t]) ?? {}}
            >{t}</span>
          ))}
          {col('difficulty') && diff && (
            <span className={`badge ${DIFF_CLASS[diff] ?? ''}`}>{diff}</span>
          )}
          {col('conditions') && cond && (
            <span className={`badge ${COND_CLASS[cond] ?? ''}`}>{cond}</span>
          )}
          {col('personal_rating') && rating && (
            <span className="detail-stars">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={n <= rating ? 'star filled' : 'star empty'}>★</span>
              ))}
            </span>
          )}
        </div>
      )}

      {/* ── Stat row ── */}
      {hasStats && (
        <div className="detail-stat-row">
          {col('distance_miles') && dist && (
            <StatCell label="Distance">{dist} mi</StatCell>
          )}
          {col('elevation_gain_ft') && elev && (
            <StatCell label="Elevation">{Number(elev).toLocaleString()} ft</StatCell>
          )}
          {col('drive_time_minutes') && drive && (
            <StatCell label={location.drive_time_locked ? 'Drive (locked)' : 'Drive'}>
              {formatDriveTime(drive)}
            </StatCell>
          )}
          {col('trailforks_url') && url && (
            <StatCell label="Link">
              <a href={url} target="_blank" rel="noopener noreferrer" className="detail-link">
                {hostname(url)} ↗
              </a>
            </StatCell>
          )}
        </div>
      )}

      {/* ── Weather ── */}
      <WeatherWidget lat={location.lat} lng={location.lng} />

      {/* ── Seasons ── */}
      {col('best_seasons') && seasons.length > 0 && (
        <div className="detail-section">
          <span className="detail-section-label">Best Seasons</span>
          <div className="detail-meta-row">
            {seasons.map(s => <span key={s} className="tag tag-season">{s}</span>)}
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {col('notes') && notes && (
        <div className="detail-section">
          <span className="detail-section-label">Notes</span>
          <p className="detail-notes-text">{notes}</p>
        </div>
      )}

      {/* ── Custom columns ── */}
      {customCols.length > 0 && (
        <div className="detail-section">
          <span className="detail-section-label">Details</span>
          <div className="detail-custom-grid">
            {customCols.map(c => {
              const v = location.custom[c.key]
              return (
                <div key={c.key} className="detail-custom-item">
                  <span className="detail-stat-cell-label">{c.label}</span>
                  <span className="detail-custom-value">
                    {c.type === 'boolean' ? (v ? 'Yes' : 'No')
                     : c.type === 'url' ? <a href={v} target="_blank" rel="noopener noreferrer" className="detail-link">{hostname(v)} ↗</a>
                     : String(v)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Trails ── */}
      <div className="detail-section">
        <TrailList
          locationId={location.id}
          trails={trails}
          trailTypes={trailTypes}
          onRefresh={onRefreshTrails}
        />
      </div>

      {/* ── Routes + Ride logs ── */}
      <RouteList  location={location} onUpdate={onUpdateLocation} />
      <RideLogList location={location} onUpdate={onUpdateLocation} />

      {/* ── Trailforks widgets ── */}
      <TrailforksWidgets rid={rid} trailforksUrl={url} />
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────
export default function LocationPanel({ location, onClose, onSave, onDelete, trailTypes, trailTypeColors = {}, columns = [], locationOptions = {} }) {
  const isNew = !location
  const [mode, setMode] = useState(isNew ? 'edit' : 'view')
  const [form, setForm] = useState(() => toFormState(location, columns))
  const [currentLocation, setCurrentLocation] = useState(location)
  const [trails, setTrails] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setMode(location ? 'view' : 'edit')
    setForm(toFormState(location, columns))
    setCurrentLocation(location)
    setError(null)
    setConfirmDelete(false)
  }, [location])

  useEffect(() => {
    if (location?.id) getTrails(location.id).then(setTrails).catch(() => setTrails([]))
    else setTrails([])
  }, [location?.id])

  const refreshTrails = () => {
    if (location?.id) getTrails(location.id).then(setTrails).catch(() => {})
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    try {
      setSaving(true); setError(null)
      // If address looks like "lat, lng" coordinates, set lat/lng directly
      let saveForm = { ...form }
      const addr = (form.address || '').trim()
      const coordMatch = addr.match(/^(-?\d{1,3}\.?\d*)\s*[,\s]\s*(-?\d{1,3}\.?\d*)$/)
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]), lng = parseFloat(coordMatch[2])
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          saveForm = { ...saveForm, lat, lng }
        }
      }
      if (isNew) await createLocation(saveForm)
      else await updateLocation(location.id, saveForm)
      onSave()
    } catch (err) {
      setError(err.message); setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      setSaving(true)
      await deleteLocation(location.id)
      onDelete()
    } catch (err) {
      setError(err.message); setSaving(false)
    }
  }

  const cancelEdit = () => {
    if (isNew) { onClose() } else { setMode('view'); setError(null); setConfirmDelete(false) }
  }

  return (
    <aside className="location-panel">

      {/* ── Header ── */}
      <div className="panel-header">
        {mode === 'view' && currentLocation ? (
          <div className="panel-header-info">
            <h2 className="panel-header-name">{currentLocation.name}</h2>
            {(currentLocation.country || currentLocation.state || currentLocation.region) && (
              <p className="panel-header-place">
                {[currentLocation.country, currentLocation.state, currentLocation.region].filter(Boolean).join(' › ')}
              </p>
            )}
            {currentLocation.address && (
              <p className="panel-header-address">{currentLocation.address}</p>
            )}
          </div>
        ) : (
          <h2 className="panel-title">{isNew ? 'Add Location' : `Edit — ${location?.name}`}</h2>
        )}
        <button className="panel-close" onClick={onClose} aria-label="Close panel">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="panel-body">
        {mode === 'view' && currentLocation ? (
          <ViewMode
            location={currentLocation}
            columns={columns}
            trailTypes={trailTypes}
            trailTypeColors={trailTypeColors}
            trails={trails}
            onRefreshTrails={refreshTrails}
            onUpdateLocation={setCurrentLocation}
          />
        ) : (
          <>
            <LocationForm
              form={form} onChange={setForm}
              columns={columns} trailTypes={trailTypes}
              locationOptions={locationOptions}
            />
            {error && <div className="form-error" role="alert">{error}</div>}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="panel-footer">
        {mode === 'view' ? (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setMode('edit')}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2l2 2-7 7H3v-2l7-7z"/>
            </svg>
            Edit Location
          </button>
        ) : (
          <>
            {!isNew && (
              confirmDelete ? (
                <div className="delete-confirm">
                  <span>Delete this location?</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving}>Yes, delete</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)} disabled={saving}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving}>Delete</button>
              )
            )}
            <div className="panel-footer-right">
              <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Add Location' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>

    </aside>
  )
}
